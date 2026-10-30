"use client";

import { useActionState, useState, useTransition } from "react";
import type { Article } from "@/lib/db/schema";
import { saveArticle, setArticleStatus } from "../../actions";

type Opt = { value: string; label: string };

function Area({ label, name, value, rows = 3, hint, max }: { label: string; name: string; value: string; rows?: number; hint?: string; max?: number }) {
  const [len, setLen] = useState(value.length);
  return (
    <div>
      <label htmlFor={name} className="label flex justify-between">
        <span>{label}</span>
        {max && <span className={len > max ? "text-blaze-deep" : ""}>{len}/{max}</span>}
      </label>
      <textarea id={name} name={name} rows={rows} defaultValue={value} onChange={(e) => setLen(e.target.value.length)} className="field" />
      {hint && <p className="mt-1 text-xs text-granite">{hint}</p>}
    </div>
  );
}

export function ReviewEditor({ a, categories }: { a: Article; categories: Opt[] }) {
  const [state, action, pending] = useActionState(saveArticle, null);
  const [busy, start] = useTransition();
  const words = a.body.split(/\s+/).length;
  return (
    <form action={action} className="mt-6 space-y-6">
      <input type="hidden" name="id" value={a.id} />
      <section className="space-y-4 rounded-[var(--radius-tag)] bg-snow p-5">
        <h2 className="display text-3xl">Headline</h2>
        <Area label="Title" name="title" value={a.title} rows={2} max={110} />
        <Area label="Standfirst (under the headline)" name="dek" value={a.dek} rows={2} max={320} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="subject" className="label">Product reviewed</label>
            <input id="subject" name="subject" defaultValue={a.subject} className="field" />
          </div>
          <div>
            <label htmlFor="stockQuery" className="label">Matches stock containing</label>
            <input id="stockQuery" name="stockQuery" defaultValue={a.stockQuery} className="field" />
            <p className="mt-1 text-xs text-granite">Links the review to products and products back to it.</p>
          </div>
          <div>
            <label htmlFor="category" className="label">Category</label>
            <select id="category" name="category" defaultValue={a.category} className="field">
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-tag)] bg-snow p-5">
        <h2 className="display text-3xl">Verdict box</h2>
        <Area label="Verdict" name="verdict" value={a.verdict} rows={3} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Area label="Best for" name="bestFor" value={a.bestFor} rows={2} />
          <Area label="Look elsewhere if you need" name="notFor" value={a.notFor} rows={2} />
          <Area label="Pros (one per line)" name="pros" value={a.pros.join("\n")} rows={5} />
          <Area label="Cons (one per line)" name="cons" value={a.cons.join("\n")} rows={5} />
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-tag)] bg-snow p-5">
        <h2 className="display text-3xl">Article</h2>
        <Area label={`Body (markdown, ${words} words)`} name="body" value={a.body} rows={24} hint="## starts a section. **bold**, - lists, [link text](/poles)." />
        <Area label="Specs (Label: value, one per line)" name="specs" value={a.specs.map((s) => `${s.label}: ${s.value}`).join("\n")} rows={8} />
        <Area label="Sources (Title | https://url, one per line)" name="sources" value={a.sources.map((s) => `${s.title} | ${s.url}`).join("\n")} rows={4} />
        <div>
          <label htmlFor="heroImage" className="label">Cover image URL (optional)</label>
          <input id="heroImage" name="heroImage" defaultValue={a.heroImage ?? ""} className="field" />
          <p className="mt-1 text-xs text-granite">Leave blank to use the photo of the matching in-stock item.</p>
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-tag)] bg-snow p-5">
        <h2 className="display text-3xl">Search</h2>
        <div>
          <label htmlFor="slug" className="label">URL slug</label>
          <input id="slug" name="slug" defaultValue={a.slug} className="field" />
        </div>
        <Area label="SEO title" name="seoTitle" value={a.seoTitle} rows={1} max={60} />
        <Area label="SEO description" name="seoDescription" value={a.seoDescription} rows={2} max={160} />
        <Area label="Keywords (comma separated)" name="keywords" value={a.keywords.join(", ")} rows={2} />
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-ice bg-glacier/95 px-4 py-3 backdrop-blur">
        {a.status !== "published" && (
          <button name="intent" value="publish" disabled={pending} className="btn btn-blaze">{pending ? "Publishing…" : "Publish"}</button>
        )}
        <button name="intent" value="save" disabled={pending} className="btn btn-spruce">{pending ? "Saving…" : "Save changes"}</button>
        {a.status === "published" && (
          <button type="button" disabled={busy} onClick={() => start(() => setArticleStatus(a.id, "draft"))} className="btn btn-line">Unpublish</button>
        )}
        <p role="status" className={`text-sm ${state?.error ? "text-blaze-deep" : "text-spruce"}`}>{state?.error ?? state?.ok ?? ""}</p>
      </div>
    </form>
  );
}
