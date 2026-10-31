"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";

export type Artwork = { url: string; name: string; preview?: string };

const ACCEPT = ".png,.jpg,.jpeg,.webp,.svg,.pdf,.ai,.eps,.psd,image/png,image/jpeg,image/webp,image/svg+xml,application/pdf";
const MAX_MB = 25;

/** Uploads logo/artwork files straight to storage; reports them to the parent. */
export function ArtworkUpload({ files, onChange, max = 6 }: { files: Artwork[]; onChange: (f: Artwork[]) => void; max?: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    setBusy(true);
    const next = [...files];
    try {
      for (const f of [...list].slice(0, max - files.length)) {
        if (f.size > MAX_MB * 1024 * 1024) {
          setError(`${f.name} is over ${MAX_MB} MB. Send a smaller file or a PDF.`);
          continue;
        }
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
        const type =
          f.type ||
          ({ ai: "application/illustrator", eps: "application/postscript", psd: "image/vnd.adobe.photoshop", svg: "image/svg+xml", pdf: "application/pdf" } as Record<string, string>)[ext] ||
          "application/octet-stream";
        const res = await upload(`custom-artwork/${f.name.replace(/[^\w.-]+/g, "-").slice(-80)}`, f, {
          access: "public",
          handleUploadUrl: "/api/custom/upload",
          contentType: type,
        });
        next.push({ url: res.url, name: f.name, preview: /^image\/(png|jpeg|webp|svg\+xml)$/.test(type) ? URL.createObjectURL(f) : undefined });
        onChange([...next]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-3">
        {files.map((f) => (
          <li key={f.url} className="relative w-28 overflow-hidden rounded-[var(--radius-tag)] border border-line bg-card">
            {f.preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of an uploaded logo
              <img src={f.preview} alt={f.name} className="h-20 w-full object-contain p-2" />
            ) : (
              <span className="grid h-20 place-items-center text-sm font-semibold">{f.name.split(".").pop()?.toUpperCase()}</span>
            )}
            <span className="block truncate border-t border-line px-2 py-1 text-xs">{f.name}</span>
            <button
              type="button"
              onClick={() => onChange(files.filter((x) => x.url !== f.url))}
              className="press absolute right-1 top-1 rounded-full bg-ink/80 px-2 text-xs font-semibold text-glacier"
              aria-label={`Remove ${f.name}`}
            >
              ×
            </button>
          </li>
        ))}
        {files.length < max && (
          <li>
            <label className="flex h-[6.6rem] w-44 cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-tag)] border-2 border-dashed border-line px-3 text-center hover:border-blaze">
              <span className="font-semibold">{busy ? "Uploading…" : files.length ? "Add another file" : "Upload your logo"}</span>
              <span className="text-xs text-muted">Vector (AI, EPS, SVG, PDF) prints sharpest. PNG/JPG at 300 dpi works.</span>
              <input type="file" accept={ACCEPT} multiple className="sr-only" disabled={busy} onChange={(e) => add(e.target.files)} />
            </label>
          </li>
        )}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-blaze-deep">{error}</p>}
    </div>
  );
}
