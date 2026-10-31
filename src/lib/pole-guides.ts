import { tentReference } from "./tent-reference";
import { pathSlug } from "./seo";
export const poleGuides = tentReference.map(t => ({...t, slug: pathSlug(t.model.replace(/^The North Face\s+/i, ""))}));
export const poleGuide = (slug: string) => poleGuides.find(t => t.slug === slug);
export function guideForModel(model: string) {
  const key = model.trim().replace(/^The North Face\s+/i, "").toLowerCase().replace(/\s+/g," ");
  return poleGuides.find(t => t.model.replace(/^The North Face\s+/i, "").toLowerCase().replace(/\s+/g," ") === key);
}
export function poleModelHref(model: string) {
  const guide = guideForModel(model);
  return guide ? `/poles/tents/${guide.slug}` : `/poles?model=${encodeURIComponent(model)}`;
}
