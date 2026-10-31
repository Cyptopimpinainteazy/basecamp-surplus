import type { Spec } from "./db/schema";
/** Manufacturer identifiers are entered in Specs, independently of our internal SKU. */
export function productIdentifiers(specs: Spec[]) {
  const find = (labels: string[]) => specs.find(s=>labels.includes(s.label.trim().toLowerCase()))?.value.trim();
  const mpn=find(["mpn","manufacturer part number"]);
  const candidate=find(["gtin","upc","ean"]);
  let gtin: string | undefined;
  if(candidate && /^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(candidate)) {
    const digits=candidate.split("").map(Number);
    const check=digits.pop()!;
    const sum=digits.reverse().reduce((n,d,i)=>n+d*(i%2===0?3:1),0);
    if((10-sum%10)%10===check) gtin=candidate;
  }
  return {mpn:mpn&&mpn.length<=70?mpn:undefined,gtin};
}
