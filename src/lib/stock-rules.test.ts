import test from "node:test";
import assert from "node:assert/strict";
import { parseStockCount, stockStatus } from "./stock-rules";
import { crossSellPlan } from "./cross-sell";

test("physical counts reject missing, negative, fractional and overflowing values", () => {
  for (const v of [null, undefined, "", " ", "-1", "1.5", "NaN", "Infinity", "1e6", "2000000001", 4]) assert.equal(parseStockCount(v), null);
  assert.equal(parseStockCount("0"), 0);
  assert.equal(parseStockCount("1000000"), 1000000);
});
test("zero stock removes a live listing; receiving stock never publishes drafts or sold-out items", () => {
  assert.equal(stockStatus("active", 0), "sold_out");
  assert.equal(stockStatus("active", 4), "active");
  for (const s of ["sold_out", "draft", "archived"] as const) assert.equal(stockStatus(s, 4), s);
});
test("cross selling preserves tent capacity and generation and never guesses from a product title", () => {
  assert.deepEqual(crossSellPlan({category:"tents",brand:"The North Face",model:" Wawona 4 (2020) ",fitment:[]}), {categories:["poles","parts"], models:["the north face wawona 4 (2020)"]});
  assert.deepEqual(crossSellPlan({category:"tents",brand:"The North Face",model:"The North Face Wawona 6",fitment:[]})?.models, ["the north face wawona 6"]);
  assert.equal(crossSellPlan({category:"tents",brand:"The North Face",model:"",fitment:[]}),null);
  assert.equal(crossSellPlan({category:"poles",brand:"DAC",model:"9.5mm",fitment:[]}),null);
  assert.deepEqual(crossSellPlan({category:"poles",brand:"DAC",model:"",fitment:["The North Face Wawona 4","the north face wawona 4"]})?.models,["the north face wawona 4"]);
  assert.equal(crossSellPlan({category:"jackets",brand:"Patagonia",model:"Down",fitment:[]}),null);
});

test("migration journal is in timestamp order, so no migration is skipped", async () => {
  const { readFileSync } = await import("node:fs");
  const { entries } = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: { tag: string; when: number; idx: number }[] };
  entries.forEach((e, i) => {
    assert.equal(e.idx, i);
    if (i) assert.ok(e.when > entries[i - 1].when, `${e.tag} must be dated after ${entries[i - 1].tag}`);
  });
});
