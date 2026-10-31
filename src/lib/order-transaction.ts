import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { StoreDatabase } from "./db";
import { orders, orderTasks, products, type OrderItem } from "./db/schema";
import { poleSaleLabel } from "./pole-sale";

type NewOrder = typeof orders.$inferInsert;
/** Claim, allocate and enqueue atomically. Duplicate deliveries only read the committed order. */
export async function recordPaidOrder(database: StoreDatabase, values: NewOrder) {
  if (!values.stripeSessionId && !(values.source === "ebay" && values.externalId)) throw new Error("Missing external order identity");
  if (!values.items.length) throw new Error("Paid order has no items");
  return database.transaction(async tx => {
    const identity = values.stripeSessionId
      ? eq(orders.stripeSessionId, values.stripeSessionId)
      : and(eq(orders.source, "ebay"), eq(orders.externalId, values.externalId!))!;
    const target = values.stripeSessionId ? orders.stripeSessionId : [orders.source, orders.externalId];
    const [claimed] = await tx.insert(orders).values({...values, status:"paid", attentionReason:null}).onConflictDoNothing({target}).returning();
    if (!claimed) {
      const [existing] = await tx.select().from(orders).where(identity);
      if (!existing) throw new Error("Order claim could not be resolved");
      return {order:existing, created:false};
    }
    const quantities = new Map<string, number>();
    const problems:string[] = [];
    for (const item of values.items) {
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error("Invalid paid quantity");
      if (!item.productId) { problems.push(`${item.sku || item.title}: no matching inventory SKU`); continue; }
      const qty=(quantities.get(item.productId)??0)+item.quantity;
      if(!Number.isSafeInteger(qty))throw new Error("Paid quantity overflow");
      quantities.set(item.productId,qty);
    }
    const ids=[...quantities.keys()].sort();
    const stock=ids.length ? await tx.select().from(products).where(inArray(products.id,ids)).orderBy(asc(products.id)).for("update") : [];
    for (const [id, qty] of quantities) {
      const p=stock.find(p=>p.id===id);
      if (!p || p.status!=="active" || p.quantity<qty) {problems.push(`${values.items.find(i=>i.productId===id)?.sku || id}: insufficient sellable stock`);continue;}
      if(p.category==="poles" && values.items.filter(i=>i.productId===id).some(i=>!i.saleUnitLabel || i.saleUnitLabel!==poleSaleLabel(p.poleSpec))) problems.push(`${p.sku}: purchased pole unit needs manual verification`);
    }
    // Allocate the whole order or none of it. Shortages are held for manual resolution.
    if (!problems.length) for (const [id, qty] of quantities) await tx.update(products).set({
      quantity:sql`${products.quantity} - ${qty}`,
      status:sql`case when ${products.quantity} - ${qty} = 0 then 'sold_out'::product_status else ${products.status} end`,
      updatedAt:new Date(),
    }).where(eq(products.id,id));
    const [order]=await tx.update(orders).set({status:problems.length?"needs_attention":"paid",attentionReason:problems.length?`No stock allocated. Reconcile the full order before marking ready to ship: ${problems.join("; ")}`:null}).where(eq(orders.id,claimed.id)).returning();
    const kinds=["stock_sync","owner_alert",...(values.source!=="ebay"?["confirmation"]:[])];
    await tx.insert(orderTasks).values(kinds.map(kind=>({orderId:order.id,kind})));
    return {order,created:true};
  });
}

/** At most one current worker owns a job lease; expired work can be retried. */
export async function claimOrderTask(database: StoreDatabase, id:string) {
  const now=new Date();
  const token=crypto.randomUUID();
  const [task]=await database.update(orderTasks).set({leaseToken:token,lockedUntil:new Date(now.getTime()+120_000),attempts:sql`${orderTasks.attempts}+1`}).where(and(eq(orderTasks.id,id),sql`${orderTasks.completedAt} is null`,sql`(${orderTasks.lockedUntil} is null or ${orderTasks.lockedUntil} < ${now.toISOString()}::timestamptz)`)).returning();
  return task??null;
}
export function allocatedProductIds(items:OrderItem[]){return [...new Set(items.map(i=>i.productId).filter(Boolean))];}
