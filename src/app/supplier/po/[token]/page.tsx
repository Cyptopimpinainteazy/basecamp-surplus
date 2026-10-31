import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { site } from "@/lib/config";
import { money } from "@/lib/format";
import { poByToken } from "@/lib/purchase-orders";
import { PoForms } from "./po-forms";

export const metadata: Metadata = { title: "Purchase order", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  pending: "Not sent yet",
  sent: "Waiting for your confirmation",
  confirmed: "Confirmed, waiting for tracking",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

export default async function SupplierPo({ params }: { params: Promise<{ token: string }> }) {
  const found = await poByToken((await params).token);
  if (!found) notFound();
  const { po, supplier } = found;
  const a = po.shipTo;
  return (
    <div className="min-h-dvh bg-page">
      <header className="bg-spruce text-glacier">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <span className="display text-2xl">{site.name}</span>
          <span className="text-sm text-glacier/75">Supplier order page</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-muted">For {supplier.name}</p>
        <h1 className="display text-5xl">Purchase order {po.number}</h1>
        <p className="mt-2 inline-block rounded-full bg-lichen/60 px-3 py-1 text-sm font-semibold text-accent">{statusLabel[po.status] ?? po.status}</p>

        {po.status === "cancelled" ? (
          <p className="mt-6 rounded-[var(--radius-tag)] bg-card p-5 font-semibold">This order was cancelled. Please don&apos;t ship it.</p>
        ) : (
          <>
            <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <section className="rounded-[var(--radius-tag)] bg-card p-5">
                <h2 className="display text-3xl">Items</h2>
                <ul className="mt-3 divide-y divide-line">
                  {po.items.map((i, n) => (
                    <li key={n} className="py-3">
                      <div className="flex justify-between gap-4">
                        <p className="font-semibold">{i.title}</p>
                        <p className="shrink-0">× {i.quantity}{i.unitCostCents != null && <span className="block text-right text-sm text-muted">{money(i.unitCostCents)} ea</span>}</p>
                      </div>
                      <p className="text-sm text-muted">{i.supplierSku ? `Your SKU ${i.supplierSku} · ` : ""}Our ref {i.sku}</p>
                      {i.spec && i.spec.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-sm">{i.spec.map((s) => <li key={s}>{s}</li>)}</ul>
                      )}
                      {i.artwork && i.artwork.length > 0 && (
                        <p className="mt-2 text-sm">
                          Files:{" "}
                          {i.artwork.map((f, k) => (
                            <a key={f.url} href={f.url} target="_blank" rel="noopener" className="font-semibold underline">
                              {k > 0 && ", "}{f.name}
                            </a>
                          ))}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                {po.costCents != null && <p className="mt-3 text-right font-semibold">PO total {money(po.costCents)}</p>}
              </section>
              <section className="rounded-[var(--radius-tag)] bg-card p-5">
                <h2 className="display text-3xl">Ship to</h2>
                {a ? (
                  <address className="mt-2 not-italic leading-relaxed">
                    {a.name}<br />{a.line1}{a.line2 && <><br />{a.line2}</>}<br />{a.city}, {a.state} {a.postalCode}<br />{a.country}{a.phone && <><br />{a.phone}</>}
                  </address>
                ) : (
                  <p className="mt-2 font-semibold text-blaze-deep">No address on file. Reply to our email before shipping.</p>
                )}
                <p className="mt-4 text-sm text-muted">
                  <strong className="text-fg">Blind ship:</strong> no {supplier.name} branding, invoice or pricing in the package.
                </p>
              </section>
            </div>
            <div className="mt-6">
              <PoForms token={po.token} status={po.status} />
            </div>
            {po.trackingNumber && (
              <p className="mt-6 text-sm text-muted">
                Current tracking: {po.carrier} <a href={po.trackingUrl ?? "#"} className="font-mono underline">{po.trackingNumber}</a>
              </p>
            )}
          </>
        )}
        <p className="mt-10 text-sm text-muted">Questions? Email {site.ownerEmail || site.supportEmail}. This page is private to you; don&apos;t share the link.</p>
      </main>
    </div>
  );
}
