import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { orders, orderTasks } from "./db/schema";
import { allocatedProductIds, claimOrderTask } from "./order-transaction";
import { syncStock } from "./channels/sync";
import { sendEmail } from "./email/send";
import { orderConfirmationEmail, ownerAlertEmail } from "./email/templates";
import { site } from "./config";

/** Durable follow-ups. Failures leave the job pending; payment/stock never repeat. */
export async function runOrderTasks(orderId?:string) {
  const pending=await db.select().from(orderTasks).where(and(isNull(orderTasks.completedAt),orderId?eq(orderTasks.orderId,orderId):undefined)).orderBy(asc(orderTasks.attempts),asc(orderTasks.createdAt)).limit(30);
  const started=Date.now();
  for(const candidate of pending){
    if(Date.now()-started>20_000)break;
    const task=await claimOrderTask(db,candidate.id);
    if(!task)continue;
    try{
      const [order]=await db.select().from(orders).where(eq(orders.id,task.orderId));
      if(!order)throw new Error("Order missing");
      if(task.kind==="stock_sync"){
        const result=await syncStock(allocatedProductIds(order.items));
        if(result.errors.length)throw new Error(result.errors.join("; "));
      }else{
        const to=task.kind==="confirmation"?order.email:site.ownerEmail;
        if(!to)throw new Error("Email recipient is not configured");
        const mail=task.kind==="confirmation"?orderConfirmationEmail(order):ownerAlertEmail(`New order ${order.number}`, [
          ...order.items.map(i=>`${i.quantity} × ${i.title} (${i.sku})`),
          order.attentionReason?`NEEDS ATTENTION: ${order.attentionReason}`:"Ready to ship.",
        ]);
        const result=await sendEmail({to,...mail,idempotencyKey:`order/${order.id}/${task.kind}`});
        if("skipped" in result)throw new Error("Email service is not configured");
      }
      await db.update(orderTasks).set({completedAt:new Date(),leaseToken:null,lockedUntil:null,lastError:null}).where(and(eq(orderTasks.id,task.id),eq(orderTasks.leaseToken,task.leaseToken!)));
    }catch(error){
      const message=error instanceof Error?error.message:String(error);
      await db.update(orderTasks).set({leaseToken:null,lockedUntil:null,lastError:message.slice(0,2000)}).where(and(eq(orderTasks.id,task.id),eq(orderTasks.leaseToken,task.leaseToken!)));
      console.error("[order task]",task.id,message);
    }
  }
}
