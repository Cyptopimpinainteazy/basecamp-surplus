import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { products, type Product } from "./db/schema";

export type PoleQuery = {
  lengthIn?: number;
  sections?: number;
  diameterMm?: number;
  colorCode?: string;
  shape?: "straight" | "prebent" | "hub";
  hubArms?: number;
  /** Allowed assembled-length difference in inches. */
  toleranceIn?: number;
};

export type PoleMatch = {
  product: Product;
  score: number;
  lengthDiff: number | null;
  sectionsMatch: boolean | null;
  diameterDiff: number | null;
  colorMatch: boolean | null;
};

/**
 * Ranks stocked poles against a measured pole. Length is the deciding factor;
 * sections, diameter and color move a pole up or down within the length window.
 * Poles without a recorded length can still match on sections + diameter.
 */
export async function matchPoles(q: PoleQuery, opts: { includeUnlisted?: boolean; limit?: number } = {}) {
  const statuses: Product["status"][] = opts.includeUnlisted ? ["active", "sold_out", "draft"] : ["active"];
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.category, "poles"), inArray(products.status, statuses)));

  const tol = q.toleranceIn ?? 1.5;
  const color = q.colorCode?.trim().toLowerCase();
  const out: PoleMatch[] = [];

  for (const p of rows) {
    if (!opts.includeUnlisted && p.quantity <= 0) continue;
    const s = p.poleSpec ?? {};
    let score = 0;

    // A hub assembly only replaces a hub assembly with the same number of legs.
    const theirShape = s.shape ?? "straight";
    if (q.shape) {
      if ((q.shape === "hub") !== (theirShape === "hub")) continue;
      if (q.shape === "hub" && q.hubArms && s.hubArms && q.hubArms !== s.hubArms) continue;
      if (q.shape !== "hub" && s.shape) score += q.shape === theirShape ? 15 : -20;
    }

    let lengthDiff: number | null = null;
    if (q.lengthIn && s.lengthIn) {
      lengthDiff = Math.round((s.lengthIn - q.lengthIn) * 10) / 10;
      if (Math.abs(lengthDiff) > tol) continue;
      score += 60 * (1 - Math.abs(lengthDiff) / (tol + 0.001));
    } else if (q.lengthIn) {
      score -= 15; // length unknown on our side: weaker candidate
    }

    let sectionsMatch: boolean | null = null;
    if (q.sections && s.sections) {
      sectionsMatch = q.sections === s.sections;
      score += sectionsMatch ? 25 : -30;
    }

    let diameterDiff: number | null = null;
    if (q.diameterMm && s.diameterMm) {
      diameterDiff = Math.round((s.diameterMm - q.diameterMm) * 100) / 100;
      const d = Math.abs(diameterDiff);
      if (d > 1) continue; // a millimetre off won't fit the tent's grommets or clips the same way
      score += d <= 0.3 ? 20 : -10;
    }

    let colorMatch: boolean | null = null;
    if (color && s.colorCode) {
      colorMatch = s.colorCode.toLowerCase().includes(color) || color.includes(s.colorCode.toLowerCase());
      score += colorMatch ? 10 : -5;
    }

    // Need at least one real dimension in common to call it a candidate.
    if (lengthDiff === null && !sectionsMatch && diameterDiff === null) continue;
    out.push({ product: p, score: Math.round(score), lengthDiff, sectionsMatch, diameterDiff, colorMatch });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 24);
}

export const cmToIn = (cm: number) => Math.round((cm / 2.54) * 10) / 10;

/** Plain-language fit label for a match. */
export function matchLabel(m: PoleMatch) {
  if (m.lengthDiff !== null && Math.abs(m.lengthDiff) <= 0.5 && m.sectionsMatch !== false && (m.diameterDiff === null || Math.abs(m.diameterDiff) <= 0.3)) {
    return "Close measurements";
  }
  if (m.score >= 50) return "Similar measurements";
  return "Candidate — check details";
}
