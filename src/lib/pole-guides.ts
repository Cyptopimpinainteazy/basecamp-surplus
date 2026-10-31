import { slugify } from "./format";
import { pathSlug } from "./seo";
import { tentReference } from "./tent-reference";

// Reference tents. Each one's canonical page is its model parts page
// (/parts/north-face-<model>); the older /poles/tents/<model> guide URLs
// redirect there permanently so the two never compete in search.

const short = (model: string) => model.replace(/^The North Face\s+/i, "");

export const poleGuides = tentReference.map((t) => ({
  ...t,
  /** Legacy guide slug, e.g. "rock-22" (still served as a redirect). */
  slug: pathSlug(short(t.model)),
  /** Parts page slug, matching lib/models toModel(): "north-face-rock-22". */
  partsSlug: slugify(t.model.replace(/^the\s+/i, "")),
}));

export const poleGuide = (slug: string) => poleGuides.find((t) => t.slug === slug);

export function guideForModel(model: string) {
  const key = short(model.trim()).toLowerCase().replace(/\s+/g, " ");
  return poleGuides.find((t) => short(t.model).toLowerCase().replace(/\s+/g, " ") === key);
}

/** Where a tent model's poles live: its parts page when known, else the pole search. */
export function poleModelHref(model: string) {
  const guide = guideForModel(model);
  return guide ? `/parts/${guide.partsSlug}` : `/poles?model=${encodeURIComponent(model)}`;
}
