"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fetchRates, purchaseLabel } from "../../actions";

type Rate = { id: string; carrier: string; service: string; amount: string; days: number | null };

export function ShipPanel(props: {
  orderId: string;
  configured: boolean;
  defaultPreset: string;
  defaultWeightOz: number;
  presets: { id: string; name: string }[];
  label: { url: string; tracking: string; trackingUrl: string; carrier: string } | null;
}) {
  const [preset, setPreset] = useState(props.defaultPreset);
  const [weight, setWeight] = useState(props.defaultWeightOz);
  const [rates, setRates] = useState<Rate[] | null>(null);
  const [chosen, setChosen] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [label, setLabel] = useState(props.label);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (label) {
    return (
      <section className="h-fit rounded-[var(--radius-tag)] bg-card p-5">
        <h2 className="display text-3xl">Label ready</h2>
        <p className="mt-2">{label.carrier}</p>
        <p className="font-mono">{label.tracking}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={label.url} target="_blank" rel="noreferrer" className="btn btn-blaze">Print label</a>
          {label.trackingUrl && <a href={label.trackingUrl} target="_blank" rel="noreferrer" className="btn btn-line">Track</a>}
        </div>
        {msg?.ok && <p className="mt-3 text-sm text-accent">{msg.ok}</p>}
      </section>
    );
  }

  if (!props.configured) {
    return (
      <section className="h-fit rounded-[var(--radius-tag)] bg-card p-5">
        <h2 className="display text-3xl">Buy a label</h2>
        <p className="mt-2 text-muted">Add SHIPPO_API_TOKEN and your ship-from address in the environment settings to buy discounted USPS, UPS and FedEx labels here.</p>
      </section>
    );
  }

  return (
    <section className="h-fit rounded-[var(--radius-tag)] bg-card p-5">
      <h2 className="display text-3xl">Buy a label</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div>
          <label htmlFor="preset" className="label">Box</label>
          <select id="preset" className="field" value={preset} onChange={(e) => { setPreset(e.target.value); setRates(null); }}>
            {props.presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="weight" className="label">Item weight (oz)</label>
          <input id="weight" type="number" min={1} className="field" value={weight} onChange={(e) => { setWeight(Number(e.target.value) || 1); setRates(null); }} />
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">Box weight is added automatically.</p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const r = await fetchRates(props.orderId, preset, weight);
            if ("error" in r && r.error) setMsg({ error: r.error });
            else if ("rates" in r && r.rates) {
              setRates(r.rates);
              setChosen(r.rates[0]?.id ?? "");
            }
          })
        }
        className="btn btn-spruce mt-4"
      >
        {pending && !rates ? "Getting rates…" : "Get rates"}
      </button>

      {rates && (
        <fieldset className="mt-5">
          <legend className="label">Pick a rate</legend>
          {rates.length === 0 && <p className="text-muted">No rates came back. Check the address and box size.</p>}
          <ul className="space-y-2">
            {rates.map((r) => (
              <li key={r.id}>
                <label className={`flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] px-3 py-2.5 ${chosen === r.id ? "border-accent bg-page" : "border-line"}`}>
                  <input type="radio" name="rate" checked={chosen === r.id} onChange={() => setChosen(r.id)} />
                  <span className="flex-1">{r.carrier} {r.service}{r.days ? <span className="text-muted"> · {r.days} day{r.days === 1 ? "" : "s"}</span> : null}</span>
                  <span className="font-semibold">${Number(r.amount).toFixed(2)}</span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={!chosen || pending}
            onClick={() =>
              start(async () => {
                const r = await purchaseLabel(props.orderId, chosen, preset);
                if (r.error) setMsg({ error: r.error });
                else {
                  const rate = rates.find((x) => x.id === chosen);
                  setLabel({ url: r.labelUrl!, tracking: "", trackingUrl: "", carrier: `${rate?.carrier ?? ""} ${rate?.service ?? ""}` });
                  setMsg({ ok: r.ok });
                  window.open(r.labelUrl, "_blank");
                  router.refresh();
                }
              })
            }
            className="btn btn-blaze mt-4 w-full"
          >
            {pending ? "Buying label…" : "Buy label & email tracking"}
          </button>
        </fieldset>
      )}
      {msg?.error && <p className="mt-3 rounded-md bg-blaze/10 p-2 text-sm">{msg.error}</p>}
    </section>
  );
}
