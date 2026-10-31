import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "./db";
import { orders, products, type Address, type Order, type OrderItem } from "./db/schema";
import { orderNumber } from "./format";
import { recordPaidOrder } from "./order-transaction";
import { paidLineItems } from "./paid-line-items";
import { stripe } from "./stripe";
import { runOrderTasks } from "./order-tasks";
import { poleSaleLabel } from "./pole-sale";
import { fetchEbayOrdersSince, markEbayShipped, type EbayOrder } from "./channels/ebay";
import { getSetting, setSetting } from "./settings";
import { sendEmail } from "./email/send";
import { shippedEmail } from "./email/templates";

/** Idempotent: Stripe retries webhooks, so we key on the session id. */
export async function createOrderFromCheckout(session: Stripe.Checkout.Session) {
  const [existing] = await db.select().from(orders).where(eq(orders.stripeSessionId, session.id));
  if (existing) { await runOrderTasks(existing.id); return existing; }
  if (session.payment_status !== "paid" || session.currency !== "usd") throw new Error("Session is not a paid USD checkout");
  const lines: Stripe.LineItem[] = [];
  for await (const line of stripe().checkout.sessions.listLineItems(session.id, {limit:100,expand:["data.price.product"]})) lines.push(line);
  const items = paidLineItems(lines, session);

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

  const {order} = await recordPaidOrder(db, {
      number: orderNumber(),
      source: "site",
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
    });
  await runOrderTasks(order.id);
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
        saleUnitLabel: p?.category === "poles" ? poleSaleLabel(p.poleSpec) ?? undefined : undefined,
      };
    });
    const shipTo = eo.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;
    const addr = shipTo?.contactAddress;
    const result = await recordPaidOrder(db, {
        number: orderNumber(),
        source: "ebay",
        externalId: eo.orderId,
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
      });
    if (result.created) imported++;
    await runOrderTasks(result.order.id);

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
