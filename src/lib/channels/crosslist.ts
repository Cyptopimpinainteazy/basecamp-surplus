import { poleSaleLabel } from "../pole-sale";
import { getCategory, getCondition, site } from "../config";
import type { Product } from "../db/schema";
import { truncate } from "../format";

// Poshmark, Mercari and Depop have no public listing APIs (and Poshmark forbids
// automation), so we produce copy-ready listing packs per channel plus a CSV
// that Vendoo / List Perfectly / Crosslist import directly.

export const manualChannels = [
  { id: "poshmark", name: "Poshmark", titleMax: 80, descMax: 1500, url: "https://poshmark.com/create-listing" },
  { id: "mercari", name: "Mercari", titleMax: 80, descMax: 1000, url: "https://www.mercari.com/sell/" },
  { id: "depop", name: "Depop", titleMax: 0, descMax: 1000, url: "https://www.depop.com/products/create/" },
  { id: "geartrade", name: "Geartrade", titleMax: 100, descMax: 3000, url: "https://www.geartrade.com/sell" },
] as const;
export type ManualChannelId = (typeof manualChannels)[number]["id"];

/** Price on fee-taking marketplaces = site price + markup, whole dollars (Poshmark requires them). */
export function marketplacePriceCents(p: Product, channel: string) {
  const markups: Record<string, number> = {
    poshmark: Number(process.env.POSHMARK_MARKUP ?? 0.2),
    mercari: Number(process.env.MERCARI_MARKUP ?? 0.13),
    depop: Number(process.env.DEPOP_MARKUP ?? 0.12),
    geartrade: Number(process.env.GEARTRADE_MARKUP ?? 0.15),
  };
  const raw = p.priceCents * (1 + (markups[channel] ?? 0.15));
  return Math.max(500, Math.round(raw / 100) * 100);
}

export function listingPack(p: Product, channel: ManualChannelId) {
  const ch = manualChannels.find((c) => c.id === channel)!;
  const cond = getCondition(p.condition);
  const lines = [
    p.category === "poles" ? `One purchase includes: ${poleSaleLabel(p.poleSpec) ?? "UNCONFIRMED — do not publish until reviewed"}` : "",
    p.description,
    p.highlights.length ? p.highlights.map((h) => `• ${h}`).join("\n") : "",
    `Condition: ${cond.label}${p.conditionNotes ? `. ${p.conditionNotes}` : ""}`,
    p.size ? `Size: ${p.size}` : "",
    p.fitment.length ? `Fits: ${p.fitment.join(", ")}` : "",
    p.msrpCents ? `Original retail: $${Math.round(p.msrpCents / 100)}` : "",
    `SKU ${p.sku}`,
  ].filter(Boolean);
  let description = lines.join("\n\n");
  if (channel === "depop") {
    description = `${p.title}\n\n${description}\n\n${p.hashtags.slice(0, 5).map((h) => `#${h}`).join(" ")}`;
  }
  return {
    channel: ch,
    title: ch.titleMax ? truncate(p.title, ch.titleMax) : "",
    description: truncate(description, ch.descMax),
    priceCents: marketplacePriceCents(p, channel),
    originalPriceCents: p.msrpCents ?? null,
    brand: p.brand,
    category: getCategory(p.category)?.name ?? p.category,
    size: p.size,
    color: p.color,
    condition: cond.label,
    images: p.images.map((i) => i.url),
    hashtags: p.hashtags,
  };
}

const csvCell = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Generic crosslister import CSV (Vendoo / List Perfectly / Crosslist column mapping). */
export function crosslistCsv(items: Product[]) {
  const header = [
    "SKU", "Title", "Description", "Brand", "Category", "Size", "Color", "Condition",
    "Price", "Original Price", "Quantity", "Weight (oz)", "Tags", "Image URLs", "Product URL",
  ];
  const rows = items.map((p) => {
    const pack = listingPack(p, "poshmark");
    return [
      p.sku, pack.title, pack.description, p.brand, pack.category, p.size, p.color, pack.condition,
      (pack.priceCents / 100).toFixed(2), p.msrpCents ? (p.msrpCents / 100).toFixed(2) : "",
      p.quantity, p.weightOz ?? "", p.hashtags.join(" "), p.images.map((i) => i.url).join(" | "),
      `${site.url}/p/${p.slug}`,
    ].map(csvCell).join(",");
  });
  return [header.join(","), ...rows].join("\n");
}
