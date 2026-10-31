"use client";

import { useMemo, useState } from "react";
import { ArtworkUpload, type Artwork } from "./artwork-upload";
import { canopyEstimate, canopySizes, type CanopyConfig, type CanopySize, type Pricing } from "@/lib/custom-pricing";

const swatches = [
  { name: "Black", hex: "#1b1d1e" },
  { name: "Navy", hex: "#1d2f55" },
  { name: "Royal blue", hex: "#1f56b8" },
  { name: "Red", hex: "#c62828" },
  { name: "Blaze orange", hex: "#ff7a00" },
  { name: "Forest green", hex: "#1f5a3a" },
  { name: "Gray", hex: "#6b7378" },
  { name: "White", hex: "#f4f5f2" },
];
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/** 3/4 view of a pop-up canopy, drawn to the chosen size, with the logo on the valance, roof and walls. */
function CanopyPreview({ c, color, logo }: { c: CanopyConfig; color: string; logo?: string }) {
  const long = canopySizes.find((s) => s.id === c.size)!.longSide;
  const w = 150 + long * 17; // front width grows with length
  const x0 = 300 - w / 2;
  const x1 = x0 + w;
  const depth = 70;
  const top = 110;
  const valance = 26;
  const legTop = top + valance;
  const ground = 360;
  const dark = color === "#f4f5f2" ? "#c9ccc6" : `color-mix(in oklab, ${color} 70%, black)`;
  const light = color === "#f4f5f2" ? "#ffffff" : `color-mix(in oklab, ${color} 82%, white)`;
  const ink = color === "#f4f5f2" || color === "#ff7a00" ? "#13201c" : "#ffffff";
  const peak = { x: 300 + depth / 2, y: 40 };
  const back = { l: x0 + depth, r: x1 + depth, y: top - 28 };
  const logoImg = (x: number, y: number, ww: number, hh: number) =>
    logo ? <image href={logo} x={x} y={y} width={ww} height={hh} preserveAspectRatio="xMidYMid meet" /> : (
      <text x={x + ww / 2} y={y + hh / 2 + 6} textAnchor="middle" fontSize={Math.min(hh * 0.8, 22)} fontWeight="800" fill={ink} opacity=".85">YOUR LOGO</text>
    );
  const half = c.halfWalls > 0;

  return (
    <svg viewBox="0 0 640 400" className="h-full w-full" role="img" aria-label={`Preview of a ${c.size} canopy`}>
      <defs>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".08" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient>
      </defs>
      <ellipse cx={300 + depth / 2} cy={ground + 8} rx={w / 2 + 60} ry="18" fill="url(#ground)" />
      {/* back legs */}
      <path d={`M${back.l} ${back.y + valance}V${ground - 30}M${back.r} ${back.y + valance}V${ground - 30}`} stroke="#8a9196" strokeWidth="5" />
      {/* back wall */}
      {c.backWall && (
        <g>
          <path d={`M${back.l} ${back.y + valance}H${back.r}V${ground - 30}H${back.l}Z`} fill={dark} />
          {logoImg(back.l + (back.r - back.l) * 0.25, back.y + valance + 30, (back.r - back.l) * 0.5, 90)}
        </g>
      )}
      {/* right side wall */}
      {c.sideWalls > 0 && <path d={`M${x1} ${legTop}L${back.r} ${back.y + valance}V${ground - 30}L${x1} ${ground}Z`} fill={dark} opacity=".92" />}
      {c.sideWalls > 1 && <path d={`M${x0} ${legTop}L${back.l} ${back.y + valance}V${ground - 30}L${x0} ${ground}Z`} fill={dark} opacity=".75" />}
      {/* roof */}
      <path d={`M${x0} ${top}L${peak.x} ${peak.y}L${x1} ${top}Z`} fill={light} />
      <path d={`M${x1} ${top}L${peak.x} ${peak.y}L${back.r} ${back.y}Z`} fill={dark} />
      {logoImg(300 - w * 0.18, top - 46, w * 0.36, 34)}
      {/* front valance */}
      <path d={`M${x0} ${top}H${x1}V${legTop}H${x0}Z`} fill={color} />
      {logoImg(x0 + 12, top + 3, w - 24, valance - 6)}
      {/* side valance */}
      <path d={`M${x1} ${top}L${back.r} ${back.y}V${back.y + valance}L${x1} ${legTop}Z`} fill={dark} />
      {/* front legs */}
      <path d={`M${x0} ${legTop}V${ground}M${x1} ${legTop}V${ground}`} stroke={c.frame === "aluminum" ? "#c5ccd1" : "#8a9196"} strokeWidth={c.frame === "aluminum" ? 8 : 6} strokeLinecap="round" />
      {/* half walls across the front */}
      {half && (
        <g>
          <path d={`M${x0} ${ground - 60}H${x1}V${ground}H${x0}Z`} fill={color} opacity=".95" />
          <path d={`M${x0} ${ground - 60}H${x1}`} stroke="#c5ccd1" strokeWidth="3" />
          {logoImg(x0 + w * 0.3, ground - 52, w * 0.4, 44)}
        </g>
      )}
      <text x="600" y="390" textAnchor="end" fontSize="12" fill="currentColor" opacity=".6">Preview only · the printer sends an exact proof</text>
    </svg>
  );
}

export function CanopyBuilder({ pricing }: { pricing: Pricing }) {
  const [c, setC] = useState<CanopyConfig>({ size: "10x10", frame: "steel", backWall: false, sideWalls: 0, halfWalls: 0, quantity: 1, canopyColor: "Black", printNotes: "" });
  const [hex, setHex] = useState(swatches[0].hex);
  const [art, setArt] = useState<Artwork[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const est = useMemo(() => canopyEstimate(c, pricing), [c, pricing]);
  const set = <K extends keyof CanopyConfig>(k: K, v: CanopyConfig[K]) => setC((p) => ({ ...p, [k]: v }));
  const logo = art.find((a) => a.preview)?.preview;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!art.length) {
      setError("Upload your logo or artwork first.");
      return;
    }
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/custom/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "canopy",
          config: c,
          artwork: art.map(({ url, name }) => ({ url, name })),
          name: f.get("name"),
          company: f.get("company"),
          email: f.get("email"),
          phone: f.get("phone"),
          neededBy: f.get("neededBy"),
          note: f.get("note"),
          website: f.get("website"),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { link?: string; error?: string };
      if (!res.ok || !json.link) throw new Error(json.error ?? "Something went wrong. Try again.");
      window.location.href = json.link;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const chip = (on: boolean) =>
    `press rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition ${on ? "border-blaze bg-blaze text-ink" : "border-line bg-card hover:border-accent"}`;

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-24 lg:h-fit">
        <div className="neon-edge aspect-[16/10] overflow-hidden rounded-[var(--radius-tag)] bg-card p-2 text-fg">
          <CanopyPreview c={c} color={hex} logo={logo} />
        </div>
        <div className="mt-4 rounded-[var(--radius-tag)] bg-spruce p-5 text-glacier">
          <p className="text-sm text-glacier/75">Estimate{c.quantity > 1 ? ` for ${c.quantity} tents` : ""}</p>
          <p className="display text-6xl">{money(est.total)}</p>
          <p className="mt-1 text-sm text-glacier/80">
            {money(est.each)} per tent{est.percentOff ? `, ${est.percentOff}% quantity discount applied` : ""}. Final price comes with your
            proof; nothing is charged until you approve it.
          </p>
        </div>
      </div>

      <div className="space-y-7">
        <fieldset>
          <legend className="label">Size</legend>
          <div className="flex flex-wrap gap-2">
            {canopySizes.map((s) => (
              <button type="button" key={s.id} className={chip(c.size === s.id)} aria-pressed={c.size === s.id} onClick={() => set("size", s.id as CanopySize)}>
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Frame</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip(c.frame === "steel")} aria-pressed={c.frame === "steel"} onClick={() => set("frame", "steel")}>Steel (events, markets)</button>
            <button type="button" className={chip(c.frame === "aluminum")} aria-pressed={c.frame === "aluminum"} onClick={() => set("frame", "aluminum")}>
              Commercial aluminum (+{money(pricing.canopy.aluminumFrame[c.size])})
            </button>
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Canopy color</legend>
          <div className="flex flex-wrap gap-2">
            {swatches.map((s) => (
              <button
                type="button"
                key={s.name}
                title={s.name}
                aria-label={s.name}
                aria-pressed={hex === s.hex}
                onClick={() => {
                  setHex(s.hex);
                  set("canopyColor", s.name);
                }}
                className={`press h-10 w-10 rounded-full border-2 ${hex === s.hex ? "border-blaze ring-2 ring-blaze/40" : "border-line"}`}
                style={{ background: s.hex }}
              />
            ))}
          </div>
          <p className="mt-1 text-sm text-muted">{c.canopyColor}. Need a Pantone match? Add it in the print notes.</p>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="label sm:col-span-3">Walls</legend>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" className="h-5 w-5" checked={c.backWall} onChange={(e) => set("backWall", e.target.checked)} />
            Printed back wall (+{money(pricing.canopy.backWall[c.size])})
          </label>
          <div>
            <label className="text-sm font-semibold" htmlFor="sw">Full side walls (+{money(pricing.canopy.sideWall)} each)</label>
            <select id="sw" className="field mt-1" value={c.sideWalls} onChange={(e) => set("sideWalls", Number(e.target.value))}>
              {[0, 1, 2].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="hw">Half walls (+{money(pricing.canopy.halfWall)} each)</label>
            <select id="hw" className="field mt-1" value={c.halfWalls} onChange={(e) => set("halfWalls", Number(e.target.value))}>
              {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="qty">How many tents</label>
          <input id="qty" type="number" min={1} max={50} value={c.quantity} onChange={(e) => set("quantity", Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="field w-32" />
          {pricing.canopy.quantityTiers.length > 0 && (
            <p className="mt-1 text-sm text-muted">{pricing.canopy.quantityTiers.map(([min, pct]) => `${min}+ tents: ${pct}% off`).join(" · ")}</p>
          )}
        </div>
        <div>
          <p className="label">Logo and artwork</p>
          <ArtworkUpload files={art} onChange={setArt} />
        </div>
        <div>
          <label className="label" htmlFor="printNotes">Print notes</label>
          <textarea id="printNotes" rows={3} maxLength={1000} className="field" value={c.printNotes} onChange={(e) => set("printNotes", e.target.value)} placeholder="Logo on all four valances, website on the back wall, Pantone 021 C…" />
        </div>

        <fieldset className="grid gap-3 rounded-[var(--radius-tag)] bg-card p-5 sm:grid-cols-2">
          <legend className="display px-1 text-2xl">Where to send your proof</legend>
          <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" required maxLength={120} className="field" autoComplete="name" /></div>
          <div><label className="label" htmlFor="company">Business or team</label><input id="company" name="company" maxLength={120} className="field" autoComplete="organization" /></div>
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required maxLength={200} className="field" autoComplete="email" /></div>
          <div><label className="label" htmlFor="phone">Phone (optional)</label><input id="phone" name="phone" maxLength={40} className="field" autoComplete="tel" /></div>
          <div><label className="label" htmlFor="neededBy">Needed by (optional)</label><input id="neededBy" name="neededBy" type="date" className="field" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="note">Anything else</label><textarea id="note" name="note" rows={2} maxLength={2000} className="field" /></div>
          <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <button className="btn btn-blaze h-12 px-7 text-lg" disabled={busy}>{busy ? "Sending…" : "Request my proof"}</button>
          <p className="text-sm text-muted">Proof and final price in about 2 business days. No payment now.</p>
        </div>
        {error && <p role="alert" className="font-semibold text-blaze-deep">{error}</p>}
      </div>
    </form>
  );
}
