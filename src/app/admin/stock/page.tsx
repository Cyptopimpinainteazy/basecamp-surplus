import Link from "next/link";
import { and, asc, desc, eq, gt, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, stockAdjustments } from "@/lib/db/schema";
import { brands, categories, getCondition } from "@/lib/config";
import { poleSaleLabel } from "@/lib/pole-sale";
import { money } from "@/lib/format";
import { requireAdmin } from "@/lib/require-admin";
import { ManualItem } from "./manual-item";
import { StockCount } from "./stock-count";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stock & quantities" };
type SP = { q?: string; brand?: string; category?: string; stock?: string; page?: string };
const PAGE_SIZE = 40;
export default async function StockPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.min(100000, Math.max(1, Math.floor(Number(sp.page) || 1)));
  const where: SQL[] = [];
  const query = sp.q?.trim().slice(0, 100);
  if (query) {
    const like = `%${query.replace(/[\\%_]/g, "")}%`;
    where.push(or(ilike(products.title, like), ilike(products.sku, like), ilike(products.brand, like), ilike(products.model, like))!);
  }
  if (sp.brand) where.push(eq(products.brandSlug, sp.brand));
  if (sp.category) where.push(eq(products.category, sp.category));
  if (sp.stock === "low") where.push(eq(products.status, "active"), gt(products.quantity, 0), lte(products.quantity, 3));
  if (sp.stock === "zero") where.push(eq(products.quantity, 0));
  if (sp.stock === "live") where.push(eq(products.status, "active"), gt(products.quantity, 0));
  if (sp.stock === "draft") where.push(eq(products.status, "draft"));
  const filter = where.length ? and(...where) : undefined;
  const [rows, [totals], history] = await Promise.all([
    db.select({ p: products, version: sql<string>`${products.updatedAt}::text` }).from(products).where(filter).orderBy(asc(products.quantity), asc(products.id)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({
      skus: sql<number>`count(*)::int`,
      units: sql<string>`coalesce(sum(${products.quantity}),0)::text`,
      low: sql<number>`count(*) filter (where ${products.status} = 'active' and ${products.quantity} between 1 and 3)::int`,
      value: sql<string>`coalesce(sum(${products.quantity}::bigint * ${products.priceCents}) filter (where ${products.status} = 'active'),0)::text`,
    }).from(products).where(filter),
    db.select({ a: stockAdjustments, title: products.title, sku: products.sku }).from(stockAdjustments).innerJoin(products, eq(products.id, stockAdjustments.productId)).orderBy(desc(stockAdjustments.createdAt)).limit(15),
  ]);
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    for (const key of ["q", "brand", "category", "stock"] as const) if (sp[key]) params.set(key, sp[key]!);
    params.set("page", String(n)); return `/admin/stock?${params}`;
  };
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-widest text-granite">The gear room / inventory control</p><h1 className="display mt-2 text-6xl">Stock & quantities</h1></div><Link href="/admin/intake" className="btn btn-blaze">Add stock item ↗</Link></div>
    <p className="max-w-3xl text-granite">Count poles, tents, stakes and clothing by SKU. Zero stock removes a live item from sale. Restocking a sold-out item keeps it unpublished until you review and publish it in the item editor.</p>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Matching SKUs", totals.skus], ["Physical units", Number(totals.units).toLocaleString()], ["Low live stock (1–3)", totals.low], ["Live stock at list price", money(Number(totals.value))]].map(([label, value]) => <div key={label} className="rounded-[var(--radius-tag)] bg-snow p-5"><p className="text-sm text-granite">{label}</p><p className="display mt-2 text-4xl">{value}</p></div>)}</div>
    <ManualItem />
    <form className="grid gap-3 rounded-[var(--radius-tag)] bg-snow p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
      <label className="text-xs font-semibold">Search<input className="field mt-1" name="q" defaultValue={sp.q} placeholder="SKU, model, brand…" /></label>
      <label className="text-xs font-semibold">Brand<select name="brand" defaultValue={sp.brand ?? ""} className="field mt-1"><option value="">All brands</option>{brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}</select></label>
      <label className="text-xs font-semibold">Category<select name="category" defaultValue={sp.category ?? ""} className="field mt-1"><option value="">All categories</option>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
      <label className="text-xs font-semibold">Stock<select name="stock" defaultValue={sp.stock ?? ""} className="field mt-1"><option value="">All stock</option><option value="low">Low stock (1–3)</option><option value="zero">Zero units</option><option value="live">Live stock</option><option value="draft">Drafts</option></select></label>
      <button className="btn btn-spruce self-end">Filter</button>
    </form>
    <div className="overflow-x-auto rounded-[var(--radius-tag)] bg-snow"><table className="w-full text-left text-sm"><caption className="p-4 text-left text-granite">{totals.skus} matching SKUs · page {page} · totals reflect your filters</caption><thead className="border-y border-ice text-granite"><tr>{["Item / SKU", "Brand / condition", "Status", "Count physical units"].map(t => <th key={t} className="p-4 font-medium">{t}</th>)}</tr></thead><tbody className="divide-y divide-ice">{rows.map(({p, version}) => <tr key={p.id}><td className="p-4"><Link className="font-semibold underline underline-offset-4" href={`/admin/products/${p.id}`}>{p.title}</Link><p className="mt-1 font-mono text-xs text-granite">{p.sku}</p>{p.category === "poles" && <p className="mt-2 text-xs font-semibold">{poleSaleLabel(p.poleSpec) ?? "Sale unit needs review"}</p>}<p className="mt-2 text-xs">{p.category === "parts" ? p.productType || "Tent parts / stakes" : p.category} · {money(p.priceCents)}</p></td><td className="p-4">{p.brand}<p className="mt-1 text-xs text-granite">{getCondition(p.condition).short}{p.size ? ` · ${p.size}` : ""}</p></td><td className="p-4"><span className="rounded-full bg-ice px-2 py-1 text-xs">{p.status.replace("_", " ")}</span></td><td className="p-4"><StockCount key={`${p.id}-${version}`} id={p.id} quantity={p.quantity} version={version} title={p.title} /></td></tr>)}</tbody></table>{!rows.length && <p className="p-6">No items match. <Link href="/admin/stock" className="underline">Clear filters</Link> or add an item.</p>}</div>
    <nav aria-label="Stock pages" className="flex gap-3">{page > 1 && <Link href={pageHref(page - 1)} className="btn btn-line">← Previous</Link>}{page * PAGE_SIZE < totals.skus && <Link href={pageHref(page + 1)} className="btn btn-line">Next →</Link>}</nav>
    <section><h2 className="display text-4xl">Recent manual stock counts</h2><p className="mt-2 text-sm text-granite">Latest 15 counts from this workspace across all products. Sales and older editor changes are not included.</p><ul className="mt-4 divide-y divide-ice rounded-[var(--radius-tag)] bg-snow px-5">{history.map(({a,title,sku}) => <li key={a.id} className="py-3"><div className="flex flex-wrap justify-between gap-2"><Link href={`/admin/products/${a.productId}`} className="font-semibold underline">{title}</Link><span className="font-mono">{a.previousQuantity} → {a.quantity}</span></div><p className="mt-1 text-sm text-granite">{sku} · {a.reason} · {a.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC</p></li>)}</ul>{!history.length && <p className="mt-3 text-granite">No stock counts recorded yet.</p>}</section>
  </div>;
}
