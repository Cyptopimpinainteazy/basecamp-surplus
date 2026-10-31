import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq, sql } from "drizzle-orm";
import * as schema from "./db/schema";
import { recordPaidOrder, claimOrderTask } from "./order-transaction";
const url=process.env.ORDER_TEST_DATABASE_URL;
if(!url || !new URL(url).hostname.match(/^(127\.0\.0\.1|localhost)$/))throw new Error("Use npm run test:orders with an isolated local database");
const client=postgres(url,{max:20,prepare:false});
const database=drizzle(client,{schema});
process.env.DATABASE_URL=url;
delete process.env.RESEND_API_KEY;
before(async()=>{await migrate(database,{migrationsFolder:"drizzle"});});
after(async()=>{await client.end();const globals=globalThis as typeof globalThis & {pg?:ReturnType<typeof postgres>};await globals.pg?.end();});
beforeEach(async()=>{await database.execute(sql`truncate order_tasks,orders,products cascade`);});
async function product(quantity=5){const id=crypto.randomUUID();const [p]=await database.insert(schema.products).values({id,sku:id,slug:id,title:"Original tent",brand:"North Face",brandSlug:"north-face",category:"tents",status:"active",quantity,priceCents:99999}).returning();return p;}
function paid(p:typeof schema.products.$inferSelect, session=crypto.randomUUID(),quantity=1){return {number:crypto.randomUUID(),stripeSessionId:session,email:"buyer@example.test",items:[{productId:p.id,sku:p.sku,title:"Purchased title",quantity,unitCents:7500}],subtotalCents:7500*quantity,totalCents:7500*quantity};}

test("24 simultaneous deliveries claim one order, deduct once, enqueue once",async()=>{
 const p=await product(30);const values=paid(p);
 const results=await Promise.all(Array.from({length:24},()=>recordPaidOrder(database,values)));
 assert.equal(results.filter(r=>r.created).length,1);
 assert.equal(new Set(results.map(r=>r.order.id)).size,1);
 assert.equal((await database.select().from(schema.products))[0].quantity,29);
 assert.equal((await database.select().from(schema.orders)).length,1);
 assert.equal((await database.select().from(schema.orderTasks)).length,3);
 assert.equal(results[0].order.items[0].unitCents,7500);
 assert.equal(results[0].order.items[0].title,"Purchased title");
});
test("two different paid orders race for last unit without going negative",async()=>{
 const p=await product(1);
 const results=await Promise.all([recordPaidOrder(database,paid(p)),recordPaidOrder(database,paid(p))]);
 assert.deepEqual(results.map(r=>r.order.status).sort(),["needs_attention","paid"]);
 const [stock]=await database.select().from(schema.products);assert.equal(stock.quantity,0);assert.equal(stock.status,"sold_out");
});
test("shortage holds entire cart without partial stock deductions",async()=>{
 const p=await product(2),q=await product(0);const values=paid(p);
 values.items.push({...values.items[0],productId:q.id,sku:q.sku});
 const result=await recordPaidOrder(database,values);assert.equal(result.order.status,"needs_attention");
 assert.equal((await database.select().from(schema.products).where(eq(schema.products.id,p.id)))[0].quantity,2);
});
test("failure after stock update rolls back order, inventory and tasks; retry succeeds",async()=>{
 const p=await product(2),values=paid(p);
 await database.execute(sql`create function reject_test_task() returns trigger language plpgsql as $$ begin raise exception 'injected task failure'; end; $$`);
 await database.execute(sql`create trigger reject_test_task before insert on order_tasks for each row execute function reject_test_task()`);
 try{await assert.rejects(recordPaidOrder(database,values));}finally{await database.execute(sql`drop trigger reject_test_task on order_tasks`);await database.execute(sql`drop function reject_test_task()`);}
 assert.equal((await database.select().from(schema.orders)).length,0);
 assert.equal((await database.select().from(schema.orderTasks)).length,0);
 assert.equal((await database.select().from(schema.products))[0].quantity,2);
 await recordPaidOrder(database,values);assert.equal((await database.select().from(schema.products))[0].quantity,1);
});
test("duplicate product lines aggregate before allocation",async()=>{
 const p=await product(1),values=paid(p);values.items.push({...values.items[0]});
 assert.equal((await recordPaidOrder(database,values)).order.status,"needs_attention");
 assert.equal((await database.select().from(schema.products))[0].quantity,1);
});
test("eBay duplicate deliveries share the same atomic claim",async()=>{
 const p=await product(10);const {stripeSessionId,...values}=paid(p);void stripeSessionId;
 const results=await Promise.all(Array.from({length:12},()=>recordPaidOrder(database,{...values,source:"ebay",externalId:"ebay-1"})));
 assert.equal(results.filter(r=>r.created).length,1);assert.equal((await database.select().from(schema.products))[0].quantity,9);
 assert.equal((await database.select().from(schema.orderTasks)).length,2);
});
test("only one worker claims a task; expired lease can be recovered",async()=>{
 const p=await product();await recordPaidOrder(database,paid(p));const [task]=await database.select().from(schema.orderTasks);
 const claims=await Promise.all(Array.from({length:12},()=>claimOrderTask(database,task.id)));
 assert.equal(claims.filter(Boolean).length,1);
 await database.update(schema.orderTasks).set({lockedUntil:new Date(Date.now()-1)}).where(eq(schema.orderTasks.id,task.id));
 const retry=await claimOrderTask(database,task.id);assert.ok(retry);assert.equal(retry.attempts,2);assert.notEqual(retry.leaseToken,claims.find(Boolean)?.leaseToken);
 await database.update(schema.orderTasks).set({completedAt:new Date()}).where(eq(schema.orderTasks.id,task.id));
 assert.equal(await claimOrderTask(database,task.id),null);
});
test("changed or missing purchased pole unit is held without allocation",async()=>{
 const p=await product();await database.update(schema.products).set({category:"poles",poleSpec:{saleUnit:"set",assembliesIncluded:3}}).where(eq(schema.products.id,p.id));
 const values=paid(p);const result=await recordPaidOrder(database,values);
 assert.equal(result.order.status,"needs_attention");assert.match(result.order.attentionReason!,/unit/);assert.equal((await database.select().from(schema.products))[0].quantity,5);
});

test("valid complete-set snapshot allocates sets rather than individual assemblies",async()=>{
 const p=await product(4);await database.update(schema.products).set({category:"poles",poleSpec:{saleUnit:"set",assembliesIncluded:3}}).where(eq(schema.products.id,p.id));
 const values=paid(p,crypto.randomUUID(),2);const items=values.items.map(i=>({...i,saleUnitLabel:"Complete tent pole set · 3 assemblies"}));
 assert.equal((await recordPaidOrder(database,{...values,items})).order.status,"paid");assert.equal((await database.select().from(schema.products))[0].quantity,2);
});
test("missing email configuration leaves durable retryable jobs without reallocating stock",async()=>{
 const {runOrderTasks}=await import("./order-tasks");
 const p=await product(4),values=paid(p);const {order}=await recordPaidOrder(database,values);
 await runOrderTasks(order.id);
 const tasks=await database.select().from(schema.orderTasks);
 assert.ok(tasks.find(t=>t.kind==="stock_sync")?.completedAt);
 const confirmation=tasks.find(t=>t.kind==="confirmation")!;assert.equal(confirmation.completedAt,null);assert.match(confirmation.lastError!,/configured/);
 await recordPaidOrder(database,values);await runOrderTasks(order.id);
 const [stock]=await database.select().from(schema.products);assert.equal(stock.quantity,3);
 const [retry]=await database.select().from(schema.orderTasks).where(eq(schema.orderTasks.id,confirmation.id));assert.equal(retry.attempts,2);assert.equal(retry.completedAt,null);
});
