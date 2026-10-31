import data from "../../content/tent-reference.json";

export type TentReference = {
  model: string;
  capacity: number | null;
  season: string;
  poleCount: number | null;
  diametersMm: number[];
  poleSystem: string;
  hub: boolean;
  notes: string;
  confidence: "spec" | "listing" | "owner";
  source: { title: string; url: string };
};

export const tentReference = (data.tents as TentReference[]).slice().sort((a, b) => a.model.localeCompare(b.model));

export const confidenceLabel: Record<TentReference["confidence"], string> = {
  spec: "Published spec",
  listing: "Retailer listing",
  owner: "Owner reported",
};

/**
 * Tents known to use a pole of about this diameter. Calipers and printed sizes
 * differ slightly (8.84 vs 9 mm), so allow a small window.
 */
export function tentsForDiameter(mm: number, opts: { hub?: boolean; tolerance?: number } = {}) {
  const tol = opts.tolerance ?? 0.2;
  return tentReference.filter(
    (t) =>
      (opts.hub === undefined || t.hub === opts.hub || !t.diametersMm.length) &&
      t.diametersMm.some((d) => Math.abs(d - mm) <= tol),
  );
}

/** Hub tents, for when a loose pole is a hub assembly and its diameter is unknown. */
export const hubTents = () => tentReference.filter((t) => t.hub);
