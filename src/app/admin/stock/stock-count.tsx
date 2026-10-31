"use client";
import { useActionState } from "react";
import { updateStock } from "./actions";

export function StockCount({ id, quantity, version, title }: { id: string; quantity: number; version: string; title: string }) {
  const [state, action, pending] = useActionState(updateStock, null);
  return <form action={action} className="min-w-64 space-y-2">
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="previous" value={quantity} />
    <input type="hidden" name="version" value={version} />
    <div className="flex gap-2">
      <input aria-label={`Count for ${title}`} name="quantity" type="number" required min="0" max="2000000000" step="1" defaultValue={quantity} className="field w-24" />
      <button disabled={pending} className="btn btn-spruce min-h-10 px-3 text-sm">{pending ? "Saving…" : "Save count"}</button>
    </div>
    <input aria-label={`Adjustment reason for ${title}`} name="reason" required minLength={3} maxLength={300} placeholder="Reason: restock, damage, recount…" className="field text-xs" />
    <p role="status" className={`max-w-72 text-xs ${state?.error ? "text-blaze-deep" : "text-spruce"}`}>{state?.error ?? state?.ok}</p>
  </form>;
}
