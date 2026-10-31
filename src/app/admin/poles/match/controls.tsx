"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { addLoosePoles, listUnmatchedPole } from "../../actions";

export function AddLoose({ productId }: { productId: string }) {
  const [count, setCount] = useState(1);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <label className="sr-only" htmlFor={`n-${productId}`}>How many</label>
      <input id={`n-${productId}`} type="number" min={1} max={500} value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} className="field h-10 min-h-0 w-20" />
      <button type="button" disabled={pending} onClick={() => start(async () => setMsg(await addLoosePoles(productId, count)))} className="btn btn-spruce min-h-10 px-3 text-sm">
        {pending ? "Adding…" : "Add to stock"}
      </button>
      {msg && <p className={`basis-full text-sm ${msg.error ? "text-blaze-deep" : "text-spruce"}`}>{msg.error ?? msg.ok}</p>}
    </div>
  );
}

export function UnmatchedForm({ values }: { values: { shape?: string; arms?: string; length?: string; unit?: string; sections?: string; diameter?: string; color?: string } }) {
  const [state, action, pending] = useActionState(listUnmatchedPole, null);
  return (
    <form action={action} className="h-fit space-y-3 rounded-[var(--radius-tag)] bg-snow p-5">
      <h2 className="display text-3xl">List it by size</h2>
      <p className="text-sm text-granite">For poles that don&apos;t match anything yet. Creates a draft titled by its measurements.</p>
      <input type="hidden" name="length" value={values.length ?? ""} />
      <input type="hidden" name="unit" value={values.unit ?? "in"} />
      <input type="hidden" name="sections" value={values.sections ?? ""} />
      <input type="hidden" name="diameter" value={values.diameter ?? ""} />
      <input type="hidden" name="color" value={values.color ?? ""} />
      <input type="hidden" name="shape" value={values.shape ?? "straight"} />
      <input type="hidden" name="arms" value={values.arms ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="quantity" className="label">How many in the pile</label>
          <input id="quantity" name="quantity" type="number" min={1} defaultValue={1} className="field" />
        </div>
        <div>
          <label htmlFor="price" className="label">Price ($)</label>
          <input id="price" name="price" type="number" step="0.01" min={1} defaultValue="24.99" className="field" />
        </div>
        <div>
          <label htmlFor="material" className="label">Material</label>
          <select id="material" name="material" className="field" defaultValue="Aluminum">
            <option>Aluminum</option>
            <option>Fiberglass</option>
            <option>Carbon</option>
          </select>
        </div>
        <div>
          <label htmlFor="pcond" className="label">Condition</label>
          <select id="pcond" name="condition" className="field" defaultValue="used_good">
            <option value="new_without_tags">New</option>
            <option value="used_excellent">Used, excellent</option>
            <option value="used_good">Used, good</option>
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor="brand" className="label">Brand, if you know it</label>
          <input id="brand" name="brand" className="field" placeholder="The North Face" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-blaze-deep">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-spruce">
          {state.ok} <Link href={`/admin/products/${state.id}`} className="underline">Open draft</Link>
        </p>
      )}
      <button disabled={pending} className="btn btn-blaze w-full">{pending ? "Creating…" : "Create draft listing"}</button>
    </form>
  );
}
