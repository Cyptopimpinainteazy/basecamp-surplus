/** Shared validation for physical stock counts; never coerce blanks or decimals. */
export const MAX_STOCK = 2_000_000_000;
export function parseStockCount(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 && n <= MAX_STOCK ? n : null;
}
export function stockStatus(current: "active" | "sold_out" | "draft" | "archived", quantity: number) {
  if (current === "active" && quantity === 0) return "sold_out";
  // Restocking is deliberately separate from publishing a previously sold-out listing.
  return current;
}
