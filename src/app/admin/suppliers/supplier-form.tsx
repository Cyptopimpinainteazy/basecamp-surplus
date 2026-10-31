"use client";

import { useActionState } from "react";
import type { Supplier } from "@/lib/db/schema";
import { saveSupplier, type ActionState } from "../dropship-actions";

export function SupplierForm({ s }: { s?: Supplier }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSupplier, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div>
        <label className="label" htmlFor={`name-${s?.id ?? "new"}`}>Name</label>
        <input id={`name-${s?.id ?? "new"}`} name="name" required defaultValue={s?.name} className="field" placeholder="Impact Canopy" />
      </div>
      <div>
        <label className="label" htmlFor={`kind-${s?.id ?? "new"}`}>Type</label>
        <select id={`kind-${s?.id ?? "new"}`} name="kind" defaultValue={s?.kind ?? "dropship"} className="field">
          <option value="dropship">Dropship (ships stock items)</option>
          <option value="printer">Printer (logo canopies)</option>
          <option value="factory">Factory (private label / made to order)</option>
          <option value="parts">Parts (tubing, cord, tips)</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`oe-${s?.id ?? "new"}`}>Purchase orders go to (email)</label>
        <input id={`oe-${s?.id ?? "new"}`} name="orderEmail" type="email" required defaultValue={s?.orderEmail} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`cn-${s?.id ?? "new"}`}>Contact name</label>
        <input id={`cn-${s?.id ?? "new"}`} name="contactName" defaultValue={s?.contactName} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`ph-${s?.id ?? "new"}`}>Phone</label>
        <input id={`ph-${s?.id ?? "new"}`} name="phone" defaultValue={s?.phone} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`web-${s?.id ?? "new"}`}>Website</label>
        <input id={`web-${s?.id ?? "new"}`} name="website" defaultValue={s?.website} className="field" />
      </div>
      <div>
        <label className="label" htmlFor={`lt-${s?.id ?? "new"}`}>Typical days to ship</label>
        <input id={`lt-${s?.id ?? "new"}`} name="leadTimeDays" type="number" min={1} max={365} defaultValue={s?.leadTimeDays ?? ""} className="field" />
      </div>
      <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold">
        <input type="checkbox" name="blindShip" defaultChecked={s?.blindShip} className="h-5 w-5" />
        Confirmed in writing: ships blind (no supplier branding)
      </label>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`nt-${s?.id ?? "new"}`}>Notes (terms, discount, account number, proof turnaround)</label>
        <textarea id={`nt-${s?.id ?? "new"}`} name="notes" rows={3} defaultValue={s?.notes} className="field" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn btn-spruce" disabled={pending}>{pending ? "Saving…" : s ? "Save supplier" : "Add supplier"}</button>
        {state?.ok && <p role="status" className="font-semibold text-accent">{state.ok}</p>}
        {state?.error && <p role="alert" className="font-semibold text-blaze-deep">{state.error}</p>}
      </div>
    </form>
  );
}
