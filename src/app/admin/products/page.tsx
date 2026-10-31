import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import Link from "next/link";
import { getCondition } from "@/lib/config";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventory" };

const tabs = [
  { v: "", label: "All" },
  { v: "draft", label: "Drafts" },
  { v: "active", label: "Live" },
  { v: "sold_out", label: "Sold out" },
  { v: "archived", label: "Archived" },
];

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const where: SQL[] = [];
  if (status && tabs.some((t) => t.v === status)) where.push(eq(products.status, status as "draft"));
  if (q) where.push(or(ilike(products.title, `%${q}%`), ilike(products.sku, `%${q}%`))!);
  const rows = await db
    .select()
    .from(products)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(products.updatedAt))
    .limit(300);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-6xl">Inventory</h1>
        <div className="flex gap-2">
          <Link href="/admin/stock" className="btn btn-spruce">Stock & quantities</Link>
          <a href="/api/admin/export" className="btn btn-line">Crosslister CSV</a>
          <Link href="/admin/intake" className="btn btn-blaze">Add item</Link>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <Link key={t.v} href={t.v ? `/admin/products?status=${t.v}` : "/admin/products"} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${(status ?? "") === t.v ? "bg-spruce text-glacier" : "bg-snow"}`}>
            {t.label}
          </Link>
        ))}
        <form className="ml-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search title or SKU" className="field h-10 min-h-0 w-64" />
        </form>
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-tag)] bg-snow">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ice text-granite">
            <tr>
              <th className="p-3 font-medium">Item</th>
              <th className="p-3 font-medium">SKU</th>
              <th className="p-3 font-medium">Condition</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium">Qty</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ice">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-glacier">
                <td className="p-3">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                    {p.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0].url} alt="" className="h-12 w-10 shrink-0 rounded object-cover" />
                    )}
                    <span className="line-clamp-2">{p.title}</span>
                  </Link>
                </td>
                <td className="p-3 font-mono text-xs">{p.sku}</td>
                <td className="p-3">{getCondition(p.condition).short}</td>
                <td className="p-3">{money(p.priceCents)}</td>
                <td className="p-3">{p.quantity}</td>
                <td className="p-3 capitalize">{p.status.replace("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-granite">No items here yet. Add one from your phone with Add item.</p>}
      </div>
    </div>
  );
}
