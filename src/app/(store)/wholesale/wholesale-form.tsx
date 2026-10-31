"use client";

import { useState } from "react";

const interests = ["Tent poles", "Rainflies & footprints", "Stakes", "Complete tents", "Jackets & snow gear"];
const buyers = ["Gear repair shop", "Outfitter or rental", "Scout troop or camp", "School or program", "Reseller", "Other"];

export function WholesaleForm() {
  const [state, setState] = useState<{ ok?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setState(null);
    try {
      const res = await fetch("/api/wholesale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          company: f.get("company"),
          email: f.get("email"),
          phone: f.get("phone"),
          buyerType: f.get("buyerType"),
          interest: f.getAll("interest"),
          quantity: f.get("quantity"),
          details: f.get("details"),
          website: f.get("website") || undefined,
        }),
      });
      const data = await res.json();
      setState(res.ok ? { ok: data.ok } : { error: data.error });
    } catch {
      setState({ error: "Couldn't send. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  if (state?.ok) {
    return <p className="rounded-[var(--radius-tag)] bg-lichen/60 p-6 text-lg font-semibold" role="status">{state.ok}</p>;
  }
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-[var(--radius-tag)] bg-snow p-6 sm:grid-cols-2">
      <div>
        <label htmlFor="name" className="label">Your name</label>
        <input id="name" name="name" required minLength={2} className="field" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="company" className="label">Business or group</label>
        <input id="company" name="company" className="field" autoComplete="organization" />
      </div>
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" required className="field" autoComplete="email" />
      </div>
      <div>
        <label htmlFor="phone" className="label">Phone (optional)</label>
        <input id="phone" name="phone" type="tel" className="field" autoComplete="tel" />
      </div>
      <div>
        <label htmlFor="buyerType" className="label">You are a</label>
        <select id="buyerType" name="buyerType" className="field" defaultValue="">
          <option value="">Choose one</option>
          {buyers.map((b) => <option key={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="quantity" className="label">Rough quantity</label>
        <input id="quantity" name="quantity" className="field" placeholder="e.g. 50 pole sets, 10 tents" />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="label">Interested in</legend>
        <div className="flex flex-wrap gap-2">
          {interests.map((i) => (
            <label key={i} className="flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-ice px-3 py-1.5 text-sm has-[:checked]:border-spruce has-[:checked]:bg-glacier">
              <input type="checkbox" name="interest" value={i} /> {i}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <label htmlFor="details" className="label">What do you need?</label>
        <textarea id="details" name="details" rows={5} required minLength={10} className="field" placeholder="Tent models, pole sizes, timing, delivery or pickup in Denver…" />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state?.error && <p className="text-sm text-blaze-deep sm:col-span-2" role="alert">{state.error}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className="btn btn-blaze w-full text-lg sm:w-auto">{busy ? "Sending…" : "Request a quote"}</button>
      </div>
    </form>
  );
}
