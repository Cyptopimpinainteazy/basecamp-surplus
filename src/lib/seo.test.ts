import test from "node:test";
import assert from "node:assert/strict";
import { catalogSeo, serializeParams } from "./seo";
import { poleGuides, guideForModel, poleModelHref } from "./pole-guides";
import { seoCollections } from "./seo-collections";
import { productFeedXml } from "./channels/feed";
import { productIdentifiers } from "./product-identifiers";
import type { Product } from "./db/schema";

test("catalogue pagination has self canonicals; filters and search are noindex",()=>{
  assert.deepEqual(catalogSeo("/c/tents",{page:"2"}),{canonical:"/c/tents?page=2",noindex:false,page:2});
  for(const params of [{q:"DAC"},{condition:"used"},{sort:"price_asc"},{size:"XL"}]) assert.equal(catalogSeo("/brand/dac",params).noindex,true);
  for(const page of ["Infinity","NaN","-1","1.5","0",""]) assert.equal(catalogSeo("/shop",{page}).page,1);
  assert.equal(serializeParams({q:"Easton DAC",page:"2"}),"q=Easton+DAC&page=2");
});
test("model guide URLs are unique and capacity-sensitive",()=>{
  assert.equal(new Set(poleGuides.map(t=>t.slug)).size,poleGuides.length);
  assert.notEqual(poleModelHref("The North Face Tadpole 2"),poleModelHref("The North Face Tadpole 23"));
  assert.equal(guideForModel("not a tent"),undefined);
  assert.equal(poleModelHref("Unknown & Model"),"/poles?model=Unknown%20%26%20Model");
  for(const g of poleGuides){assert.ok(g.source.url.startsWith("https://"));assert.ok(!/[^a-z0-9-]/.test(g.slug));}
});
test("curated collections retain mandatory category and manufacturer searches",()=>{
  assert.equal(new Set(seoCollections.map(c=>c.slug)).size,4);
  assert.equal(seoCollections.find(c=>c.slug==="dac-tent-poles")?.query.collectionSearch,"DAC");
  assert.equal(seoCollections.find(c=>c.slug==="easton-tent-poles")?.query.category,"poles");
  assert.deepEqual(seoCollections.find(c=>c.slug==="north-face-tent-stakes")?.query.productTypeTerms,["stake","peg"]);
});
test("merchant feed uses actual asking price and never manufactures identifiers from SKU",()=>{
  const p: Product = {id:"00000000-0000-4000-8000-000000000001",aiRaw:null,brandSlug:"dac",model:"",costCents:null,createdAt:new Date("2026-01-01"),updatedAt:new Date("2026-01-01"),publishedAt:null,ebayAspects:null,ebayCategoryId:null,featured:false,hashtags:[],highlights:[],keywords:[],packagePreset:"pole-tube",poleSpec:{saleUnit:"assembly"},pricingBasis:"",seoDescription:"",seoTitle:"",specs:[],sku:"INTERNAL-123",title:"Pole & replacement",slug:"pole",description:"Measured stock",conditionNotes:"",fitment:[],images:[{url:"https://example.com/pole.jpg",alt:"Pole"}],priceCents:4900,msrpCents:9900,category:"poles",condition:"new_with_tags",brand:"DAC",productType:"pole",quantity:2,status:"active",color:"",size:"",material:"aluminum",gender:"",weightOz:null,fulfillment:"stock",supplierId:null,supplierSku:"",leadTimeDays:null};
  const xml=productFeedXml([p]);
  assert.ok(xml.includes("<g:price>49.00 USD</g:price>"));
  assert.ok(xml.includes("<g:id>INTERNAL-123</g:id>"));
  assert.ok(xml.includes("Pole &amp; replacement"));
  assert.ok(!xml.includes("<g:mpn>"));assert.ok(!xml.includes("<g:identifier_exists>no"));assert.ok(!xml.includes("<g:sale_price>"));
});

test("manufacturer identifiers preserve leading zeros and reject invalid barcodes",()=>{
  assert.deepEqual(productIdentifiers([{label:"GTIN",value:"012345678905"},{label:"MPN",value:"OEM-42"}]),{gtin:"012345678905",mpn:"OEM-42"});
  assert.equal(productIdentifiers([{label:"GTIN",value:"012345678906"}]).gtin,undefined);
  assert.equal(productIdentifiers([{label:"SKU",value:"internal-only"}]).mpn,undefined);
});
