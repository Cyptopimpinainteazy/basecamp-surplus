import "server-only";
import { and, eq, inArray, ne } from "drizzle-orm";
import { site } from "./config";
import { db } from "./db";
import { customJobs, orders, products, purchaseOrders, suppliers, type Order, type PurchaseOrder, type PurchaseOrderItem } from "./db/schema";
import { sendEmail } from "./email/send";
import { ownerAlertEmail, partShippedEmail, purchaseOrderEmail } from "./email/templates";

// Turns a paid order into one purchase order per supplier, emails it, and
// tracks the supplier's confirmation and shipment from their private link.

export const poLink = (po: Pick<PurchaseOrder, "token">) => `${site.url}/supplier/po/${po.token}`;

const token = () => Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
const poNumber = (orderNumber: string, n: number) => `PO-${orderNumber}-${n}`;

/** Public tracking page for common carriers; falls back to a search. */
export function trackingUrlFor(carrier: string, number: string) {
  const c = carrier.toLowerCase();
  const n = encodeURIComponent(number.trim());
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${n}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  if (c.includes("dhl")) return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?tracking-id=${n}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} tracking ${number}`)}`;
}

/** What the order needs from each supplier. Items with no supplier come back in `unassigned`. */
export async function planPurchaseOrders(order: Order) {
  const productIds = [...new Set(order.items.map((i) => i.productId).filter(Boolean))];
  const jobIds = [...new Set(order.items.map((i) => i.customJobId).filter((x): x is string => Boolean(x)))];
  const [rows, jobs] = await Promise.all([
    productIds.length ? db.select().from(products).where(inArray(products.id, productIds)) : Promise.resolve([]),
    jobIds.length ? db.select().from(customJobs).where(inArray(customJobs.id, jobIds)) : Promise.resolve([]),
  ]);
  const bySupplier = new Map<string, PurchaseOrderItem[]>();
  const unassigned: string[] = [];
  const add = (supplierId: string, item: PurchaseOrderItem) => bySupplier.set(supplierId, [...(bySupplier.get(supplierId) ?? []), item]);

  for (const item of order.items) {
    if (item.customJobId) {
      const job = jobs.find((j) => j.id === item.customJobId);
      if (!job) {
        unassigned.push(`${item.title}: custom job not found`);
        continue;
      }
      // Pole builds are made in our own shop, so they never go to a supplier.
      if (job.kind === "poles") continue;
      if (!job.supplierId) {
        unassigned.push(`${job.number} (${item.title}): pick a supplier on the job, then create its PO`);
        continue;
      }
      add(job.supplierId, {
        title: item.title,
        sku: job.number,
        supplierSku: "",
        quantity: job.quantity,
        unitCostCents: job.costCents != null && job.quantity ? Math.round(job.costCents / job.quantity) : null,
        customJobId: job.id,
        spec: job.summary,
        artwork: [...job.artwork, ...job.proofs.map((p) => ({ ...p, name: `Approved proof: ${p.name}` }))],
      });
      continue;
    }
    const p = rows.find((r) => r.id === item.productId);
    if (!p || p.fulfillment === "stock") continue;
    if (!p.supplierId) {
      unassigned.push(`${p.sku} (${p.title}): marked ${p.fulfillment === "dropship" ? "dropship" : "made to order"} but has no supplier`);
      continue;
    }
    add(p.supplierId, {
      title: item.title,
      sku: p.sku,
      supplierSku: p.supplierSku,
      quantity: item.quantity,
      unitCostCents: p.costCents,
    });
  }
  return { bySupplier, unassigned, jobs };
}

/** Creates any missing POs for the order (safe to run repeatedly). */
export async function createPurchaseOrders(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("Order missing");
  const { bySupplier, unassigned } = await planPurchaseOrders(order);
  const existing = await db.select().from(purchaseOrders).where(eq(purchaseOrders.orderId, order.id));
  let n = existing.length;
  for (const [supplierId, items] of bySupplier) {
    if (existing.some((po) => po.supplierId === supplierId)) continue;
    const known = items.every((i) => i.unitCostCents != null);
    await db
      .insert(purchaseOrders)
      .values({
        number: poNumber(order.number, ++n),
        orderId: order.id,
        supplierId,
        items,
        shipTo: order.shippingAddress,
        costCents: known ? items.reduce((s, i) => s + (i.unitCostCents ?? 0) * i.quantity, 0) : null,
        token: token(),
      })
      .onConflictDoNothing();
  }
  return { order, unassigned };
}

/** Emails one PO to its supplier and marks it sent. */
export async function sendPurchaseOrder(poId: string) {
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId));
  if (!po) throw new Error("Purchase order missing");
  if (po.status === "cancelled") throw new Error("Purchase order is cancelled");
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, po.supplierId));
  if (!supplier) throw new Error("Supplier missing");
  const mail = purchaseOrderEmail(po, supplier, poLink(po));
  const result = await sendEmail({
    to: supplier.orderEmail,
    replyTo: site.ownerEmail || site.supportEmail,
    idempotencyKey: `po/${po.id}/${po.sentAt ? po.sentAt.getTime() : "first"}`,
    ...mail,
  });
  if ("skipped" in result) throw new Error("Email service is not configured");
  await db
    .update(purchaseOrders)
    .set({ status: po.status === "pending" ? "sent" : po.status, sentAt: new Date(), updatedAt: new Date() })
    .where(eq(purchaseOrders.id, po.id));
  // Supplier-made custom jobs are now in production.
  const jobIds = po.items.map((i) => i.customJobId).filter((x): x is string => Boolean(x));
  if (jobIds.length) {
    await db
      .update(customJobs)
      .set({ status: "in_production", updatedAt: new Date() })
      .where(and(inArray(customJobs.id, jobIds), eq(customJobs.status, "paid")));
  }
}

/** Order task: create POs and email every one not yet sent. Throws so the task retries on failure. */
export async function runSupplierPoTask(orderId: string) {
  const { order, unassigned } = await createPurchaseOrders(orderId);
  const pending = await db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.orderId, orderId), eq(purchaseOrders.status, "pending")));
  const errors: string[] = [];
  for (const po of pending) {
    try {
      await sendPurchaseOrder(po.id);
    } catch (e) {
      errors.push(`${po.number}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (unassigned.length && site.ownerEmail) {
    await sendEmail({
      to: site.ownerEmail,
      idempotencyKey: `po-unassigned/${order.id}`,
      ...ownerAlertEmail(`Order ${order.number} needs a supplier`, unassigned),
    });
  }
  if (errors.length) throw new Error(errors.join("; "));
}

export async function poByToken(t: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(t)) return null;
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.token, t));
  if (!po) return null;
  const [[supplier], [order]] = await Promise.all([
    db.select().from(suppliers).where(eq(suppliers.id, po.supplierId)),
    db.select().from(orders).where(eq(orders.id, po.orderId)),
  ]);
  return { po, supplier, order };
}

export async function supplierConfirm(t: string, note: string) {
  const found = await poByToken(t);
  if (!found) throw new Error("This link isn't valid.");
  const { po } = found;
  if (po.status === "cancelled") throw new Error("This purchase order was cancelled.");
  if (po.status === "shipped") return po;
  const [updated] = await db
    .update(purchaseOrders)
    .set({ status: "confirmed", confirmedAt: po.confirmedAt ?? new Date(), supplierNote: note.slice(0, 2000) || po.supplierNote, updatedAt: new Date() })
    .where(eq(purchaseOrders.id, po.id))
    .returning();
  return updated;
}

/**
 * Supplier adds tracking. The customer is emailed once per PO. When every PO
 * has shipped and nothing in the order ships from our own shelf, the order
 * itself is marked shipped.
 */
export async function supplierShip(t: string, carrier: string, trackingNumber: string, note: string) {
  const found = await poByToken(t);
  if (!found) throw new Error("This link isn't valid.");
  const { po, order } = found;
  if (po.status === "cancelled") throw new Error("This purchase order was cancelled.");
  const firstShipment = po.status !== "shipped";
  const [updated] = await db
    .update(purchaseOrders)
    .set({
      status: "shipped",
      carrier: carrier.slice(0, 60),
      trackingNumber: trackingNumber.slice(0, 80),
      trackingUrl: trackingUrlFor(carrier, trackingNumber),
      supplierNote: note.slice(0, 2000) || po.supplierNote,
      confirmedAt: po.confirmedAt ?? new Date(),
      shippedAt: po.shippedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(purchaseOrders.id, po.id))
    .returning();

  const jobIds = po.items.map((i) => i.customJobId).filter((x): x is string => Boolean(x));
  if (jobIds.length) await db.update(customJobs).set({ status: "shipped", updatedAt: new Date() }).where(inArray(customJobs.id, jobIds));

  const others = await db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.orderId, order.id), ne(purchaseOrders.id, po.id), ne(purchaseOrders.status, "cancelled")));
  const { bySupplier } = await planPurchaseOrders(order);
  const supplierItemCount = [...bySupplier.values()].reduce((s, items) => s + items.length, 0);
  const inHouse = order.items.length > supplierItemCount;
  const allShipped = !inHouse && others.every((o) => o.status === "shipped");

  if (allShipped && order.status !== "shipped" && order.status !== "delivered") {
    await db
      .update(orders)
      .set({
        status: "shipped",
        shippedAt: new Date(),
        carrier: order.carrier ?? updated.carrier,
        trackingNumber: order.trackingNumber ?? updated.trackingNumber,
        trackingUrl: order.trackingUrl ?? updated.trackingUrl,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
  }
  if (firstShipment && order.email) {
    await sendEmail({ to: order.email, idempotencyKey: `po-shipped/${po.id}`, ...partShippedEmail(order, updated, allShipped) });
  }
  if (firstShipment && site.ownerEmail) {
    await sendEmail({
      to: site.ownerEmail,
      idempotencyKey: `po-shipped-owner/${po.id}`,
      ...ownerAlertEmail(`${po.number} shipped by ${found.supplier.name}`, [
        `Order ${order.number}: ${carrier} ${trackingNumber}`,
        allShipped ? "Every part of this order has now shipped." : "Other parts of this order are still open.",
      ]),
    });
  }
  return updated;
}
