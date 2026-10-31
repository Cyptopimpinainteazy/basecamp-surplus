import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, purchaseOrders, suppliers } from "@/lib/db/schema";
import { setSupplierActive } from "../dropship-actions";
import { SupplierForm } from "./supplier-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Suppliers" };

const kindLabel: Record<string, string> = { dropship: "Dropship", printer: "Printer", factory: "Factory", parts: "Parts" };

export default async function Suppliers() {
  const [rows, listed, open] = await Promise.all([
    db.select().from(suppliers).orderBy(asc(suppliers.name)),
    db.select({ id: products.supplierId, n: sql<number>`count(*)::int` }).from(products).groupBy(products.supplierId),
    db
      .select({ id: purchaseOrders.supplierId, n: sql<number>`count(*)::int` })
      .from(purchaseOrders)
      .where(sql`${purchaseOrders.status} in ('pending','sent','confirmed')`)
      .groupBy(purchaseOrders.supplierId),
  ]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-5xl">Suppliers</h1>
        <p className="mt-2 max-w-3xl text-muted">
          Anyone who ships or makes things for you. When a customer pays for a dropship, made-to-order or custom item, the
          supplier gets a purchase order by email with a private link to confirm it and add tracking. See{" "}
          <a href="https://github.com/Cyptopimpinainteazy/basecamp-surplus/blob/main/docs/SUPPLIERS.md" className="underline" target="_blank" rel="noopener">the supplier shortlist</a>{" "}
          for who to contact.
        </p>
      </div>

      {rows.length > 0 && (
        <ul className="space-y-4">
          {rows.map((s) => (
            <li key={s.id} className="rounded-[var(--radius-tag)] bg-card p-5">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="display text-3xl">{s.name}</span>
                  <span className="text-sm text-muted">{kindLabel[s.kind] ?? s.kind} · {s.orderEmail}</span>
                  {!s.active && <span className="rounded bg-line px-2 py-0.5 text-xs font-semibold">Inactive</span>}
                  {s.blindShip && <span className="rounded bg-lichen/60 px-2 py-0.5 text-xs font-semibold text-accent">Blind ship</span>}
                  <span className="ml-auto text-sm text-muted">
                    {listed.find((l) => l.id === s.id)?.n ?? 0} listings · {open.find((o) => o.id === s.id)?.n ?? 0} open POs
                  </span>
                </summary>
                <div className="mt-5 border-t border-line pt-5">
                  <SupplierForm s={s} />
                  <form action={setSupplierActive.bind(null, s.id, !s.active)} className="mt-4">
                    <button className="text-sm underline">{s.active ? "Mark inactive" : "Reactivate"}</button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-[var(--radius-tag)] bg-card p-5">
        <h2 className="display mb-4 text-3xl">Add a supplier</h2>
        <SupplierForm />
      </section>
      <p className="text-sm text-muted">
        Next: set an item&apos;s <strong>Fulfillment</strong> to Dropship or Made to order in its <Link href="/admin/products" className="underline">listing</Link>, or pick a
        printer on a <Link href="/admin/custom" className="underline">custom job</Link>.
      </p>
    </div>
  );
}
