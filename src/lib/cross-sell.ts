/** Exact catalogue model keys. Capacity, year and generation are never stripped. */
export function modelKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
export function crossSellPlan(p: { category: string; brand: string; model: string; fitment: string[] }) {
  if (p.category === "tents" && p.model.trim()) {
    // Require the full brand + model key recorded in the part's fitment list.
    const model = modelKey(p.model);
    const brand = modelKey(p.brand);
    return { categories: ["poles", "parts"], models: [model.startsWith(brand + " ") ? model : `${brand} ${model}`] };
  }
  if ((p.category === "poles" || p.category === "parts") && p.fitment.length) {
    return { categories: ["tents"], models: [...new Set(p.fitment.map(modelKey).filter(Boolean))] };
  }
  return null;
}
