import type { Product } from "./db/schema";

/** Customer-facing shipping promise for a listing, or null for our own stock. */
export function shipNote(p: Pick<Product, "fulfillment" | "leadTimeDays">) {
  if (p.fulfillment === "stock") return null;
  const days = p.leadTimeDays ?? null;
  if (p.fulfillment === "made_to_order") {
    if (!days) return "Made to order";
    return days >= 14 ? `Made to order: ships in about ${Math.round(days / 7)} weeks` : `Made to order: ships in about ${days} days`;
  }
  return days ? `Ships from our partner warehouse in ${days <= 2 ? "1–2" : `about ${days}`} business days` : "Ships from our partner warehouse";
}
