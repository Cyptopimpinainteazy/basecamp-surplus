import "server-only";
import { isNewCondition } from "./config";
import { ebayComps } from "./channels/ebay";

// Pricing strategy:
// - New with tags: anchor to MSRP at a surplus discount, cross-checked against live eBay
//   new-condition asks so the site price undercuts the market.
// - Used: anchor to live eBay pre-owned asks; fall back to a fraction of MSRP.
// Prices end in 9 (e.g. $149, $189) for retail feel.

const NEW_FACTOR = Number(process.env.PRICE_NEW_FACTOR ?? 0.62); // 38% off MSRP
const NEW_WITHOUT_TAGS_FACTOR = Number(process.env.PRICE_NWOT_FACTOR ?? 0.55);
const USED_FACTORS: Record<string, number> = {
  used_excellent: Number(process.env.PRICE_USED_EXCELLENT_FACTOR ?? 0.5),
  used_good: Number(process.env.PRICE_USED_GOOD_FACTOR ?? 0.42),
  used_fair: Number(process.env.PRICE_USED_FAIR_FACTOR ?? 0.3),
};
const UNDERCUT = Number(process.env.PRICE_COMP_UNDERCUT ?? 0.93); // 7% under market median
const MIN_PRICE_CENTS = 1500;

export function retailRound(cents: number) {
  const dollars = Math.max(MIN_PRICE_CENTS / 100, cents / 100);
  if (dollars < 30) return Math.round(dollars) * 100 - 1; // e.g. $24.99 under $30
  const step = dollars < 100 ? 5 : 10;
  return (Math.round(dollars / step) * step - 1) * 100;
}

export type PriceSuggestion = {
  priceCents: number;
  msrpCents: number | null;
  basis: string;
  comps: Awaited<ReturnType<typeof ebayComps>>;
};

export async function suggestPrice(input: {
  msrpUsd: number | null;
  condition: string;
  compsQuery: string;
}): Promise<PriceSuggestion> {
  const msrpCents = input.msrpUsd ? Math.round(input.msrpUsd * 100) : null;
  const isNew = isNewCondition(input.condition);
  const factor =
    input.condition === "new_with_tags"
      ? NEW_FACTOR
      : input.condition === "new_without_tags"
        ? NEW_WITHOUT_TAGS_FACTOR
        : (USED_FACTORS[input.condition] ?? 0.4);

  let comps: PriceSuggestion["comps"] = null;
  try {
    comps = await ebayComps(input.compsQuery, isNew);
  } catch {
    comps = null; // comps are advisory; never block intake on them
  }

  const fromMsrp = msrpCents ? msrpCents * factor : null;
  const fromComps = comps?.medianCents ? comps.medianCents * UNDERCUT : null;

  let raw: number;
  let basis: string;
  if (fromMsrp && fromComps) {
    // Take the lower so the site is the best deal, but never below 85% of the MSRP anchor for new items.
    raw = isNew ? Math.max(Math.min(fromMsrp, fromComps), fromMsrp * 0.85) : Math.min(fromMsrp * 1.15, fromComps);
    basis = `MSRP ${fmt(msrpCents!)} × ${factor} and eBay ${isNew ? "new" : "pre-owned"} median ${fmt(comps!.medianCents!)} (${comps!.count} listings)`;
  } else if (fromComps) {
    raw = fromComps;
    basis = `eBay ${isNew ? "new" : "pre-owned"} median ${fmt(comps!.medianCents!)} across ${comps!.count} listings, minus ${Math.round((1 - UNDERCUT) * 100)}%`;
  } else if (fromMsrp) {
    raw = fromMsrp;
    basis = `Estimated MSRP ${fmt(msrpCents!)} × ${factor}`;
  } else {
    raw = MIN_PRICE_CENTS;
    basis = "No MSRP or comps found: set the price manually";
  }
  return { priceCents: retailRound(raw), msrpCents, basis, comps };
}

const fmt = (c: number) => `$${(c / 100).toFixed(0)}`;
