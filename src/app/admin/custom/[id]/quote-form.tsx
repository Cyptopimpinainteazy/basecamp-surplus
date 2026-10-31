"use client";

import { upload } from "@vercel/blob/client";
import { useActionState, useState } from "react";
import type { CustomJob } from "@/lib/db/schema";
import { quoteJob, type ActionState } from "../../dropship-actions";

const dollars = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));

export function QuoteForm({ job, suppliers }: { job: CustomJob; suppliers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(quoteJob.bind(null, job.id), null);
  const [proofs, setProofs] = useState(job.proofs);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setErr("");
    try {
      const added: { url: string; name: string }[] = [];
      for (const f of [...files].slice(0, 8)) {
        const res = await upload(`proofs/${job.number}-${f.name.replace(/[^\w.-]+/g, "-")}`, f, { access: "public", handleUploadUrl: "/api/admin/blob", contentType: f.type });
        added.push({ url: res.url, name: f.name });
      }
      setProofs((p) => [...p, ...added].slice(0, 8));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="proofs" value={JSON.stringify(proofs)} />
      <div>
        <p className="label">Proof from the printer or factory {job.kind === "canopy" && <span className="text-blaze-deep">(required)</span>}</p>
        <ul className="mb-2 space-y-1 text-sm">
          {proofs.map((p) => (
            <li key={p.url} className="flex items-center gap-3">
              <a href={p.url} target="_blank" rel="noopener" className="underline">{p.name}</a>
              <button type="button" className="text-xs text-muted underline" onClick={() => setProofs((all) => all.filter((x) => x.url !== p.url))}>remove</button>
            </li>
          ))}
        </ul>
        <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple disabled={uploading} onChange={(e) => addFiles(e.target.files)} className="text-sm" />
        {uploading && <p className="text-sm text-muted">Uploading…</p>}
        {err && <p className="text-sm font-semibold text-blaze-deep">{err}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="supplierId">Supplier who makes it</label>
          <select id="supplierId" name="supplierId" defaultValue={job.supplierId ?? ""} className="field">
            <option value="">Choose later</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cost">Your cost for the whole job ($)</label>
          <input id="cost" name="cost" inputMode="decimal" defaultValue={dollars(job.costCents)} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="price">Customer price for the whole job ($)</label>
          <input id="price" name="price" required inputMode="decimal" defaultValue={dollars(job.priceCents ?? job.estimateCents)} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="shipping">Shipping charged ($, 0 = included)</label>
          <input id="shipping" name="shipping" inputMode="decimal" defaultValue={dollars(job.shippingCents)} className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ownerNote">Note to the customer</label>
        <textarea id="ownerNote" name="ownerNote" rows={3} defaultValue={job.ownerNote} className="field" placeholder="Proof shows your logo centered on all four valances. Production is 7 business days after approval." />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-blaze" disabled={pending || uploading}>{pending ? "Sending…" : job.status === "quoted" ? "Update & resend quote" : "Send proof & price"}</button>
        {state?.ok && <p role="status" className="font-semibold text-accent">{state.ok}</p>}
        {state?.error && <p role="alert" className="font-semibold text-blaze-deep">{state.error}</p>}
      </div>
    </form>
  );
}
