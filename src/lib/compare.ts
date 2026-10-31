import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import data from "../../content/comparisons.json";
import { buildSafe } from "./build-safe";
import { db } from "./db";
import { articles, type Article } from "./db/schema";
import { toModel } from "./models";
import { tentReference, type TentReference } from "./tent-reference";

// Head-to-head tent pages. Pairs and the written take live in
// content/comparisons.json; every number comes from the two published reviews
// and the pole reference, so editing a review updates its comparisons.

type PairDef = { a: string; b: string; summary: string; pickA: string; pickB: string; keywords: string[] };
const pairs = data.comparisons as PairDef[];

export const shortSlug = (subject: string) => toModel(subject).slug.replace(/^north-face-/, "");
export const pairSlug = (p: { a: string; b: string }) => `${shortSlug(p.a)}-vs-${shortSlug(p.b)}`;

export type Side = { review: Article; short: string; display: string; ref: TentReference | null };
export type Comparison = PairDef & { slug: string; A: Side; B: Side };

async function reviewsBySubject(subjects: string[]) {
  const rows = await buildSafe(
    () =>
      db
        .select()
        .from(articles)
        .where(and(eq(articles.status, "published"), inArray(articles.subject, subjects))),
    [] as Article[],
  );
  return new Map(rows.map((r) => [r.subject, r]));
}

function side(review: Article): Side {
  const m = toModel(review.subject);
  return { review, short: m.short, display: m.display, ref: tentReference.find((t) => t.model === review.subject) ?? null };
}

/** Every comparison whose two reviews are published. */
export async function allComparisons(): Promise<Comparison[]> {
  const bySubject = await reviewsBySubject([...new Set(pairs.flatMap((p) => [p.a, p.b]))]);
  return pairs.flatMap((p) => {
    const a = bySubject.get(p.a);
    const b = bySubject.get(p.b);
    return a && b ? [{ ...p, slug: pairSlug(p), A: side(a), B: side(b) }] : [];
  });
}

export async function getComparison(slug: string) {
  return (await allComparisons()).find((c) => c.slug === slug) ?? null;
}

/** Comparisons that include this review's tent, for "compare it" links. */
export async function comparisonsFor(subject: string) {
  return (await allComparisons()).filter((c) => c.a === subject || c.b === subject);
}

// ---- spec alignment ----

const ROWS: { label: string; from: string[] }[] = [
  { label: "Capacity", from: ["Capacity"] },
  { label: "Season", from: ["Season"] },
  { label: "Floor area", from: ["Floor area", "Floor", "Floor dimensions"] },
  { label: "Peak height", from: ["Peak height", "Interior height"] },
  { label: "Trail weight", from: ["Trail weight", "Minimum trail weight", "Weight"] },
  { label: "Packed weight", from: ["Total weight", "Packed weight", "Packaged weight"] },
  { label: "Doors", from: ["Doors"] },
  { label: "Vestibules", from: ["Vestibules", "Vestibule"] },
  { label: "Construction", from: ["Construction", "Structure"] },
  { label: "Poles", from: ["Poles"] },
  { label: "Pole diameter", from: ["Pole diameter"] },
  { label: "Pole system", from: ["Pole system"] },
  { label: "Status", from: ["Status", "Tent status"] },
];

function specValue(a: Article, labels: string[]) {
  for (const l of labels) {
    const s = a.specs.find((x) => x.label.toLowerCase() === l.toLowerCase());
    if (s?.value) return s.value;
  }
  return null;
}

/** Spec rows where at least one tent has a value. */
export function specRows(c: Comparison) {
  return ROWS.map((r) => {
    let a = specValue(c.A.review, r.from);
    let b = specValue(c.B.review, r.from);
    // Fall back to the pole reference for pole rows.
    if (r.label === "Pole diameter") {
      a ??= c.A.ref?.diametersMm.length ? `${c.A.ref.diametersMm.join(" / ")} mm` : null;
      b ??= c.B.ref?.diametersMm.length ? `${c.B.ref.diametersMm.join(" / ")} mm` : null;
    }
    if (r.label === "Pole system") {
      a ??= c.A.ref?.poleSystem || null;
      b ??= c.B.ref?.poleSystem || null;
    }
    return { label: r.label, a, b };
  }).filter((r) => r.a || r.b);
}

/** "33.3 sq ft", "Floor=84 × 50 in, 33.3 sq ft" → 33.3 */
export function sqFt(v: string | null) {
  const m = v?.match(/([\d,.]+)\s*sq ?ft/i);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

/** "5 lb 4 oz", "About 50 lb", "3 lb 15 oz (owner reported)" → ounces. Ranges and "about" keep the first number. */
export function ounces(v: string | null) {
  if (!v) return null;
  const lb = v.match(/([\d.]+)\s*lb/i);
  const oz = v.match(/([\d.]+)\s*oz/i);
  if (!lb && !oz) return null;
  return (lb ? Number(lb[1]) * 16 : 0) + (oz ? Number(oz[1]) : 0);
}

export const fmtWeight = (oz: number) => {
  const lb = Math.floor(oz / 16);
  const rem = Math.round(oz - lb * 16);
  return [lb ? `${lb} lb` : "", rem ? `${rem} oz` : ""].filter(Boolean).join(" ") || "0 oz";
};

/** Plain-language differences computed from the numbers both reviews publish. */
export function keyDifferences(c: Comparison) {
  const out: string[] = [];
  const floorA = sqFt(specValue(c.A.review, ["Floor area", "Floor", "Floor dimensions"]));
  const floorB = sqFt(specValue(c.B.review, ["Floor area", "Floor", "Floor dimensions"]));
  if (floorA && floorB && Math.abs(floorA - floorB) >= 1) {
    const [big, small, bigN, smallN] = floorA > floorB ? [c.A, c.B, floorA, floorB] : [c.B, c.A, floorB, floorA];
    out.push(
      `The ${big.short} has ${Math.round((bigN - smallN) * 10) / 10} sq ft more floor than the ${small.short} (${bigN} vs ${smallN} sq ft, ${Math.round(((bigN - smallN) / smallN) * 100)}% more).`,
    );
  } else if (floorA && floorB) {
    out.push(`Floor area is effectively the same: ${floorA} vs ${floorB} sq ft.`);
  }

  const wA = ounces(specValue(c.A.review, ["Trail weight", "Minimum trail weight", "Weight"]));
  const wB = ounces(specValue(c.B.review, ["Trail weight", "Minimum trail weight", "Weight"]));
  if (wA && wB && Math.abs(wA - wB) >= 2) {
    const [light, heavy, diff] = wA < wB ? [c.A, c.B, wB - wA] : [c.B, c.A, wA - wB];
    out.push(`The ${light.short} is ${fmtWeight(diff)} lighter than the ${heavy.short} by published trail weight.`);
  } else if (wA && wB) {
    out.push(`Published trail weights are within an ounce or two of each other.`);
  }

  const capA = c.A.ref?.capacity;
  const capB = c.B.ref?.capacity;
  if (capA && capB && capA !== capB) out.push(`Rated for ${capA} vs ${capB} people.`);

  const sA = c.A.ref?.season;
  const sB = c.B.ref?.season;
  if (sA && sB && sA !== sB) out.push(`The ${c.A.short} is a ${sA} tent; the ${c.B.short} is ${sB}.`);

  out.push(poleCompatibility(c));
  return out;
}

/** Whether poles could swap between the two tents, from the reference diameters. */
export function poleCompatibility(c: Comparison) {
  const dA = c.A.ref?.diametersMm ?? [];
  const dB = c.B.ref?.diametersMm ?? [];
  if (!dA.length || !dB.length) {
    return `Poles are cut to each tent's length and shape, so treat them as model-specific. Match by length, sections and diameter before swapping.`;
  }
  const shared = dA.filter((d) => dB.some((e) => Math.abs(d - e) <= 0.2));
  if (!shared.length) {
    return `Poles don't swap: the ${c.A.short} uses ${dA.join(" / ")} mm poles and the ${c.B.short} uses ${dB.join(" / ")} mm.`;
  }
  return `Both use ${shared.join(" / ")} mm poles, but each tent's poles are cut to its own length, so a pole only swaps if the assembled length and sections match too.`;
}
