import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getPackagePreset, packagePresets } from "@/lib/config";
import { db } from "@/lib/db";
import { customJobs, products, orderTasks, purchaseOrders, suppliers } from "@/lib/db/schema";
import { poLink } from "@/lib/purchase-orders";
import { SupplierPanel } from "./supplier-panel";
import { money } from "@/lib/format";
import { getOrder } from "@/lib/orders";
import { shippoConfigured } from "@/lib/shipping";
import { retryOrderFollowups } from "../../actions";
import { ShipPanel } from "./ship-panel";
import { OrderStatusButtons } from "./status-buttons";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await getOrder(id);
  if (!o) notFound();
  const ids = o.items.map((i) => i.productId).filter(Boolean);
  const rows = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : [];
  const itemWeight = o.items.reduce((s, i) => s + (rows.find((r) => r.id === i.productId)?.weightOz ?? 24) * i.quantity, 0);
  const preset = o.packagePreset ?? rows.map((r) => getPackagePreset(r.packagePreset)).sort((a, b) => b.length * b.width * b.height - a.length * a.width * a.height)[0]?.id ?? "medium-box";
  const a = o.shippingAddress;
  const pendingTasks = (await db.select().from(orderTasks).where(eq(orderTasks.orderId,o.id))).filter(t=>!t.completedAt);
  const pos = await db.select().from(purchaseOrders).where(eq(purchaseOrders.orderId, o.id));
  const supRows = pos.length ? await db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers).where(inArray(suppliers.id, pos.map((p) => p.supplierId))) : [];
  const jobIds = o.items.map((i) => i.customJobId).filter((x): x is string => Boolean(x));
  const jobs = jobIds.length ? await db.select({ id: customJobs.id, kind: customJobs.kind }).from(customJobs).where(inArray(customJobs.id, jobIds)) : [];
  // Supplier-made: dropship/made-to-order listings and every custom job except in-house pole builds.
  const needsPo = rows.some((r) => r.fulfillment !== "stock") || jobs.some((j) => j.kind !== "poles");

  return (
    <div>
      <p className="mb-2 text-sm"><Link href="/admin/orders" className="underline">Orders</Link></p>
      <h1 className="display text-6xl">{o.number}</h1>
      <p className="text-muted">
        {o.source === "ebay" ? `eBay order ${o.externalId}` : "Website order"} · {o.createdAt.toLocaleString("en-US")} ·{" "}
        <span className="capitalize">{o.status.replace("_", " ")}</span> · {o.shippingMethod} shipping
      </p>
      {o.attentionReason && <p className="mt-4 rounded-[var(--radius-tag)] border-2 border-blaze bg-card p-4">{o.attentionReason}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <section className="rounded-[var(--radius-tag)] bg-card p-5">
            <h2 className="display text-3xl">Pack these</h2>
            <ul className="mt-3 divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.sku + i.title} className="flex items-center gap-3 py-3">
                  {i.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image} alt="" className="h-16 w-14 rounded object-cover" />
                  )}
                  <div>
                    <p className="font-semibold">{i.quantity} × {i.title}</p>
                    <p className="font-mono text-xs text-muted">{i.sku}</p>
                    {i.saleUnitLabel && <p className="mt-1 text-sm font-semibold">{i.saleUnitLabel}</p>}
                    {i.customJobId && <Link href={`/admin/custom/${i.customJobId}`} className="mt-1 inline-block text-sm font-semibold underline">Custom job details</Link>}
                    {(i.fulfillment === "dropship" || i.fulfillment === "made_to_order") && <p className="mt-1 text-sm font-semibold text-accent">Supplier ships this</p>}
                  </div>
                  <span className="ml-auto">{money(i.unitCents * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Shipping paid</dt><dd>{money(o.shippingCents)}</dd></div>
              {o.items.some(i => (i.lineDiscountCents ?? 0) > 0) && <div className="flex justify-between"><dt>Discount</dt><dd>−{money(o.items.reduce((sum,i)=>sum+(i.lineDiscountCents ?? 0),0))}</dd></div>}
              {o.taxCents > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{money(o.taxCents)}</dd></div>}
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{money(o.totalCents)}</dd></div>
              {o.labelCostCents != null && <div className="flex justify-between text-muted"><dt>Label cost</dt><dd>{money(o.labelCostCents)}</dd></div>}
            </dl>
          </section>
          <SupplierPanel
            orderId={o.id}
            pos={pos}
            supplierNames={Object.fromEntries(supRows.map((x) => [x.id, x.name]))}
            links={Object.fromEntries(pos.map((p) => [p.id, poLink(p)]))}
            needsPo={needsPo && (pos.length === 0 || pos.some((p) => p.status === "pending") || jobs.some((j) => j.kind !== "poles" && !pos.some((p) => p.items.some((i) => i.customJobId === j.id))))}
          />
          <section className="rounded-[var(--radius-tag)] bg-card p-5">
            <h2 className="display text-3xl">Ship to</h2>
            {a ? (
              <address className="mt-2 not-italic">
                {a.name}<br />{a.line1}<br />{a.line2 && <>{a.line2}<br /></>}{a.city}, {a.state} {a.postalCode}<br />{a.phone}
              </address>
            ) : (
              <p className="text-muted">No address on file.</p>
            )}
            <p className="mt-2 text-sm">{o.email}</p>
          </section>
          {pendingTasks.length > 0 && <section className="rounded-[var(--radius-tag)] bg-card p-5">
            <h2 className="display text-3xl">Pending follow-ups</h2>
            <ul className="mt-3 space-y-2 text-sm">{pendingTasks.map(t=><li key={t.id}><strong>{t.kind.replaceAll("_"," ")}</strong> · {t.attempts} attempts{t.lastError && <p className="text-muted">{t.lastError}</p>}</li>)}</ul>
            <form action={retryOrderFollowups.bind(null,o.id)} className="mt-4"><button className="btn btn-line">Retry follow-ups</button></form>
          </section>}
          <OrderStatusButtons id={o.id} status={o.status} stripePi={o.stripePaymentIntentId} />
        </div>

        <ShipPanel
          orderId={o.id}
          configured={shippoConfigured()}
          defaultPreset={preset}
          defaultWeightOz={itemWeight}
          presets={packagePresets.map((p) => ({ id: p.id, name: `${p.name} (${p.length}×${p.width}×${p.height} in)` }))}
          label={o.labelUrl ? { url: o.labelUrl, tracking: o.trackingNumber ?? "", trackingUrl: o.trackingUrl ?? "", carrier: `${o.carrier ?? ""} ${o.service ?? ""}` } : null}
        />
      </div>
    </div>
  );
}
