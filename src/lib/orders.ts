import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "./db";
import { orders, products, type Address, type Order, type OrderItem } from "./db/schema";
import { orderNumber } from "./format";
import { decrementStock } from "./products";
import { syncStock } from "./channels/sync";
import { fetchEbayOrdersSince, markEbayShipped, type EbayOrder } from "./channels/ebay";
import { getSetting, setSetting } from "./settings";
import { sendEmail } from "./email/send";
import { orderConfirmationEmail, ownerAlertEmail, shippedEmail } from "./email/templates";
import { site } from "./config";

async function alertOwner(subject: string, lines: string[]) {
  if (!site.ownerEmail) return;
  const mail = ownerAlertEmail(subject, lines);
  await sendEmail({ to: site.ownerEmail, ...mail }).catch((e) => console.error("[owner alert]", e));
}

async function applyStock(items: OrderItem[]) {
  const short: string[] = [];
  for (const item of items) {
    const ok = await decrementStock(item.productId, item.quantity);
    if (!ok) short.push(`${item.title} (${item.sku}) × ${item.quantity}`);
  }
  await syncStock(items.map((i) => i.productId));
  return short;
}

/** Idempotent: Stripe retries webhooks, so we key on the session id. */
export async function createOrderFromCheckout(session: Stripe.Checkout.Session) {
  const [existing] = await db.select().from(orders).where(eq(orders.stripeSessionId, session.id));
  if (existing) return existing;

  const raw = session.metadata?.items;
  if (!raw) throw new Error(`Checkout session ${session.id} has no item metadata`);
  const cart = JSON.parse(raw) as { id: string; q: number }[];
  const rows = await db.select().from(products).where(inArray(products.id, cart.map((c) => c.id)));
  const items: OrderItem[] = cart.map((c) => {
    const p = rows.find((r) => r.id === c.id);
    if (!p) throw new Error(`Product ${c.id} in session ${session.id} no longer exists`);
    return { productId: p.id, sku: p.sku, title: p.title, quantity: c.q, unitCents: p.priceCents, image: p.images[0]?.url };
  });

  const ship = session.collected_information?.shipping_details;
  const address: Address | null = ship?.address
    ? {
        name: ship.name ?? session.customer_details?.name ?? "",
        line1: ship.address.line1 ?? "",
        line2: ship.address.line2 ?? undefined,
        city: ship.address.city ?? "",
        state: ship.address.state ?? "",
        postalCode: ship.address.postal_code ?? "",
        country: ship.address.country ?? "US",
        phone: session.customer_details?.phone ?? undefined,
      }
    : null;

  const short = await applyStock(items);
  const [order] = await db
    .insert(orders)
    .values({
      number: orderNumber(),
      source: "site",
      status: short.length ? "needs_attention" : "paid",
      attentionReason: short.length ? `Oversold (sold elsewhere first): ${short.join("; ")}` : null,
      email: session.customer_details?.email ?? "",
      customerName: session.customer_details?.name ?? address?.name ?? "",
      items,
      subtotalCents: session.amount_subtotal ?? 0,
      shippingCents: session.total_details?.amount_shipping ?? 0,
      taxCents: session.total_details?.amount_tax ?? 0,
      totalCents: session.amount_total ?? 0,
      shippingMethod: session.metadata?.shipping_method ?? "standard",
      shippingAddress: address,
      packagePreset: session.metadata?.package ?? null,
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
    })
    .onConflictDoNothing({ target: orders.stripeSessionId })
    .returning();

  if (!order) {
    const [again] = await db.select().from(orders).where(eq(orders.stripeSessionId, session.id));
    return again;
  }
  if (order.email) {
    await sendEmail({ to: order.email, ...orderConfirmationEmail(order) }).catch((e) => console.error("[confirm email]", e));
  }
  await alertOwner(`New order ${order.number}: ${(order.totalCents / 100).toFixed(2)}`, [
    ...items.map((i) => `${i.quantity} × ${i.title} (${i.sku})`),
    short.length ? `NEEDS ATTENTION: ${order.attentionReason}` : "Ready to ship.",
  ]);
  return order;
}

/** Pull new eBay orders, decrement our stock, and add them to the shipping queue. */
export async function importEbayOrders() {
  const last = await getSetting<string>("ebay_orders_synced_at");
  const since = last ? new Date(new Date(last).getTime() - 10 * 60_000) : new Date(Date.now() - 3 * 864e5);
  const startedAt = new Date();
  const ebayOrders = await fetchEbayOrdersSince(since);
  let imported = 0;

  for (const eo of ebayOrders) {
    if (eo.orderFulfillmentStatus === "FULFILLED") continue;
    const [exists] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.source, "ebay"), eq(orders.externalId, eo.orderId)));
    if (exists) continue;

    const skus = eo.lineItems.map((l) => l.sku).filter(Boolean) as string[];
    const rows = skus.length ? await db.select().from(products).where(inArray(products.sku, skus)) : [];
    const items: OrderItem[] = eo.lineItems.map((l) => {
      const p = rows.find((r) => r.sku === l.sku);
      return {
        productId: p?.id ?? "",
        sku: l.sku ?? "",
        title: l.title,
        quantity: l.quantity,
        unitCents: Math.round(Number(l.lineItemCost?.value ?? 0) * 100 / Math.max(1, l.quantity)),
        image: p?.images[0]?.url,
      };
    });
    const known = items.filter((i) => i.productId);
    const short = await applyStock(known);
    const unknown = items.filter((i) => !i.productId).map((i) => `${i.title} (no matching SKU)`);
    const shipTo = eo.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;
    const addr = shipTo?.contactAddress;
    const problems = [...short.map((s) => `Oversold: ${s}`), ...unknown];

    await db
      .insert(orders)
      .values({
        number: orderNumber(),
        source: "ebay",
        externalId: eo.orderId,
        status: problems.length ? "needs_attention" : "paid",
        attentionReason: problems.length ? problems.join("; ") : null,
        email: shipTo?.email ?? eo.buyer?.buyerRegistrationAddress?.email ?? "",
        customerName: shipTo?.fullName ?? "",
        items,
        subtotalCents: Math.round(Number(eo.pricingSummary?.priceSubtotal?.value ?? 0) * 100),
        shippingCents: Math.round(Number(eo.pricingSummary?.deliveryCost?.value ?? 0) * 100),
        totalCents: Math.round(Number(eo.pricingSummary?.total?.value ?? 0) * 100),
        shippingAddress: addr
          ? {
              name: shipTo?.fullName ?? "",
              line1: addr.addressLine1 ?? "",
              line2: addr.addressLine2,
              city: addr.city ?? "",
              state: addr.stateOrProvince ?? "",
              postalCode: addr.postalCode ?? "",
              country: addr.countryCode ?? "US",
              phone: shipTo?.primaryPhone?.phoneNumber,
            }
          : null,
        createdAt: new Date(eo.creationDate),
      })
      .onConflictDoNothing();
    imported++;
    await alertOwner(`New eBay order ${eo.orderId}`, [
      ...items.map((i) => `${i.quantity} × ${i.title}`),
      problems.length ? `NEEDS ATTENTION: ${problems.join("; ")}` : "Ready to ship.",
    ]);
  }
  await setSetting("ebay_orders_synced_at", startedAt.toISOString());
  return { checked: ebayOrders.length, imported };
}

export async function markOrderShipped(order: Order, label: {
  carrier: string;
  service: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl: string;
  labelCostCents: number;
  transactionId: string;
  packagePreset: string;
}) {
  const [updated] = await db
    .update(orders)
    .set({
      status: "label_created",
      carrier: label.carrier,
      service: label.service,
      trackingNumber: label.trackingNumber,
      trackingUrl: label.trackingUrl,
      labelUrl: label.labelUrl,
      labelCostCents: label.labelCostCents,
      shippoTransactionId: label.transactionId,
      packagePreset: label.packagePreset,
      shippedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id))
    .returning();

  if (updated.source === "ebay" && updated.externalId) {
    await markEbayShipped(updated.externalId, label.carrier, label.trackingNumber).catch((e) =>
      console.error("[ebay ship]", e),
    );
  } else if (updated.email) {
    await sendEmail({ to: updated.email, ...shippedEmail(updated) }).catch((e) => console.error("[ship email]", e));
  }
  return updated;
}

export async function listOrders(status?: string) {
  const where = status ? eq(orders.status, status as Order["status"]) : undefined;
  return db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(200);
}

export async function getOrder(id: string) {
  const [o] = await db.select().from(orders).where(eq(orders.id, id));
  return o ?? null;
}

/** Customer-facing lookup: requires both the order number and the email on the order. */
export async function lookupOrderForCustomer(number: string, email: string) {
  const [o] = await db
    .select()
    .from(orders)
    .where(and(eq(sql`upper(${orders.number})`, number.trim().toUpperCase()), eq(sql`lower(${orders.email})`, email.trim().toLowerCase())));
  return o ?? null;
}

export type { EbayOrder };

/**
 * Pull eBay orders if the last sync is older than 10 minutes. Called when the admin
 * opens Today or Orders, so the queue is fresh even on plans limited to a daily cron.
 */
export async function syncEbayIfStale() {
  const { ebayConfigured, ebayConnected } = await import("./channels/ebay");
  if (!ebayConfigured() || !(await ebayConnected())) return;
  const last = await getSetting<string>("ebay_orders_synced_at");
  if (last && Date.now() - new Date(last).getTime() < 10 * 60_000) return;
  await importEbayOrders().catch((e) => console.error("[ebay sync]", e));
}
