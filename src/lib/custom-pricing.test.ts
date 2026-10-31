import { test } from "node:test";
import assert from "node:assert/strict";
import { canopyEstimate, defaultPricing, mergePricing, poleBuild, poleBuildTotal, polePrice, poleSpec, canopyConfig } from "./custom-pricing";

const base = { size: "10x10", frame: "steel", backWall: false, sideWalls: 0, halfWalls: 0, quantity: 1, canopyColor: "", printNotes: "" } as const;

test("canopy estimate adds options per tent and applies the best quantity tier", () => {
  const one = canopyEstimate({ ...base }, defaultPricing);
  assert.equal(one.total, defaultPricing.canopy.top["10x10"]);
  const loaded = canopyEstimate({ ...base, size: "10x20", frame: "aluminum", backWall: true, sideWalls: 2, halfWalls: 1, quantity: 6 }, defaultPricing);
  const each = 89900 + 32000 + 31900 + 2 * 19900 + 11900;
  assert.equal(loaded.each, each);
  assert.equal(loaded.percentOff, 10);
  assert.equal(loaded.total, Math.round(each * 6 * 0.9));
  assert.equal(canopyEstimate({ ...base, quantity: 3 }, defaultPricing).percentOff, 5);
});

test("canopy config rejects impossible options", () => {
  assert.equal(canopyConfig.safeParse({ ...base, sideWalls: 3 }).success, false);
  assert.equal(canopyConfig.safeParse({ ...base, quantity: 0 }).success, false);
  assert.equal(canopyConfig.safeParse({ ...base, size: "20x20" }).success, false);
});

test("pole price follows sections, heavy tube, bends and hub legs", () => {
  const straight = { label: "", shape: "straight", lengthIn: 120, sections: 8, diameterMm: 8.7, quantity: 1 } as const;
  assert.equal(polePrice(straight), 900 + 375 * 8);
  assert.equal(polePrice({ ...straight, diameterMm: 9.5 }), 900 + (375 + 75) * 8);
  assert.equal(polePrice({ ...straight, shape: "prebent" }), 900 + (375 + 150) * 8);
  assert.equal(polePrice({ ...straight, shape: "hub", lengthIn: 60, sections: 4, hubLegs: 4 }), 2400 + 4 * (900 + 375 * 4));
  const build = poleBuild.parse({ poles: [{ ...straight, quantity: 2 }, { ...straight, diameterMm: 9.5 }] });
  assert.equal(poleBuildTotal(build), 2 * (900 + 3000) + (900 + 3600));
});

test("pole specs must be buildable", () => {
  const ok = { shape: "straight", lengthIn: 120, sections: 8, diameterMm: 8.7, quantity: 1 };
  assert.equal(poleSpec.safeParse(ok).success, true);
  const tooLong = poleSpec.safeParse({ ...ok, sections: 3 });
  assert.equal(tooLong.success, false);
  assert.match(tooLong.error!.issues[0].message, /per section/);
  assert.equal(poleSpec.safeParse({ ...ok, diameterMm: 8.8 }).success, false);
  assert.equal(poleSpec.safeParse({ ...ok, shape: "hub" }).success, false);
});

test("saved pricing merges over defaults and ignores junk", () => {
  const merged = mergePricing({ canopy: { top: { "10x10": 60000, "10x15": -5 }, quantityTiers: [[4, 8], ["x", 2], [2, 99]] }, poles: { perPole: 1200, hub: "free" } });
  assert.equal(merged.canopy.top["10x10"], 60000);
  assert.equal(merged.canopy.top["10x15"], defaultPricing.canopy.top["10x15"]);
  assert.deepEqual(merged.canopy.quantityTiers, [[4, 8]]);
  assert.equal(merged.poles.perPole, 1200);
  assert.equal(merged.poles.hub, defaultPricing.poles.hub);
  assert.deepEqual(mergePricing(null), defaultPricing);
});
