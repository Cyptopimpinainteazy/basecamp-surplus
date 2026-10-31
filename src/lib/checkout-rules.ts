import { z } from "zod";
import { poleSaleLabel } from "./pole-sale";
import type { Product } from "./db/schema";
export const checkoutBody=z.object({
  items:z.array(z.object({id:z.string().uuid(),qty:z.number().int().min(1).max(20)})).min(1).max(30),
  shipping:z.enum(["standard","expedited"]).default("standard"),
}).superRefine((cart,ctx)=>{
  const seen=new Set<string>();
  cart.items.forEach((line,i)=>{const key=line.id.toLowerCase();if(seen.has(key))ctx.addIssue({code:"custom",path:["items",i,"id"],message:"Duplicate product in cart."});seen.add(key);});
});
export function orderableProblem(p:Pick<Product,"category"|"poleSpec"|"priceCents">): string|null {
  if(!Number.isSafeInteger(p.priceCents)||p.priceCents<=0)return "This item's price needs review before checkout.";
  if(p.category==="poles"&&!poleSaleLabel(p.poleSpec))return "This pole listing needs its sale unit confirmed before checkout.";
  return null;
}
