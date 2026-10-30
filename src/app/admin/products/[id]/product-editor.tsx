"use client";

import { useActionState, useState, useTransition } from "react";
import type { Product } from "@/lib/db/schema";
import { deleteProductImage, saveProduct, setProductStatus } from "../../actions";

type Opt = { value: string; label: string };

function Field(props: { label: string; name: string; defaultValue?: string | number | null; hint?: string; type?: string; className?: string }) {
  return (
    <div className={props.className}>
      <label className="label" htmlFor={props.name}>{props.label}</label>
      <input id={props.name} name={props.name} type={props.type ?? "text"} defaultValue={props.defaultValue ?? ""} className="field" step={props.type === "number" ? "any" : undefined} />
      {props.hint && <p className="mt-1 text-xs text-granite">{props.hint}</p>}
    </div>
  );
}

function Area(props: { label: string; name: string; defaultValue?: string; rows?: number; hint?: string; maxLength?: number }) {
  const [len, setLen] = useState(props.defaultValue?.length ?? 0);
  return (
    <div>
      <label className="label flex justify-between" htmlFor={props.name}>
        <span>{props.label}</span>
        {props.maxLength && <span className={len > props.maxLength ? "text-blaze-deep" : ""}>{len}/{props.maxLength}</span>}
      </label>
      <textarea id={props.name} name={props.name} rows={props.rows ?? 3} defaultValue={props.defaultValue} className="field" onChange={(e) => setLen(e.target.value.length)} />
      {props.hint && <p className="mt-1 text-xs text-granite">{props.hint}</p>}
    </div>
  );
}

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: Opt[]; defaultValue: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={defaultValue} className="field">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function ProductEditor({
  p,
  categories,
  conditions,
  presets,
  aiNotes,
}: {
  p: Product;
  categories: Opt[];
  conditions: Opt[];
  presets: Opt[];
  aiNotes: { readFromTags: string[]; msrpConfidence: string };
}) {
  const [state, action, pending] = useActionState(saveProduct, null);
  const [images, setImages] = useState(p.images);
  const [busy, start] = useTransition();
  const cents = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));
  const move = (i: number, d: -1 | 1) =>
    setImages((cur) => {
      const n = [...cur];
      const j = i + d;
      if (j < 0 || j >= n.length) return cur;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={p.id} />
      <input type="hidden" name="images" value={images.map((i) => i.url).join("\n")} />

      <section className="rounded-[var(--radius-tag)] bg-snow p-5">
        <h2 className="display mb-3 text-3xl">Photos</h2>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((img, i) => (
            <li key={img.url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt} className="aspect-[4/5] w-full rounded-md object-cover" />
              <div className="mt-1 flex justify-between text-xs">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="underline disabled:opacity-30">Earlier</button>
                <button
                  type="button"
                  className="underline"
                  disabled={busy || images.length === 1}
                  onClick={() => {
                    setImages((c) => c.filter((x) => x.url !== img.url));
                    start(() => deleteProductImage(p.id, img.url));
                  }}
                >
                  Remove
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="underline disabled:opacity-30">Later</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 rounded-[var(--radius-tag)] bg-snow p-5">
        <h2 className="display text-3xl">Listing</h2>
        <Area label="Title" name="title" defaultValue={p.title} rows={2} maxLength={80} hint="80 characters max so it fits eBay and Poshmark." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Brand" name="brand" defaultValue={p.brand} />
          <Field label="Model" name="model" defaultValue={p.model} />
          <Field label="Type" name="productType" defaultValue={p.productType} />
          <Select label="Category" name="category" options={categories} defaultValue={p.category} />
          <Select label="Condition" name="condition" options={conditions} defaultValue={p.condition} />
          <Select
            label="Gender"
            name="gender"
            defaultValue={p.gender}
            options={[
              { value: "", label: "Not applicable" },
              { value: "mens", label: "Men's" },
              { value: "womens", label: "Women's" },
              { value: "unisex", label: "Unisex" },
              { value: "kids", label: "Kids" },
            ]}
          />
          <Field label="Size" name="size" defaultValue={p.size} />
          <Field label="Color" name="color" defaultValue={p.color} />
          <Field label="Material" name="material" defaultValue={p.material} />
        </div>
        <Area label="Condition notes" name="conditionNotes" defaultValue={p.conditionNotes} rows={2} />
        <Area label="Description" name="description" defaultValue={p.description} rows={9} hint="Blank lines separate paragraphs." />
        <Area label="Highlights (one per line)" name="highlights" defaultValue={p.highlights.join("\n")} rows={4} />
        <Area label="Specs (Label: value, one per line)" name="specs" defaultValue={p.specs.map((s) => `${s.label}: ${s.value}`).join("\n")} rows={5} />
        {(p.category === "poles" || p.fitment.length > 0) && (
          <Area label="Fits these tents (one per line)" name="fitment" defaultValue={p.fitment.join("\n")} rows={3} hint="Powers the pole finder. Use 'Brand Model', e.g. The North Face Stormbreak 2." />
        )}
        {aiNotes.readFromTags.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-granite">What the AI read from the tags</summary>
            <ul className="mt-2 list-disc pl-5">{aiNotes.readFromTags.map((t) => <li key={t}>{t}</li>)}</ul>
          </details>
        )}
      </section>

      <section className="space-y-4 rounded-[var(--radius-tag)] bg-snow p-5">
        <h2 className="display text-3xl">Price & stock</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Price ($)" name="price" defaultValue={cents(p.priceCents)} />
          <Field label="Original retail ($)" name="msrp" defaultValue={cents(p.msrpCents)} hint={aiNotes.msrpConfidence ? `AI confidence: ${aiNotes.msrpConfidence}` : undefined} />
          <Field label="Your cost ($)" name="cost" defaultValue={cents(p.costCents)} hint="Private. For profit tracking." />
          <Field label="Quantity" name="quantity" type="number" defaultValue={p.quantity} />
        </div>
        {p.pricingBasis && <p className="text-sm text-granite">Suggested price based on: {p.pricingBasis}</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Item weight (oz)" name="weightOz" type="number" defaultValue={p.weightOz} />
          <Select label="Ships in" name="packagePreset" options={presets} defaultValue={p.packagePreset} />
          <Field label="eBay category ID" name="ebayCategoryId" defaultValue={p.ebayCategoryId} hint="Leave blank to auto-pick." />
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-tag)] bg-snow p-5">
        <h2 className="display text-3xl">Search</h2>
        <Field label="URL slug" name="slug" defaultValue={p.slug} />
        <Area label="SEO title" name="seoTitle" defaultValue={p.seoTitle} rows={1} maxLength={60} />
        <Area label="SEO description" name="seoDescription" defaultValue={p.seoDescription} rows={2} maxLength={160} />
        <Area label="Keywords (comma separated)" name="keywords" defaultValue={p.keywords.join(", ")} rows={3} />
        <Area label="Hashtags (comma separated)" name="hashtags" defaultValue={p.hashtags.join(", ")} rows={2} />
        <label className="flex items-center gap-2">
          <input type="checkbox" name="featured" defaultChecked={p.featured} /> Feature at the top of the store
        </label>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-ice bg-glacier/95 px-4 py-3 backdrop-blur">
        {p.status !== "active" && p.status !== "sold_out" && (
          <button name="intent" value="publish" disabled={pending} className="btn btn-blaze">
            {pending ? "Publishing…" : "Publish"}
          </button>
        )}
        <button name="intent" value="save" disabled={pending} className="btn btn-spruce">
          {pending ? "Saving…" : "Save changes"}
        </button>
        {p.status === "active" && (
          <button type="button" disabled={busy} onClick={() => start(() => setProductStatus(p.id, "draft"))} className="btn btn-line">
            Unpublish
          </button>
        )}
        {p.status !== "archived" && (
          <button type="button" disabled={busy} onClick={() => start(() => setProductStatus(p.id, "archived"))} className="btn text-granite underline">
            Archive
          </button>
        )}
        <p role="status" className={`text-sm ${state?.error ? "text-blaze-deep" : "text-spruce"}`}>
          {state?.error ?? state?.ok ?? ""}
        </p>
      </div>
    </form>
  );
}
