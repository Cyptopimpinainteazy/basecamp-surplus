"use client";

import { useActionState, useState, useTransition } from "react";
import type { Product } from "@/lib/db/schema";
import { attachProductPhotos, deleteProductImage, saveProduct, setProductStatus } from "../../actions";

import { uploadPhotos } from "../../intake/upload";

type Opt = { value: string; label: string };

function Field(props: { label: string; name: string; defaultValue?: string | number | null; hint?: string; type?: string; className?: string }) {
  return (
    <div className={props.className}>
      <label className="label" htmlFor={props.name}>{props.label}</label>
      <input id={props.name} name={props.name} type={props.type ?? "text"} defaultValue={props.defaultValue ?? ""} className="field" step={props.type === "number" ? "any" : undefined} />
      {props.hint && <p className="mt-1 text-xs text-muted">{props.hint}</p>}
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
      {props.hint && <p className="mt-1 text-xs text-muted">{props.hint}</p>}
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
  suppliers = [],
}: {
  p: Product;
  categories: Opt[];
  conditions: Opt[];
  presets: Opt[];
  suppliers?: Opt[];
  aiNotes: { readFromTags: string[]; msrpConfidence: string };
}) {
  const [state, action, pending] = useActionState(saveProduct, null);
  const [images, setImages] = useState(p.images);
  const [photoStatus, setPhotoStatus] = useState("");
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
      <input type="hidden" name="originalQuantity" value={p.quantity} />
      <input type="hidden" name="images" value={images.map((i) => i.url).join("\n")} />

      <section className="rounded-[var(--radius-tag)] bg-card p-5">
        <h2 className="display mb-3 text-3xl">Photos</h2>
        <label className="label" htmlFor="add-photos">Upload product photos (up to 12 at a time)</label>
        <input id="add-photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple disabled={busy || pending} className="mb-2 block w-full text-sm" onChange={e => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!files.length) return;
          if (files.length > 12 || files.some(f => f.size > 15 * 1024 * 1024)) { setPhotoStatus("Choose up to 12 photos, each under 15 MB."); return; }
          start(async () => {
            try {
              const uploaded = await uploadPhotos(files, pct => setPhotoStatus(`Uploading ${pct}%…`));
              const result = await attachProductPhotos(p.id, uploaded.map(i => i.url));
              if (result.error) { setPhotoStatus(result.error); return; }
              if (result.images) setImages(result.images);
              setPhotoStatus("Photos attached. Save any other listing changes below.");
            } catch { setPhotoStatus("Photo upload failed. Check Blob storage configuration and try again."); }
          });
        }} />
        <p role="status" className="mb-4 text-sm text-muted">{photoStatus}</p>
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

      <section className="space-y-4 rounded-[var(--radius-tag)] bg-card p-5">
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
        <Area label="Specs (Label: value, one per line)" name="specs" defaultValue={p.specs.map((s) => `${s.label}: ${s.value}`).join("\n")} rows={5} hint="For Google Shopping, enter MPN: manufacturer part number and GTIN: barcode digits only when verified from the product/tag. Never use your internal SKU as MPN." />
        {(p.category === "poles" || p.category === "parts" || p.fitment.length > 0) && (
          <Area label="Fits these tents (one per line)" name="fitment" defaultValue={p.fitment.join("\n")} rows={3} hint="Powers the pole finder. Use 'Brand Model', e.g. The North Face Stormbreak 2." />
        )}
        {p.category === "poles" && (
          <fieldset className="rounded-md border-[1.5px] border-line p-4">
            <legend className="px-1 text-sm font-semibold">Pole sale unit & measurements</legend>
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <Select label="What does one purchase include?" name="poleSaleUnit" defaultValue={p.poleSpec?.saleUnit ?? ""} options={[{value:"",label:"Choose before publishing"},{value:"section",label:"One loose pole section"},{value:"assembly",label:"One complete pole assembly"},{value:"set",label:"Full tent pole set"}]} />
              <Field label="Assemblies in a full set" name="poleAssemblies" type="number" defaultValue={p.poleSpec?.assembliesIncluded} hint="Full sets only. Count complete assemblies, not individual sections." />
            </div>
            <p className="mb-4 text-sm text-muted">Stock quantity counts the sale units chosen above. Do not list a full set and its component poles as separate available stock at the same time. Splitting a set requires removing it from set inventory first.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="poleShape">Type</label>
                <select id="poleShape" name="poleShape" defaultValue={p.poleSpec?.shape ?? "straight"} className="field">
                  <option value="straight">Straight</option>
                  <option value="prebent">Pre-bent</option>
                  <option value="hub">Hub assembly</option>
                </select>
              </div>
              <Field label="Hub legs" name="poleHubArms" type="number" defaultValue={p.poleSpec?.hubArms} hint="Hub assemblies only." />
              <Field label="Length (in)" name="poleLengthIn" type="number" defaultValue={p.poleSpec?.lengthIn} hint="Tip to tip. Pre-bent: along the curve. Hub: longest leg, hub to tip." />
              <Field label="Sections" name="poleSections" type="number" defaultValue={p.poleSpec?.sections} />
              <Field label="Packed length (in)" name="polePackedIn" type="number" defaultValue={p.poleSpec?.packedLengthIn} hint="One folded section." />
              <Field label="Diameter (mm)" name="poleDiameterMm" type="number" defaultValue={p.poleSpec?.diameterMm} />
              <Field label="Position" name="poleRole" defaultValue={p.poleSpec?.role} hint="main, brow, fly, hub, cross…" />
              <Field label="Color code" name="poleColor" defaultValue={p.poleSpec?.colorCode} />
              <Field label="Material" name="poleMaterial" defaultValue={p.poleSpec?.material} className="sm:col-span-2" />
              <label className="flex items-center gap-2 self-end pb-3 text-sm">
                <input type="checkbox" name="poleMeasured" defaultChecked={p.poleSpec?.measured ?? false} /> I measured this myself
              </label>
            </div>
          </fieldset>
        )}
        {aiNotes.readFromTags.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">What the AI read from the tags</summary>
            <ul className="mt-2 list-disc pl-5">{aiNotes.readFromTags.map((t) => <li key={t}>{t}</li>)}</ul>
          </details>
        )}
      </section>

      <section className="space-y-4 rounded-[var(--radius-tag)] bg-card p-5">
        <h2 className="display text-3xl">Price & stock</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Price ($)" name="price" defaultValue={cents(p.priceCents)} />
          <Field label="Original retail ($)" name="msrp" defaultValue={cents(p.msrpCents)} hint={aiNotes.msrpConfidence ? `AI confidence: ${aiNotes.msrpConfidence}` : undefined} />
          <Field label="Your cost ($)" name="cost" defaultValue={cents(p.costCents)} hint="Private. For profit tracking." />
          <Field label="Quantity" name="quantity" type="number" defaultValue={p.quantity} hint="Count individual sale units. Use Stock & quantities for a reason and adjustment history." />
        </div>
        {p.pricingBasis && <p className="text-sm text-muted">Suggested price based on: {p.pricingBasis}</p>}
        <fieldset className="rounded-md border-[1.5px] border-line p-4">
          <legend className="px-1 text-sm font-semibold">Who ships it</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Fulfillment"
              name="fulfillment"
              defaultValue={p.fulfillment}
              options={[
                { value: "stock", label: "Our stock (we ship it)" },
                { value: "dropship", label: "Dropship (supplier ships it)" },
                { value: "made_to_order", label: "Made to order (supplier makes & ships)" },
              ]}
            />
            <Select label="Supplier" name="supplierId" defaultValue={p.supplierId ?? ""} options={[{ value: "", label: "None" }, ...suppliers]} />
            <Field label="Supplier SKU" name="supplierSku" defaultValue={p.supplierSku} />
            <Field label="Ships in (days)" name="leadTimeDays" type="number" defaultValue={p.leadTimeDays} hint="Shown on the listing for dropship and made-to-order items." />
          </div>
          <p className="mt-3 text-sm text-muted">
            Dropship and made-to-order sales email a purchase order to the supplier automatically. Set Quantity to what the supplier
            can fill and Your cost to what they charge you.
          </p>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Item weight (oz)" name="weightOz" type="number" defaultValue={p.weightOz} />
          <Select label="Ships in" name="packagePreset" options={presets} defaultValue={p.packagePreset} />
          <Field label="eBay category ID" name="ebayCategoryId" defaultValue={p.ebayCategoryId} hint="Leave blank to auto-pick." />
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-tag)] bg-card p-5">
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

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-page/95 px-4 py-3 backdrop-blur">
        {p.status !== "active" && p.status !== "sold_out" && (
          <button name="intent" value="publish" disabled={pending || busy} className="btn btn-blaze">
            {pending ? "Publishing…" : "Publish"}
          </button>
        )}
        <button name="intent" value="save" disabled={pending || busy} className="btn btn-spruce">
          {pending ? "Saving…" : "Save changes"}
        </button>
        {p.status === "active" && (
          <button type="button" disabled={busy} onClick={() => start(() => setProductStatus(p.id, "draft"))} className="btn btn-line">
            Unpublish
          </button>
        )}
        {p.status !== "archived" && (
          <button type="button" disabled={busy} onClick={() => start(() => setProductStatus(p.id, "archived"))} className="btn text-muted underline">
            Archive
          </button>
        )}
        <p role="status" className={`text-sm ${state?.error ? "text-blaze-deep" : "text-accent"}`}>
          {state?.error ?? state?.ok ?? ""}
        </p>
      </div>
    </form>
  );
}
