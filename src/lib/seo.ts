export type SearchParams = Record<string, string | string[] | undefined>;
export const oneParam = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
export function catalogSeo(path: string, sp: SearchParams) {
  const raw = oneParam(sp.page);
  const page = raw && /^[1-9]\d*$/.test(raw) ? Math.min(Number(raw), 100000) : 1;
  const filtered = Object.entries(sp).some(([k, v]) => k !== "page" && Boolean(oneParam(v)));
  return { canonical: page > 1 ? `${path}?page=${page}` : path, noindex: filtered, page };
}
export function pathSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export function serializeParams(sp: SearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, v);
  return params.toString();
}
