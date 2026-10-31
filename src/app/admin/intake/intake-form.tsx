"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { uploadPhotos } from "./upload";

type Shot = { id: string; file: File; preview: string };
type Brand = { slug: string; name: string };
type Option = { value: string; label: string };

export function IntakeForm({ brands, categories, conditions }: { brands: Brand[]; categories: Option[]; conditions: Option[] }) {
  const router = useRouter();
  const [shots, setShots] = useState<Shot[]>([]);
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading" | "writing">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
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
  const move = (i: number, d: -1 | 1) =>
    setShots((cur) => {
      const n = [...cur];
      const j = i + d;
      if (j < 0 || j >= n.length) return cur;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  async function generate() {
    if (shots.length === 0) return;
    setError("");
    setPhase("uploading");
    setProgress(0);
    try {
      const uploaded = await uploadPhotos(shots.map((x) => x.file), setProgress);
      setPhase("writing");
      const res = await fetch("/api/admin/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: uploaded,
          brandHint: brand || undefined,
          categoryHint: category || undefined,
          conditionHint: condition || undefined,
          notes: notes || undefined,
          quantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Listing generation failed.");
      router.push(`/admin/products/${data.id}?new=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => camera.current?.click()} disabled={busy} className="btn btn-blaze text-lg">
            Take photos
          </button>
          <button type="button" onClick={() => library.current?.click()} disabled={busy} className="btn btn-spruce">
            Choose from library
          </button>
          <input ref={camera} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <input ref={library} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </div>
        <p className="mt-3 text-sm text-granite">
          Shoot the front, back, every tag (brand, size, care, price), and any flaws. For poles, get the printed sleeve label. Up to 12 photos; the first one is the cover.
        </p>

        <div
          className="mt-5 min-h-48 rounded-[var(--radius-tag)] border-2 border-dashed border-ice bg-snow p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          {shots.length === 0 ? (
            <p className="grid h-44 place-items-center text-granite">Photos you add show up here. You can also drop files.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {shots.map((s, i) => (
                <li key={s.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.preview} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-md object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-blaze px-1.5 text-xs font-bold">Cover</span>}
                  <div className="mt-1 flex justify-between text-xs">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || busy} className="px-1 underline disabled:opacity-30" aria-label="Move earlier">Earlier</button>
                    <button type="button" onClick={() => setShots((c) => c.filter((x) => x.id !== s.id))} disabled={busy} className="px-1 underline">Remove</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === shots.length - 1 || busy} className="px-1 underline disabled:opacity-30" aria-label="Move later">Later</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-tag)] bg-snow p-5">
        <p className="text-granite">Optional hints. Leave blank and the AI reads it from the photos.</p>
        <div>
          <label className="label" htmlFor="brand">Brand</label>
          <select id="brand" className="field" value={brand} onChange={(e) => {
            setBrand(e.target.value);
            if (e.target.value === "Patagonia" && !condition) setCondition("used_good");
          }}>
            <option value="">Detect from photos</option>
            {brands.map((b) => <option key={b.slug} value={b.name}>{b.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Detect</option>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="qty">Quantity</label>
            <input id="qty" type="number" min={1} max={999} className="field" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="condition">Condition</label>
          <select id="condition" className="field" value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">Detect (Patagonia defaults to used, good)</option>
            {conditions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes for the AI</label>
          <textarea id="notes" rows={3} className="field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. small mark on left cuff; pole is the brow pole" />
        </div>
        {error && <p className="rounded-md bg-blaze/15 p-3 text-sm">{error}</p>}
        <button type="button" onClick={generate} disabled={busy || shots.length === 0} className="btn btn-blaze w-full text-lg">
          {phase === "uploading" ? `Uploading photos ${progress}%` : phase === "writing" ? "Writing the listing…" : "Write the listing"}
        </button>
        <p className="text-sm text-granite">
          Creates a draft with title, description, specs, SEO, keywords and a price checked against eBay. You review it before it goes live.
        </p>
      </section>
    </div>
  );
}
