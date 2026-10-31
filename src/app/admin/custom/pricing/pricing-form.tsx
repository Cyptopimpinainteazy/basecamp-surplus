"use client";

import { useActionState } from "react";
import type { Pricing } from "@/lib/custom-pricing";
import { savePricingAction, type ActionState } from "../../dropship-actions";

const d = (c: number) => (c / 100).toFixed(2);
const sizes = ["10x10", "10x15", "10x20"] as const;

function Money({ name, label, value }: { name: string; label: string; value: number }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <div className="flex items-center gap-1"><span className="text-muted">$</span><input id={name} name={name} inputMode="decimal" defaultValue={d(value)} className="field" /></div>
    </div>
  );
}

export function PricingForm({ p }: { p: Pricing }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePricingAction, null);
  const tiers = [...p.canopy.quantityTiers, [0, 0], [0, 0], [0, 0]].slice(0, 3) as [number, number][];
  return (
    <form action={action} className="space-y-6">
      <section className="rounded-[var(--radius-tag)] bg-card p-5">
        <h2 className="display text-3xl">Logo canopies (customer prices, per tent)</h2>
        <p className="mt-1 text-sm text-muted">These drive the live estimate on the builder. You still set the final price on each quote.</p>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="py-2">Size</th><th>Printed top + valances, steel frame</th><th>Aluminum frame upgrade</th><th>Full back wall</th></tr></thead>
          <tbody>
            {sizes.map((s) => (
              <tr key={s} className="align-top">
                <td className="py-2 font-semibold">{s.replace("x", " × ")} ft</td>
                {(["top", "alu", "back"] as const).map((k) => (
                  <td key={k} className="py-2 pr-3">
                    <label className="sr-only" htmlFor={`${k}_${s}`}>{k} {s}</label>
                    <div className="flex items-center gap-1"><span className="text-muted">$</span><input id={`${k}_${s}`} name={`${k}_${s}`} inputMode="decimal" defaultValue={d(k === "top" ? p.canopy.top[s] : k === "alu" ? p.canopy.aluminumFrame[s] : p.canopy.backWall[s])} className="field" /></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Money name="sideWall" label="Full side wall (10 ft), each" value={p.canopy.sideWall} />
          <Money name="halfWall" label="Half wall (10 ft run), each" value={p.canopy.halfWall} />
        </div>
        <p className="label mt-5">Quantity discounts</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {tiers.map(([min, pct], i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <input aria-label={`Tier ${i + 1} minimum tents`} name={`tierMin${i + 1}`} type="number" min={0} defaultValue={min || ""} className="field w-20" placeholder="—" />
              <span>+ tents get</span>
              <input aria-label={`Tier ${i + 1} percent off`} name={`tierPct${i + 1}`} type="number" min={0} max={59} defaultValue={pct || ""} className="field w-20" placeholder="—" />
              <span>% off</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-tag)] bg-card p-5">
        <h2 className="display text-3xl">Custom-cut poles (your shop prices)</h2>
        <p className="mt-1 text-sm text-muted">Price of one pole = per pole + per section × sections (+ extras). A hub assembly = hub + one pole price per leg.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Money name="perPole" label="Per pole (labor, tips, cord ends)" value={p.poles.perPole} />
          <Money name="perSection" label="Per section" value={p.poles.perSection} />
          <Money name="heavyTubePerSection" label="Extra per section, 9.5 mm and up" value={p.poles.heavyTubePerSection} />
          <Money name="prebentPerSection" label="Extra per section, pre-bent" value={p.poles.prebentPerSection} />
          <Money name="hub" label="Per hub (casting + assembly)" value={p.poles.hub} />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn btn-blaze" disabled={pending}>{pending ? "Saving…" : "Save prices"}</button>
        {state?.ok && <p role="status" className="font-semibold text-accent">{state.ok}</p>}
        {state?.error && <p role="alert" className="font-semibold text-blaze-deep">{state.error}</p>}
      </div>
    </form>
  );
}
