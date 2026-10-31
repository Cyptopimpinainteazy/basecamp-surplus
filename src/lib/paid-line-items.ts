import type Stripe from "stripe";
import { z } from "zod";
import type { OrderItem } from "./db/schema";
const idSchema=z.string().uuid();
/** Build only from Stripe's charged price/line snapshots, never today's inventory price. */
export function paidLineItems(lines:Stripe.LineItem[], session:Stripe.Checkout.Session):OrderItem[] {
  if(!lines.length)throw new Error("Paid session has no line items");
  const legacy=session.metadata?.items ? z.array(z.object({id:z.string().uuid(),q:z.number().int().positive()})).parse(JSON.parse(session.metadata.items)) : [];
  const result=lines.map(line=>{
    const price=line.price;
    const product=price && typeof price.product==="object" && !price.product.deleted ? price.product : null;
    if(!product)throw new Error("Expanded payment product is missing");
    const id=idSchema.parse(product.metadata.product_id).toLowerCase();
    if(!line.quantity || !Number.isSafeInteger(line.quantity) || line.quantity<1 || price!.currency!=="usd" || price!.unit_amount===null || !Number.isSafeInteger(price!.unit_amount) || price!.unit_amount<1) throw new Error("Unsupported paid line item");
    const amounts=[line.amount_subtotal,line.amount_discount,line.amount_tax,line.amount_total];
    if(amounts.some(a=>!Number.isSafeInteger(a)||a<0)||line.amount_subtotal!==price!.unit_amount*line.quantity || line.amount_total!==line.amount_subtotal-line.amount_discount+line.amount_tax)throw new Error("Inconsistent payment amounts");
    return {productId:id,sku:product.metadata.sku||id,title:line.description||product.name,quantity:line.quantity,unitCents:price!.unit_amount,
      saleUnitLabel:product.metadata.sale_unit || session.metadata?.[`u_${id}`] || undefined,
      lineSubtotalCents:line.amount_subtotal,lineDiscountCents:line.amount_discount,lineTaxCents:line.amount_tax,lineTotalCents:line.amount_total,image:product.images?.[0]};
  });
  if(legacy.length){
    const actual=new Map<string,number>();for(const item of result)actual.set(item.productId,(actual.get(item.productId)??0)+item.quantity);
    const expected=new Map<string,number>();for(const item of legacy){const id=item.id.toLowerCase();expected.set(id,(expected.get(id)??0)+item.q);}
    if(actual.size!==expected.size||[...expected].some(([id,q])=>actual.get(id)!==q))throw new Error("Legacy cart and payment line items disagree");
  }
  const subtotal=result.reduce((s,i)=>s+i.lineSubtotalCents!,0);
  if(subtotal!==session.amount_subtotal)throw new Error("Payment subtotal does not match line items");
  return result;
}
