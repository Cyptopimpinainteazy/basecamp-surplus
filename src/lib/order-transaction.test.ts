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
beforeEach(async()=>{await database.execute(sql`truncate order_tasks,purchase_orders,custom_jobs,orders,products,suppliers,rate_events cascade`);});
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

// ---------- custom jobs and supplier purchase orders ----------

async function job(status:"checkout"|"quoted"|"requested"="checkout",kind:"poles"|"canopy"="poles",supplierId:string|null=null){
 const [j]=await database.insert(schema.customJobs).values({number:`CJ-${crypto.randomUUID().slice(0,8)}`,kind,status,email:"pending@checkout",config:{},summary:["2 × Custom pole"],quantity:2,priceCents:5000,token:crypto.randomUUID().replace(/-/g,""),supplierId,costCents:kind==="canopy"?30000:null}).returning();
 return j;
}
function paidJob(j:typeof schema.customJobs.$inferSelect,session=crypto.randomUUID()){
 return {number:crypto.randomUUID(),stripeSessionId:session,email:"buyer@example.test",customerName:"Pat Buyer",items:[{productId:"",customJobId:j.id,sku:j.number,title:"Custom pole",quantity:2,unitCents:2500}],subtotalCents:5000,totalCents:5000};
}
async function supplier(){
 const [s]=await database.insert(schema.suppliers).values({name:"Test Printer",orderEmail:"po@printer.test"}).returning();return s;
}

test("custom job is paid exactly once across duplicate deliveries, without touching stock",async()=>{
 const j=await job("checkout");const p=await product(3);const values=paidJob(j);
 const results=await Promise.all(Array.from({length:10},()=>recordPaidOrder(database,values)));
 assert.equal(results.filter(r=>r.created).length,1);
 const order=results[0].order;assert.equal(order.status,"paid");
 const [after]=await database.select().from(schema.customJobs).where(eq(schema.customJobs.id,j.id));
 assert.equal(after.status,"paid");assert.equal(after.orderId,order.id);assert.equal(after.email,"buyer@example.test");assert.equal(after.name,"Pat Buyer");
 assert.equal((await database.select().from(schema.products).where(eq(schema.products.id,p.id)))[0].quantity,3);
 const kinds=(await database.select().from(schema.orderTasks)).map(t=>t.kind).sort();
 assert.deepEqual(kinds,["confirmation","owner_alert","stock_sync","supplier_po"]);
});
test("a custom job that isn't awaiting payment holds the order for review",async()=>{
 const j=await job("requested");const result=await recordPaidOrder(database,paidJob(j));
 assert.equal(result.order.status,"needs_attention");assert.match(result.order.attentionReason!,/not awaiting payment/);
 assert.ok(!(await database.select().from(schema.orderTasks)).some(t=>t.kind==="supplier_po"));
});
test("dropship sale allocates stock, queues one PO per supplier and retries email safely",async()=>{
 const {runOrderTasks}=await import("./order-tasks");
 const s=await supplier();const p=await product(5);
 await database.update(schema.products).set({fulfillment:"dropship",supplierId:s.id,supplierSku:"SUP-9",costCents:4000}).where(eq(schema.products.id,p.id));
 const values=paid(p,crypto.randomUUID(),2);
 const {order}=await recordPaidOrder(database,{...values,shippingAddress:{name:"Pat",line1:"1 Main",city:"Denver",state:"CO",postalCode:"80202",country:"US"}});
 assert.equal((await database.select().from(schema.products))[0].quantity,3);
 await runOrderTasks(order.id);await runOrderTasks(order.id);
 const pos=await database.select().from(schema.purchaseOrders);
 assert.equal(pos.length,1);assert.equal(pos[0].status,"pending");assert.equal(pos[0].costCents,8000);
 assert.equal(pos[0].items[0].supplierSku,"SUP-9");assert.equal(pos[0].shipTo?.city,"Denver");
 const task=(await database.select().from(schema.orderTasks)).find(t=>t.kind==="supplier_po")!;
 assert.equal(task.completedAt,null);assert.match(task.lastError!,/not configured/);
});
test("supplier tracking ships the order once every supplier part has shipped",async()=>{
 const {createPurchaseOrders,supplierShip,supplierConfirm}=await import("./purchase-orders");
 const s=await supplier();const j=await job("quoted","canopy",s.id);
 const {order}=await recordPaidOrder(database,paidJob(j));
 await createPurchaseOrders(order.id);await createPurchaseOrders(order.id);
 const [po]=await database.select().from(schema.purchaseOrders);assert.ok(po);
 assert.equal((await database.select().from(schema.purchaseOrders)).length,1);
 assert.equal(po.costCents,30000);assert.deepEqual(po.items[0].spec,["2 × Custom pole"]);
 await supplierConfirm(po.token,"Ships Friday");
 await assert.rejects(supplierShip("not-a-real-token-xxxxxxxx","UPS","1Z999","")) ;
 const shipped=await supplierShip(po.token,"UPS","1Z999AA10123456784","");
 assert.equal(shipped.status,"shipped");assert.match(shipped.trackingUrl!,/ups\.com/);
 const [o]=await database.select().from(schema.orders).where(eq(schema.orders.id,order.id));
 assert.equal(o.status,"shipped");assert.equal(o.trackingNumber,"1Z999AA10123456784");
 const [jj]=await database.select().from(schema.customJobs).where(eq(schema.customJobs.id,j.id));assert.equal(jj.status,"shipped");
});
test("in-house pole builds never create a supplier PO",async()=>{
 const {createPurchaseOrders}=await import("./purchase-orders");
 const j=await job("checkout","poles");const {order}=await recordPaidOrder(database,paidJob(j));
 const {unassigned}=await createPurchaseOrders(order.id);
 assert.equal(unassigned.length,0);assert.equal((await database.select().from(schema.purchaseOrders)).length,0);
});
