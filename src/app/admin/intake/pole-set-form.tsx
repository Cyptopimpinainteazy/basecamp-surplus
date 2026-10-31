"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { uploadPhotos } from "./upload";

type Shot = { id: string; file: File; preview: string };
type Result = { ids: string[]; tent: string; uncertainties: string[] };

export function PoleSetForm() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [tentHint, setTentHint] = useState("");
  const [sets, setSets] = useState(1);
  const [condition, setCondition] = useState("new_without_tags");
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading" | "reading">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Result[]>([]);
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);

  useEffect(() => () => shots.forEach((s) => URL.revokeObjectURL(s.preview)), [shots]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files)
      .filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name))
      .map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }));
    setShots((cur) => [...cur, ...next].slice(0, 12));
  };

  async function submit() {
    if (!shots.length) return;
    setError("");
    setPhase("uploading");
    setProgress(0);
    try {
      const images = await uploadPhotos(shots.map((s) => s.file), setProgress);
      setPhase("reading");
      const res = await fetch("/api/admin/pole-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, tentHint: tentHint || undefined, notes: notes || undefined, sets, condition }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Pole set reading failed.");
      setDone((d) => [data as Result, ...d]);
      // Ready for the next tent's kit.
      setShots([]);
      setTentHint("");
      setNotes("");
      setSets(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section>
        <div className="rounded-[var(--radius-tag)] bg-lichen/45 p-4">
          <p className="font-semibold">One photo per tent model</p>
          <p className="mt-1 text-sm">
            Lay that tent&apos;s poles out side by side, fully assembled, with a tape measure stretched along them and the pole
            labels facing up. Add a close-up of any label. Every distinct pole becomes its own draft listing.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => camera.current?.click()} disabled={busy} className="btn btn-blaze text-lg">Take photos</button>
          <button type="button" onClick={() => library.current?.click()} disabled={busy} className="btn btn-spruce">Choose from library</button>
          <input ref={camera} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <input ref={library} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </div>
        <ul className="mt-4 grid min-h-32 grid-cols-3 gap-3 rounded-[var(--radius-tag)] border-2 border-dashed border-line bg-card p-3 sm:grid-cols-4">
          {shots.length === 0 && <li className="col-span-full grid place-items-center text-muted">Photos of this pole kit show up here.</li>}
          {shots.map((s, i) => (
            <li key={s.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.preview} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-md object-cover" />
              <button type="button" disabled={busy} onClick={() => setShots((c) => c.filter((x) => x.id !== s.id))} className="mt-1 text-xs underline">Remove</button>
            </li>
          ))}
        </ul>

        {done.length > 0 && (
          <div className="mt-6 rounded-[var(--radius-tag)] bg-card p-4">
            <p className="font-semibold">Done this session</p>
            <ul className="mt-2 divide-y divide-line">
              {done.map((d, i) => (
                <li key={i} className="py-2 text-sm">
                  <span className="font-semibold">{d.tent}</span>: {d.ids.length} pole {d.ids.length === 1 ? "listing" : "listings"} drafted.{" "}
                  <Link href={`/admin/products/${d.ids[0]}`} className="underline">Review</Link>
                  {d.uncertainties.length > 0 && <span className="block text-blaze-deep">Check: {d.uncertainties.join("; ")}</span>}
                </li>
              ))}
            </ul>
            <Link href="/admin/products?status=draft" className="mt-2 inline-block text-sm font-semibold underline">Review all drafts and publish</Link>
          </div>
        )}
      </section>

      <section className="h-fit space-y-4 rounded-[var(--radius-tag)] bg-card p-5">
        <div>
          <label htmlFor="tentHint" className="label">Tent model (optional)</label>
          <input id="tentHint" value={tentHint} onChange={(e) => setTentHint(e.target.value)} className="field" placeholder="Read from labels if blank" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sets" className="label">Complete sets you have</label>
            <input id="sets" type="number" min={1} max={500} value={sets} onChange={(e) => setSets(Math.max(1, Number(e.target.value) || 1))} className="field" />
          </div>
          <div>
            <label htmlFor="cond" className="label">Condition</label>
            <select id="cond" value={condition} onChange={(e) => setCondition(e.target.value)} className="field">
              <option value="new_without_tags">New</option>
              <option value="used_excellent">Used, excellent</option>
              <option value="used_good">Used, good</option>
            </select>
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted">Stock for each pole = sets × how many of that pole one tent uses.</p>
        <div>
          <label htmlFor="pnotes" className="label">Notes for the AI</label>
          <textarea id="pnotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="field" placeholder="e.g. the two long gray poles are identical" />
        </div>
        {error && <p className="rounded-md bg-blaze/15 p-3 text-sm">{error}</p>}
        <button type="button" onClick={submit} disabled={busy || !shots.length} className="btn btn-blaze w-full text-lg">
          {phase === "uploading" ? `Uploading ${progress}%` : phase === "reading" ? "Reading the pole kit…" : "List this pole set"}
        </button>
        <p className="text-sm text-muted">Lengths are only filled in when the tape or a label is readable. Anything missing is flagged for you to check.</p>
      </section>
    </div>
  );
}
