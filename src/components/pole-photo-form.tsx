"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Picked = { id: string; preview: string; mediaType: "image/jpeg"; data: string };

const MAX_PHOTOS = 3;
const MAX_EDGE = 1568; // the vision model's sweet spot; larger photos cost more without reading better

/** Shrinks a photo to JPEG in the browser and returns it as base64 (no data: prefix). */
async function toJpeg(file: File): Promise<{ data: string; preview: string }> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const url = canvas.toDataURL("image/jpeg", 0.82);
  return { data: url.slice(url.indexOf(",") + 1), preview: url };
}

export function PolePhotoForm({ defaults }: { defaults?: { tent?: string } }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shape, setShape] = useState("");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!busy) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_PHOTOS - photos.length;
    const list = [...files].slice(0, room);
    if (files.length > room) setError(`Up to ${MAX_PHOTOS} photos. Used the first ${room}.`);
    const out: Picked[] = [];
    for (const f of list) {
      try {
        const { data, preview } = await toJpeg(f);
        out.push({ id: `${f.name}-${f.size}-${Math.random()}`, preview, mediaType: "image/jpeg", data });
      } catch {
        setError(`Couldn't open ${f.name}. Use a JPG or PNG photo.`);
      }
    }
    setPhotos((p) => [...p, ...out].slice(0, MAX_PHOTOS));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!photos.length) {
      setError("Add at least one photo of the pole.");
      return;
    }
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pole-photo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          images: photos.map(({ mediaType, data }) => ({ mediaType, data })),
          tent: f.get("tent"),
          length: f.get("length"),
          unit: f.get("unit"),
          sections: f.get("sections"),
          diameter: f.get("diameter"),
          shape: f.get("shape"),
          arms: f.get("arms"),
          website: f.get("website"),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !json.id) throw new Error(json.error ?? "Something went wrong. Try again.");
      router.push(`/poles/photo?id=${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  const label = "mb-1 block text-sm font-semibold text-glacier/85";
  return (
    <form onSubmit={submit} className="grid gap-5">
      <div>
        <div className="flex flex-wrap gap-3">
          {photos.map((p) => (
            <figure key={p.id} className="relative h-28 w-28 overflow-hidden rounded-[var(--radius-tag)] bg-spruce-2 sm:h-32 sm:w-32">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of an unsaved photo */}
              <img src={p.preview} alt="Your pole photo" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((all) => all.filter((x) => x.id !== p.id))}
                className="absolute right-1 top-1 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold text-glacier hover:bg-ink"
                aria-label="Remove photo"
                disabled={busy}
              >
                Remove
              </button>
            </figure>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-tag)] border-2 border-dashed border-glacier/40 px-4 text-center text-glacier hover:border-blaze hover:bg-spruce-2 sm:h-32 sm:w-64">
              <span className="font-semibold">{photos.length ? "Add another photo" : "Add photos of the pole"}</span>
              <span className="text-sm text-glacier/70">Up to {MAX_PHOTOS}. Labels and a tape measure help most.</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => add(e.target.files)}
                disabled={busy}
              />
            </label>
          )}
        </div>
      </div>

      <details className="rounded-[var(--radius-tag)] bg-spruce-2/60 p-4 text-glacier">
        <summary className="cursor-pointer font-semibold">Know the tent or have measurements? Add them (optional)</summary>
        <p className="mt-2 text-sm text-glacier/75">Anything you enter here is used instead of what we read from the photos.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor="tent" className={label}>Tent name, if you know it</label>
            <input id="tent" name="tent" maxLength={80} defaultValue={defaults?.tent} className="field h-12 text-fg" placeholder="Stormbreak 2" />
          </div>
          <div>
            <label htmlFor="shape" className={label}>Type</label>
            <select id="shape" name="shape" value={shape} onChange={(e) => setShape(e.target.value)} className="field h-12 text-fg">
              <option value="">Not sure</option>
              <option value="straight">Straight pole</option>
              <option value="prebent">Pre-bent pole</option>
              <option value="hub">Hub assembly</option>
            </select>
          </div>
          <div>
            <label htmlFor="length" className={label}>Assembled length</label>
            <div className="flex gap-2">
              <input id="length" name="length" type="number" step="0.1" min="5" max="600" className="field h-12 text-fg" placeholder="141" />
              <select name="unit" defaultValue="in" aria-label="Unit" className="field h-12 w-20 text-fg">
                <option value="in">in</option>
                <option value="cm">cm</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="sections" className={label}>Sections</label>
            <input id="sections" name="sections" type="number" min="1" max="20" className="field h-12 text-fg" placeholder="9" />
          </div>
          <div>
            <label htmlFor="diameter" className={label}>Diameter (mm)</label>
            <input id="diameter" name="diameter" type="number" step="0.05" min="3" max="25" className="field h-12 text-fg" placeholder="9.5" />
          </div>
          {shape === "hub" && (
            <div>
              <label htmlFor="arms" className={label}>Hub legs</label>
              <input id="arms" name="arms" type="number" min="2" max="8" className="field h-12 text-fg" placeholder="4" />
            </div>
          )}
        </div>
      </details>

      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn btn-blaze h-12 px-6" disabled={busy || !photos.length}>
          {busy ? "Reading your photos…" : "Match my pole"}
        </button>
        {busy && (
          <span className="text-sm text-glacier/80" role="status">
            {seconds < 20 ? "Usually 10 to 20 seconds." : "Still reading. Hang on a few more seconds."}
          </span>
        )}
        {!busy && <span className="text-sm text-glacier/70">Photos are only used for this match and aren&apos;t saved.</span>}
      </div>
      {error && (
        <p role="alert" className="rounded-[var(--radius-tag)] bg-blaze/15 px-4 py-3 font-semibold text-glacier">
          {error}
        </p>
      )}
    </form>
  );
}
