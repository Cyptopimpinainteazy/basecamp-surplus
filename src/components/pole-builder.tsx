"use client";

import { useState } from "react";
import { poleDiameters, polePrice, poleSpec, type PoleSpecInput, type Pricing } from "@/lib/custom-pricing";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const blank = (): PoleSpecInput => ({ label: "", shape: "straight", lengthIn: 120, sections: 8, diameterMm: 8.7, quantity: 1 });

/** One pole drawn to scale: shock-corded sections with ferrules, bent if pre-bent, legs off a hub if a hub. */
function PoleDrawing({ p }: { p: PoleSpecInput }) {
  const W = 560;
  const scale = Math.min(W / Math.max(p.lengthIn, 1), 6);
  const sec = (p.lengthIn / p.sections) * scale;
  const thick = 3 + (p.diameterMm - 7.9) * 1.1;
  if (p.shape === "hub") {
    const legs = p.hubLegs ?? 4;
    const len = Math.min(175, 90 + p.lengthIn);
    return (
      <svg viewBox="-190 -190 380 380" className="h-48 w-full" aria-hidden>
        {Array.from({ length: legs }, (_, i) => {
          const a = (i / legs) * Math.PI * 2 - Math.PI / 2;
          return (
            <g key={i}>
              <line x1="0" y1="0" x2={Math.cos(a) * len} y2={Math.sin(a) * len} stroke="#a7b2b8" strokeWidth={thick} strokeLinecap="round" />
              {Array.from({ length: p.sections - 1 }, (_, k) => {
                const t = ((k + 1) / p.sections) * len;
                return <circle key={k} cx={Math.cos(a) * t} cy={Math.sin(a) * t} r={thick * 0.75} fill="#5b6670" />;
              })}
            </g>
          );
        })}
        <circle r="16" fill="#c9a24a" stroke="#13201c" strokeOpacity=".3" />
      </svg>
    );
  }
  const bend = p.shape === "prebent";
  return (
    <svg viewBox={`0 0 ${W + 20} 70`} className="h-16 w-full" aria-hidden>
      {Array.from({ length: p.sections }, (_, i) => {
        const x = 10 + i * sec;
        const y = bend ? 50 - Math.sin((i / Math.max(p.sections - 1, 1)) * Math.PI) * 30 : 35;
        const y2 = bend ? 50 - Math.sin(((i + 1) / Math.max(p.sections - 1, 1)) * Math.PI) * 30 : 35;
        return (
          <g key={i}>
            <line x1={x + 1} y1={y} x2={x + sec - 1} y2={bend ? (y + y2) / 2 : y} stroke={i % 2 ? "#c9a24a" : "#a7b2b8"} strokeWidth={thick} strokeLinecap="round" />
            {i < p.sections - 1 && <rect x={x + sec - 4} y={(bend ? (y + y2) / 2 : y) - thick * 0.7} width="6" height={thick * 1.4} rx="1.5" fill="#5b6670" />}
          </g>
        );
      })}
    </svg>
  );
}

export function PoleBuilder({ pricing }: { pricing: Pricing }) {
  const [poles, setPoles] = useState<PoleSpecInput[]>([blank()]);
  const [tent, setTent] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const checks = poles.map((p) => poleSpec.safeParse(p));
  const total = poles.reduce((s, p, i) => s + (checks[i].success ? polePrice(p, pricing) * p.quantity : 0), 0);
  const valid = checks.every((c) => c.success);
  const update = (i: number, patch: Partial<PoleSpecInput>) => setPoles((all) => all.map((p, k) => (k === i ? { ...p, ...patch } : p)));

  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/custom/poles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ build: { tent, notes, poles } }),
      });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout didn't start. Try again.");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout didn't start.");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="tent">Tent it&apos;s for (optional)</label>
          <input id="tent" value={tent} onChange={(e) => setTent(e.target.value)} maxLength={80} className="field" placeholder="North Face Stormbreak 2, 2019" />
        </div>
        {poles.map((p, i) => {
          const check = checks[i];
          const issue = check.success ? null : check.error.issues[0]?.message;
          return (
            <fieldset key={i} className="tag-card space-y-4 p-5">
              <legend className="sr-only">Pole {i + 1}</legend>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="display text-3xl">Pole {i + 1}</p>
                <div className="flex items-center gap-4">
                  <span className="display text-3xl">{check.success ? money(polePrice(p, pricing) * p.quantity) : "—"}</span>
                  {poles.length > 1 && (
                    <button type="button" className="text-sm text-muted underline" onClick={() => setPoles((all) => all.filter((_, k) => k !== i))}>Remove</button>
                  )}
                </div>
              </div>
              <div className="rounded-md bg-page px-2 text-fg"><PoleDrawing p={p} /></div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold" htmlFor={`shape${i}`}>Type</label>
                  <select id={`shape${i}`} className="field mt-1" value={p.shape} onChange={(e) => update(i, { shape: e.target.value as PoleSpecInput["shape"], hubLegs: e.target.value === "hub" ? p.hubLegs ?? 4 : undefined })}>
                    <option value="straight">Straight pole</option>
                    <option value="prebent">Pre-bent pole</option>
                    <option value="hub">Hub assembly</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold" htmlFor={`len${i}`}>{p.shape === "hub" ? "Leg length (in)" : "Length (in)"}</label>
                  <input id={`len${i}`} type="number" step="0.25" min={12} max={240} className="field mt-1" value={p.lengthIn} onChange={(e) => update(i, { lengthIn: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm font-semibold" htmlFor={`sec${i}`}>Sections</label>
                  <input id={`sec${i}`} type="number" min={2} max={14} className="field mt-1" value={p.sections} onChange={(e) => update(i, { sections: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm font-semibold" htmlFor={`dia${i}`}>Diameter</label>
                  <select id={`dia${i}`} className="field mt-1" value={p.diameterMm} onChange={(e) => update(i, { diameterMm: Number(e.target.value) })}>
                    {poleDiameters.map((d) => <option key={d} value={d}>{d} mm</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold" htmlFor={`qty${i}`}>Qty</label>
                  <input id={`qty${i}`} type="number" min={1} max={12} className="field mt-1" value={p.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) })} />
                </div>
                {p.shape === "hub" && (
                  <div>
                    <label className="text-sm font-semibold" htmlFor={`legs${i}`}>Hub legs</label>
                    <input id={`legs${i}`} type="number" min={3} max={6} className="field mt-1" value={p.hubLegs ?? 4} onChange={(e) => update(i, { hubLegs: Number(e.target.value) })} />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold" htmlFor={`lab${i}`}>Label (optional)</label>
                  <input id={`lab${i}`} maxLength={40} className="field mt-1" value={p.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Main, fly, brow…" />
                </div>
              </div>
              <p className={`text-sm ${issue ? "font-semibold text-blaze-deep" : "text-muted"}`}>
                {issue ?? `${(p.lengthIn / p.sections).toFixed(1)} in sections · ${p.lengthIn} in assembled${p.shape === "hub" ? " per leg" : ""}`}
              </p>
            </fieldset>
          );
        })}
        {poles.length < 12 && (
          <button type="button" className="btn btn-line" onClick={() => setPoles((all) => [...all, { ...all[all.length - 1], label: "" }])}>
            + Add another pole
          </button>
        )}
        <div>
          <label className="label" htmlFor="notes">Notes for the shop (optional)</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} className="field" placeholder="Match the gray anodizing if you can. Ball tips on both ends." />
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="rounded-[var(--radius-tag)] bg-spruce p-5 text-glacier">
          <p className="text-sm text-glacier/75">{poles.reduce((s, p) => s + p.quantity, 0)} pole{poles.reduce((s, p) => s + p.quantity, 0) === 1 ? "" : "s"}, built to order</p>
          <p className="display text-6xl">{money(total)}</p>
          <p className="mt-1 text-sm text-glacier/80">Plus shipping and any tax at checkout. Built in Denver in 3–5 business days, then shipped in a rigid tube.</p>
          <button type="button" className="btn btn-blaze mt-4 w-full" disabled={!valid || busy} onClick={checkout}>
            {busy ? "Starting checkout…" : valid ? "Checkout" : "Fix the measurements"}
          </button>
          {error && <p role="alert" className="mt-3 rounded bg-blaze/20 p-2 text-sm font-semibold">{error}</p>}
        </div>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          <li><strong className="text-fg">Measure assembled,</strong> tip to tip, pole laid straight. Pre-bent: along the curve.</li>
          <li><strong className="text-fg">Diameter</strong> is usually printed near a joint (8.7, 9.5…). Not sure? Use our <a href="/poles/photo" className="underline">photo matcher</a>.</li>
          <li><strong className="text-fg">Know your tent?</strong> Check <a href="/parts" className="underline">factory poles in stock</a> first.</li>
        </ul>
      </aside>
    </div>
  );
}
