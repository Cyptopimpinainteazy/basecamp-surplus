import test from "node:test";
import assert from "node:assert/strict";
import { parsePoleSale, poleSaleLabel } from "./pole-sale";
import { checkoutBody, orderableProblem } from "./checkout-rules";

test("sections and complete assemblies are distinct sale units",()=>{
  assert.equal(poleSaleLabel(parsePoleSale("section","")),"1 loose pole section");
  assert.equal(poleSaleLabel(parsePoleSale("assembly","")),"1 complete pole assembly");
  assert.equal(poleSaleLabel(parsePoleSale("set","4")),"Complete tent pole set · 4 assemblies");
  // A single hub assembly can be a tent's entire frame.
  assert.equal(poleSaleLabel(parsePoleSale("set","1")),"Complete tent pole set · 1 assembly");
});
test("full sets require an explicit valid count and unknown units are not inferred",()=>{
  for(const count of ["","0","-1","1.5","101","Infinity"]) assert.equal(parsePoleSale("set",count),null);
  assert.equal(parsePoleSale("complete","3"),null);
  assert.equal(poleSaleLabel({sections:9,lengthIn:144}),null);
  assert.equal(poleSaleLabel({saleUnit:"set",assembliesIncluded:0}),null);
});
test("checkout blocks unclear pole units and invalid prices, while other categories remain usable",()=>{
  assert.ok(orderableProblem({category:"poles",poleSpec:null,priceCents:9900}));
  assert.equal(orderableProblem({category:"poles",poleSpec:{saleUnit:"set",assembliesIncluded:3},priceCents:9900}),null);
  assert.equal(orderableProblem({category:"jackets",poleSpec:null,priceCents:9900}),null);
  assert.ok(orderableProblem({category:"tents",poleSpec:null,priceCents:0}));
});
test("duplicate cart IDs, including case variants, cannot bypass quantity checks",()=>{
  const id="abcdef12-abcd-4abc-8abc-abcdef123456";
  assert.equal(checkoutBody.safeParse({items:[{id,qty:2},{id:id.toUpperCase(),qty:2}]}).success,false);
  assert.equal(checkoutBody.safeParse({items:[{id,qty:2}]}).success,true);
  assert.equal(checkoutBody.safeParse({items:[{id,qty:0}]}).success,false);
});
