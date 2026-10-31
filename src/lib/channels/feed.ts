import "server-only";
import { orderableProblem } from "../checkout-rules";
import { poleSaleLabel } from "../pole-sale";
import { productIdentifiers } from "../product-identifiers";
import { getCategory, getCondition, shippingPolicy, site } from "../config";
import type { Product } from "../db/schema";
import { escapeXml, truncate } from "../format";

// Google Merchant Center RSS 2.0 feed. Meta Commerce Manager and Pinterest
// catalogs accept the same format, so one feed powers Google Shopping free
// listings, Facebook/Instagram Shops (and Marketplace where eligible), and Pinterest.

const genderMap: Record<string, string> = { mens: "male", womens: "female", unisex: "unisex", kids: "unisex" };

export function productFeedXml(items: Product[]) {
  const entries = items
    .filter((p) => p.images.length > 0 && p.priceCents > 0 && !orderableProblem(p))
    .map((p) => {
      const identifiers = productIdentifiers(p.specs ?? []);
      const cat = getCategory(p.category);
      const cond = getCondition(p.condition);
      const link = `${site.url}/p/${p.slug}`;
      const inStock = p.status === "active" && p.quantity > 0;
      const bulky = shippingPolicy.bulkyCategories.includes(p.category);
      const shipCents = p.priceCents >= shippingPolicy.freeThresholdCents ? 0 : bulky ? shippingPolicy.standardCents.bulky : shippingPolicy.standardCents.light;
      const description = [p.category === "poles" ? `One purchase includes: ${poleSaleLabel(p.poleSpec)}` : "", p.description, p.conditionNotes && `Condition: ${p.conditionNotes}`, p.fitment.length && `Fits: ${p.fitment.join(", ")}`]
        .filter(Boolean)
        .join("\n\n");
      const fields: [string, string | undefined][] = [
        ["g:id", p.sku],
        ["g:title", truncate(p.title, 150)],
        ["g:description", truncate(description, 5000)],
        ["g:link", link],
        ["g:image_link", p.images[0].url],
        ...p.images.slice(1, 11).map((i) => ["g:additional_image_link", i.url] as [string, string]),
        ["g:availability", inStock ? "in_stock" : "out_of_stock"],
        ["g:price", `${(p.priceCents / 100).toFixed(2)} USD`],
        ["g:condition", cond.google],
        ["g:brand", p.brand],
        ["g:mpn", identifiers.mpn],
        ["g:gtin", identifiers.gtin],
        ["g:google_product_category", cat?.googleCategoryId],
        ["g:product_type", [cat?.name, p.productType].filter(Boolean).join(" > ")],
        ["g:color", p.color || undefined],
        ["g:size", p.size || undefined],
        ["g:material", p.material || undefined],
        ["g:gender", genderMap[p.gender]],
        ["g:age_group", p.gender === "kids" ? "kids" : p.category === "jackets" || p.category === "pants" ? "adult" : undefined],
        ["g:quantity_to_sell_on_facebook", String(p.quantity)],
        ["g:shipping_weight", p.weightOz ? `${p.weightOz} oz` : undefined],
        ["g:custom_label_0", cond.short],
      ];
      const shipping = `<g:shipping><g:country>US</g:country><g:service>Standard</g:service><g:price>${(shipCents / 100).toFixed(2)} USD</g:price></g:shipping>`;
      return `<item>${fields
        .filter(([, v]) => v)
        .map(([k, v]) => `<${k}>${escapeXml(v!)}</${k}>`)
        .join("")}${shipping}</item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${escapeXml(site.name)}</title>
<link>${site.url}</link>
<description>${escapeXml(site.description)}</description>
${entries}
</channel>
</rss>`;
}
