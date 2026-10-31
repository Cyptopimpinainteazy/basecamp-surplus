import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { jobLink } from "@/lib/custom-jobs";
import { jobKindLabel, jobStatusLabel } from "@/lib/custom-labels";
import { db } from "@/lib/db";
import { customJobs, orders, purchaseOrders, suppliers } from "@/lib/db/schema";
import { money } from "@/lib/format";
import { setJobStatus, setJobSupplier } from "../../dropship-actions";
import { CopyText } from "@/components/copy-text";
import { QuoteForm } from "./quote-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Custom job" };

export default async function CustomJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [job] = await db.select().from(customJobs).where(eq(customJobs.id, id));
  if (!job) notFound();
  const [sups, [order], pos] = await Promise.all([
    db.select({ id: suppliers.id, name: suppliers.name, active: suppliers.active }).from(suppliers).orderBy(asc(suppliers.name)),
    job.orderId ? db.select().from(orders).where(eq(orders.id, job.orderId)) : Promise.resolve([]),
    job.orderId ? db.select().from(purchaseOrders).where(eq(purchaseOrders.orderId, job.orderId)) : Promise.resolve([]),
  ]);
  const po = pos.find((p) => p.items.some((i) => i.customJobId === job.id));
  const activeSups = sups.filter((s) => s.active || s.id === job.supplierId);
  const margin = job.priceCents != null && job.costCents != null ? job.priceCents - job.costCents : null;

  return (
    <div className="space-y-6">
      <p className="text-sm"><Link href="/admin/custom" className="underline">Custom jobs</Link></p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl">{jobKindLabel[job.kind]} <span className="font-mono text-3xl">{job.number}</span></h1>
          <p className="mt-1 text-muted">{jobStatusLabel[job.status]} · received {job.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <div className="text-sm">
          <p className="text-muted">Customer&apos;s private link</p>
          <CopyText text={jobLink(job)} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="rounded-[var(--radius-tag)] bg-card p-5">
          <h2 className="display text-3xl">What they want</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">{job.summary.map((l) => <li key={l}>{l}</li>)}</ul>
          {job.customerNote && <p className="mt-4 whitespace-pre-line rounded bg-page p-3 text-sm">{job.customerNote}</p>}
          {job.artwork.length > 0 && (
            <div className="mt-4">
              <p className="label">Customer artwork</p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {job.artwork.map((a) => (
                  <li key={a.url}>
                    <a href={a.url} target="_blank" rel="noopener" className="block overflow-hidden rounded border border-line bg-page">
                      {/\.(png|jpe?g|webp|svg)$/i.test(a.url) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- customer artwork preview
                        <img src={a.url} alt={a.name} className="h-28 w-full object-contain p-2" />
                      ) : (
                        <span className="grid h-28 place-items-center text-sm font-semibold">{a.name.split(".").pop()?.toUpperCase()} file</span>
                      )}
                      <span className="block truncate border-t border-line px-2 py-1 text-xs">{a.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {job.estimateCents != null && <p className="mt-4 text-sm text-muted">Builder estimate: {money(job.estimateCents)}</p>}
        </section>

        <section className="rounded-[var(--radius-tag)] bg-card p-5">
          <h2 className="display text-3xl">Customer</h2>
          <p className="mt-2 font-semibold">{job.name || "No name given"}{job.company && `, ${job.company}`}</p>
          <p><a href={`mailto:${job.email}`} className="underline">{job.email}</a>{job.phone && ` · ${job.phone}`}</p>
          {job.neededBy && <p className="mt-2">Needed by <strong>{job.neededBy}</strong></p>}
          {order && (
            <p className="mt-4">
              Paid in order <Link href={`/admin/orders/${order.id}`} className="font-mono font-semibold underline">{order.number}</Link> ({money(order.totalCents)})
            </p>
          )}
          {margin != null && <p className="mt-2 text-sm">Margin: <strong>{money(margin)}</strong> ({Math.round((margin / job.priceCents!) * 100)}%)</p>}
        </section>
      </div>

      {(job.status === "requested" || job.status === "quoted") && (
        <section className="rounded-[var(--radius-tag)] bg-card p-5">
          <h2 className="display text-3xl">{job.status === "quoted" ? "Quote sent" : "Send proof & price"}</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Get the proof and your cost from the supplier, then send it here. The customer approves and pays on their own page;
            the supplier gets the purchase order automatically once they pay.
          </p>
          <QuoteForm job={job} suppliers={activeSups} />
        </section>
      )}

      {job.kind !== "poles" && (job.status === "paid" || job.status === "in_production") && (
        <section className="rounded-[var(--radius-tag)] bg-card p-5">
          <h2 className="display text-3xl">Production</h2>
          {po ? (
            <p className="mt-2">
              Purchase order <strong>{po.number}</strong> is <strong>{po.status}</strong>
              {po.trackingNumber && <> · tracking <a href={po.trackingUrl ?? "#"} className="font-mono underline">{po.trackingNumber}</a></>}.{" "}
              {order && <Link href={`/admin/orders/${order.id}`} className="underline">Manage it on the order</Link>}
            </p>
          ) : (
            <form action={setJobSupplier.bind(null, job.id)} className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="label" htmlFor="sup">Supplier</label>
                <select id="sup" name="supplierId" defaultValue={job.supplierId ?? ""} className="field">
                  <option value="">Choose</option>
                  {activeSups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="jc">Your cost ($)</label>
                <input id="jc" name="cost" inputMode="decimal" defaultValue={job.costCents != null ? (job.costCents / 100).toFixed(2) : ""} className="field" />
              </div>
              <button className="btn btn-spruce">Save supplier</button>
              {order && <span className="text-sm text-muted">Then send the PO from <Link href={`/admin/orders/${order.id}`} className="underline">the order</Link>.</span>}
            </form>
          )}
        </section>
      )}

      {job.kind === "poles" && (job.status === "paid" || job.status === "in_production") && (
        <section className="rounded-[var(--radius-tag)] bg-card p-5">
          <h2 className="display text-3xl">Build ticket</h2>
          <p className="mt-1 text-sm text-muted">Built in the Denver shop. Ship it from the order like any other item; the label emails the customer tracking.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {job.status === "paid" && (
              <form action={setJobStatus.bind(null, job.id, "in_production")}><button className="btn btn-spruce">Start build</button></form>
            )}
            <form action={setJobStatus.bind(null, job.id, "shipped")}><button className="btn btn-line">Mark built & shipped</button></form>
            {order && <Link href={`/admin/orders/${order.id}`} className="btn btn-blaze">Ship order {order.number}</Link>}
          </div>
        </section>
      )}

      {(job.status === "requested" || job.status === "quoted") && (
        <form action={setJobStatus.bind(null, job.id, "declined")}>
          <button className="text-sm text-muted underline">Decline this request</button>
        </form>
      )}
    </div>
  );
}
