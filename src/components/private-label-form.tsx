"use client";

import { useState } from "react";
import { ArtworkUpload, type Artwork } from "./artwork-upload";
import type { PrivateLabelConfig } from "@/lib/custom-pricing";

const styles: { id: PrivateLabelConfig["style"]; label: string; note: string }[] = [
  { id: "backpacking", label: "Backpacking tent", note: "1–3 person, light, freestanding or semi" },
  { id: "family", label: "Family / car camping", note: "4–8 person, standing height" },
  { id: "canopy", label: "Pop-up canopy", note: "Branded event and vendor tents in bulk" },
  { id: "other", label: "Something else", note: "Rooftop, bell tent, shelters…" },
];
const branding: { id: PrivateLabelConfig["branding"][number]; label: string }[] = [
  { id: "fly", label: "Logo on the rainfly" },
  { id: "body", label: "Logo on the tent body" },
  { id: "bag", label: "Printed stuff sack" },
  { id: "packaging", label: "Custom retail box" },
  { id: "poles", label: "Printed poles" },
];

export function PrivateLabelForm() {
  const [style, setStyle] = useState<PrivateLabelConfig["style"]>("backpacking");
  const [brand, setBrand] = useState<PrivateLabelConfig["branding"]>(["fly", "bag"]);
  const [art, setArt] = useState<Artwork[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/custom/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "private_label",
          config: {
            style,
            branding: brand,
            quantity: Number(f.get("quantity")),
            colors: f.get("colors"),
            targetPrice: f.get("targetPrice"),
            details: f.get("details"),
          },
          artwork: art.map(({ url, name }) => ({ url, name })),
          name: f.get("name"),
          company: f.get("company"),
          email: f.get("email"),
          phone: f.get("phone"),
          neededBy: f.get("neededBy"),
          website: f.get("website"),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { link?: string; error?: string };
      if (!res.ok || !json.link) throw new Error(json.error ?? "Something went wrong.");
      window.location.href = json.link;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <fieldset>
        <legend className="label">Tent style</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {styles.map((s) => (
            <button
              type="button"
              key={s.id}
              aria-pressed={style === s.id}
              onClick={() => setStyle(s.id)}
              className={`press tag-card p-4 text-left transition ${style === s.id ? "ring-2 ring-blaze" : "hover:-translate-y-0.5"}`}
            >
              <span className="display block text-2xl">{s.label}</span>
              <span className="text-sm text-muted">{s.note}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Where your brand goes</legend>
        <div className="flex flex-wrap gap-2">
          {branding.map((b) => {
            const on = brand.includes(b.id);
            return (
              <button
                type="button"
                key={b.id}
                aria-pressed={on}
                onClick={() => setBrand((all) => (on ? all.filter((x) => x !== b.id) : [...all, b.id]))}
                className={`press rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold ${on ? "border-blaze bg-blaze text-ink" : "border-line bg-card"}`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="quantity">Quantity</label>
          <input id="quantity" name="quantity" type="number" min={50} max={100000} defaultValue={300} required className="field" />
          <p className="mt-1 text-xs text-muted">Factories usually start at 100–500 per design.</p>
        </div>
        <div><label className="label" htmlFor="colors">Colors</label><input id="colors" name="colors" maxLength={200} className="field" placeholder="Olive fly, gray body" /></div>
        <div><label className="label" htmlFor="targetPrice">Target price per tent</label><input id="targetPrice" name="targetPrice" maxLength={60} className="field" placeholder="$90 landed" /></div>
      </div>
      <div>
        <label className="label" htmlFor="details">Details</label>
        <textarea id="details" name="details" rows={4} maxLength={2000} className="field" placeholder="Weight target, waterproof rating, a reference tent you like, retail or giveaway…" />
      </div>
      <div>
        <p className="label">Logo (optional now)</p>
        <ArtworkUpload files={art} onChange={setArt} />
      </div>
      <fieldset className="grid gap-3 rounded-[var(--radius-tag)] bg-card p-5 sm:grid-cols-2">
        <legend className="display px-1 text-2xl">Your details</legend>
        <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" required maxLength={120} className="field" autoComplete="name" /></div>
        <div><label className="label" htmlFor="company">Company</label><input id="company" name="company" required maxLength={120} className="field" autoComplete="organization" /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="field" autoComplete="email" /></div>
        <div><label className="label" htmlFor="phone">Phone (optional)</label><input id="phone" name="phone" maxLength={40} className="field" autoComplete="tel" /></div>
        <div><label className="label" htmlFor="neededBy">In hand by (optional)</label><input id="neededBy" name="neededBy" type="date" className="field" /></div>
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      </fieldset>
      <button className="btn btn-blaze h-12 px-7 text-lg" disabled={busy || brand.length === 0}>{busy ? "Sending…" : "Request a factory quote"}</button>
      {error && <p role="alert" className="font-semibold text-blaze-deep">{error}</p>}
    </form>
  );
}
