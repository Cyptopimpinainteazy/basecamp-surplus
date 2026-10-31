"use client";

import { useActionState, useState } from "react";
import { confirmPo, shipPo, type PoFormState } from "./actions";

const carriers = ["UPS", "FedEx", "USPS", "DHL", "Other"];

export function PoForms({ token, status }: { token: string; status: string }) {
  const [confirmState, confirm, confirming] = useActionState<PoFormState, FormData>(confirmPo.bind(null, token), null);
  const [shipState, ship, shipping] = useActionState<PoFormState, FormData>(shipPo.bind(null, token), null);
  const [carrier, setCarrier] = useState("UPS");
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {status !== "confirmed" && status !== "shipped" && (
        <form action={confirm} className="rounded-[var(--radius-tag)] bg-card p-5">
          <h2 className="display text-3xl">1. Confirm the order</h2>
          <p className="mt-1 text-sm text-muted">Let us know you've got it and when it should ship.</p>
          <label className="label mt-4" htmlFor="cnote">Note (optional)</label>
          <textarea id="cnote" name="note" rows={3} maxLength={2000} className="field" placeholder="Ships Thursday. Proof approved as sent." />
          <button className="btn btn-spruce mt-3" disabled={confirming}>{confirming ? "Saving…" : "Confirm order"}</button>
          {confirmState?.ok && <p role="status" className="mt-3 font-semibold text-accent">{confirmState.ok}</p>}
          {confirmState?.error && <p role="alert" className="mt-3 font-semibold text-blaze-deep">{confirmState.error}</p>}
        </form>
      )}
      <form action={ship} className="rounded-[var(--radius-tag)] bg-card p-5">
        <h2 className="display text-3xl">{status === "shipped" ? "Update tracking" : "2. Add tracking"}</h2>
        <p className="mt-1 text-sm text-muted">The customer is emailed automatically the first time you save tracking.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="carrier">Carrier</label>
            <select id="carrier" name="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} className="field">
              {carriers.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {carrier === "Other" && (
            <div>
              <label className="label" htmlFor="carrierOther">Carrier name</label>
              <input id="carrierOther" name="carrierOther" className="field" maxLength={60} />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="tracking">Tracking number</label>
            <input id="tracking" name="tracking" required minLength={6} maxLength={80} className="field font-mono" autoComplete="off" />
          </div>
        </div>
        <label className="label mt-3" htmlFor="snote">Note (optional)</label>
        <textarea id="snote" name="note" rows={2} maxLength={2000} className="field" />
        <button className="btn btn-blaze mt-3" disabled={shipping}>{shipping ? "Saving…" : "Save tracking"}</button>
        {shipState?.ok && <p role="status" className="mt-3 font-semibold text-accent">{shipState.ok}</p>}
        {shipState?.error && <p role="alert" className="mt-3 font-semibold text-blaze-deep">{shipState.error}</p>}
      </form>
    </div>
  );
}
