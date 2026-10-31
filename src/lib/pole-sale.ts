import type { PoleSpec } from "./db/schema";
export const poleSaleUnits = ["section", "assembly", "set"] as const;
export type PoleSaleUnit = typeof poleSaleUnits[number];
export function parsePoleSale(unit: unknown, count: unknown): {saleUnit:PoleSaleUnit;assembliesIncluded?:number} | null {
  if(unit==="section" || unit==="assembly") return {saleUnit:unit};
  if(unit!=="set" || typeof count!=="string" || !/^[1-9]\d*$/.test(count.trim()))return null;
  const n=Number(count);return Number.isSafeInteger(n)&&n<=100?{saleUnit:"set",assembliesIncluded:n}:null;
}
export function poleSaleLabel(spec: PoleSpec | null | undefined) {
  if(spec?.saleUnit==="section")return "1 loose pole section";
  if(spec?.saleUnit==="assembly")return "1 complete pole assembly";
  if(spec?.saleUnit==="set" && Number.isInteger(spec.assembliesIncluded) && spec.assembliesIncluded!>0 && spec.assembliesIncluded!<=100)return `Complete tent pole set · ${spec.assembliesIncluded} ${spec.assembliesIncluded===1?"assembly":"assemblies"}`;
  return null;
}
