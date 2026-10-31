"use client";
import { useActionState } from "react";
import { brands, categories, conditions } from "@/lib/config";
import { createStockDraft } from "./actions";

export function ManualItem() {
  const [state, action, pending] = useActionState(createStockDraft, null);
  return <details className="rounded-[var(--radius-tag)] border border-accent/20 bg-card p-5" id="manual-item">
    <summary className="cursor-pointer font-semibold">+ Add an item manually — no AI required</summary>
    <p className="mt-3 text-sm text-muted">Creates a draft. Add photos in the item editor, review condition, measurements and pricing before publishing. For stakes, choose Tent parts and type “stakes”.</p>
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-semibold">Title<input name="title" required minLength={5} maxLength={200} className="field mt-1" placeholder="The North Face tent stakes — set of 8" /></label>
      <label className="text-sm font-semibold">Unique SKU<input name="sku" required minLength={2} maxLength={80} pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,79}" className="field mt-1" placeholder="TNF-STAKES-001" /></label>
      <label className="text-sm font-semibold">Brand<select name="brand" required defaultValue="" className="field mt-1"><option value="" disabled>Choose brand</option>{brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Category<select name="category" required defaultValue="" className="field mt-1"><option value="" disabled>Choose category</option>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Condition<select name="condition" required defaultValue="" className="field mt-1"><option value="" disabled>Inspect and choose</option>{conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      <label className="text-sm font-semibold">Quantity<input name="quantity" type="number" required min="0" max="2000000000" step="1" defaultValue="1" className="field mt-1" /></label>
      <label className="text-sm font-semibold">Model<input name="model" maxLength={150} className="field mt-1" placeholder="Model and generation / year" /></label>
      <label className="text-sm font-semibold">Size<input name="size" maxLength={40} className="field mt-1" placeholder="e.g. XL" /></label>
      <label className="text-sm font-semibold">Item type<input name="productType" maxLength={100} className="field mt-1" placeholder="stakes, jacket, main pole…" /></label>
      <div className="sm:col-span-2 lg:col-span-3"><button disabled={pending} className="btn btn-blaze">{pending ? "Creating draft…" : "Create draft & edit details →"}</button><p role="status" className="mt-2 text-sm text-blaze-deep">{state?.error}</p></div>
    </form>
  </details>;
}
