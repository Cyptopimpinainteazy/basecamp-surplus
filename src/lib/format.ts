export const money = (cents: number | null | undefined) =>
  cents == null
    ? ""
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      }).format(cents / 100);

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export const savingsPercent = (price: number, msrp: number | null | undefined) =>
  msrp && msrp > price ? Math.round(((msrp - price) / msrp) * 100) : 0;

export const truncate = (s: string, n: number) =>
  s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";

export const orderNumber = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `BC-${out}`;
};

export const skuFor = (category: string, brandSlug: string) => {
  const cat = category.slice(0, 3).toUpperCase();
  const br = brandSlug.replace(/-/g, "").slice(0, 3).toUpperCase();
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .slice(0, 5);
  return `${cat}-${br}-${rand}`;
};

export const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
