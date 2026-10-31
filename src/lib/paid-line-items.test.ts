import { test } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import { paidLineItems } from "./paid-line-items";
const id="11223344-1234-4234-8234-112233445566";
function fixtures(){
 // Deserialized Stripe-shaped fixtures: no Stripe network calls in this suite.
 const line:Stripe.LineItem=JSON.parse(JSON.stringify({id:"li_test",object:"item",quantity:2,description:"Purchased tent set",amount_subtotal:15000,amount_discount:1500,amount_tax:1080,amount_total:14580,price:{currency:"usd",unit_amount:7500,product:{id:"prod_test",name:"Original tent",images:[],metadata:{product_id:id,sku:"SET-1",sale_unit:"Complete tent pole set · 3 assemblies"}}}}));
 const session:Stripe.Checkout.Session=JSON.parse(JSON.stringify({amount_subtotal:15000,metadata:{schema_version:"2"}}));
 return {line,session};
}
test("snapshots charged unit price, sale unit, discount and tax without catalog reads",()=>{
 const {line,session}=fixtures();const [item]=paidLineItems([line],session);
 assert.equal(item.unitCents,7500);assert.equal(item.title,"Purchased tent set");assert.equal(item.lineTotalCents,14580);assert.equal(item.lineDiscountCents,1500);assert.equal(item.lineTaxCents,1080);assert.equal(item.saleUnitLabel,"Complete tent pole set · 3 assemblies");
});
test("legacy sessions retain unit metadata and require cart/paid quantities to match",()=>{
 const {line,session}=fixtures();const product=line.price!.product as Stripe.Product;delete product.metadata.sale_unit;
 session.metadata={items:JSON.stringify([{id,q:2}]),[`u_${id}`]:"1 complete pole assembly"};
 assert.equal(paidLineItems([line],session)[0].saleUnitLabel,"1 complete pole assembly");
 session.metadata.items=JSON.stringify([{id,q:1}]);assert.throws(()=>paidLineItems([line],session),/disagree/);
});
test("rejects missing product mapping and inconsistent amounts",()=>{
 const {line,session}=fixtures();line.amount_total++;assert.throws(()=>paidLineItems([line],session),/amounts/);
 line.amount_total--;delete (line.price!.product as Stripe.Product).metadata.product_id;assert.throws(()=>paidLineItems([line],session));
});
test("30-line paid cart needs no whole-cart metadata",()=>{
 const {line,session}=fixtures();const lines=Array.from({length:30},()=>structuredClone(line));session.amount_subtotal=450000;
 assert.equal(paidLineItems(lines,session).length,30);assert.ok(Object.values(session.metadata!).every(value=>value.length<=500));
});
