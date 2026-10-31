import { and, desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { channelListings, customJobs, orders, products, purchaseOrders, supportTickets } from "@/lib/db/schema";
import { jobKindLabel, jobStatusLabel } from "@/lib/custom-labels";
import { money } from "@/lib/format";
import { manualChannels } from "@/lib/channels/crosslist";
import { DelistDone } from "./delist-done";
import { syncEbayIfStale } from "@/lib/orders";
import { alertDemand } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await syncEbayIfStale();
  const demand = await alertDemand();
  const [jobsTodo, openPos] = await Promise.all([
    db.select().from(customJobs).where(inArray(customJobs.status, ["requested", "paid", "in_production"])).orderBy(desc(customJobs.createdAt)).limit(8),
    db.select().from(purchaseOrders).where(inArray(purchaseOrders.status, ["pending", "sent", "confirmed"])).orderBy(purchaseOrders.createdAt).limit(8),
  ]);
  const [toShip, attention, drafts, tickets, delists, stats] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(eq(orders.status, "paid"))
      .orderBy(orders.createdAt)
      // Orders that suppliers ship entirely are tracked under supplier orders instead.
      .then((rows) => rows.filter((o) => !o.items.every((i) => i.fulfillment === "dropship" || i.fulfillment === "made_to_order"))),
    db.select().from(orders).where(eq(orders.status, "needs_attention")).orderBy(desc(orders.createdAt)),
    db.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.status, "draft")),
    db.select().from(supportTickets).where(eq(supportTickets.status, "open")).orderBy(desc(supportTickets.createdAt)),
    db
      .select({ l: channelListings, title: products.title, sku: products.sku })
      .from(channelListings)
      .innerJoin(products, eq(products.id, channelListings.productId))
      .where(eq(channelListings.status, "needs_delist")),
    db
      .select({
        live: sql<number>`count(*) filter (where ${products.status} = 'active')::int`,
        units: sql<number>`coalesce(sum(${products.quantity}) filter (where ${products.status} = 'active'),0)::int`,
        value: sql<number>`coalesce(sum(${products.quantity} * ${products.priceCents}) filter (where ${products.status} = 'active'),0)::bigint`,
      })
      .from(products),
  ]);
  const [s] = stats;
  const sales30 = await db
    .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.totalCents}),0)::bigint` })
    .from(orders)
    .where(and(sql`${orders.createdAt} > now() - interval '30 days'`, inArray(orders.status, ["paid", "label_created", "shipped", "delivered"])));

  const card = "rounded-[var(--radius-tag)] bg-card p-5";
  return (
    <div className="space-y-8">
      <h1 className="display text-6xl">Today</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={card}><p className="text-muted">Ready to ship</p><p className="display text-5xl">{toShip.length}</p></div>
        <div className={card}><p className="text-muted">Open tickets</p><p className="display text-5xl">{tickets.length}</p></div>
        <div className={card}><p className="text-muted">Live listings</p><p className="display text-5xl">{s.live}</p><p className="text-sm text-muted">{s.units} units, {money(Number(s.value))} at list</p></div>
        <div className={card}><p className="text-muted">Last 30 days</p><p className="display text-5xl">{money(Number(sales30[0].total))}</p><p className="text-sm text-muted">{sales30[0].n} orders</p></div>
      </div>

      {attention.length > 0 && (
        <section className="rounded-[var(--radius-tag)] border-2 border-blaze bg-card p-5">
          <h2 className="display text-3xl">Needs your attention</h2>
          <ul className="mt-3 divide-y divide-line">
            {attention.map((o) => (
              <li key={o.id} className="py-3">
                <Link href={`/admin/orders/${o.id}`} className="font-semibold underline">{o.number}</Link>{" "}
                <span className="text-muted">({o.source})</span>
                <p className="text-sm">{o.attentionReason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(jobsTodo.length > 0 || openPos.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className={card}>
            <div className="flex items-baseline justify-between">
              <h2 className="display text-3xl">Custom jobs</h2>
              <Link href="/admin/custom" className="text-sm underline">All jobs</Link>
            </div>
            {jobsTodo.length === 0 ? (
              <p className="mt-2 text-muted">No requests waiting.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {jobsTodo.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{jobKindLabel[j.kind]} <span className="font-mono font-normal text-muted">{j.number}</span></p>
                      <p className="truncate text-sm text-muted">{j.company || j.name || j.email} · {jobStatusLabel[j.status]}</p>
                    </div>
                    <Link href={`/admin/custom/${j.id}`} className="btn btn-line min-h-10 shrink-0 px-4 text-sm">{j.status === "requested" ? "Quote" : "Open"}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={card}>
            <h2 className="display text-3xl">Supplier orders not shipped</h2>
            {openPos.length === 0 ? (
              <p className="mt-2 text-muted">Every purchase order has shipped.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {openPos.map((po) => {
                  const days = Math.floor((Date.now() - po.createdAt.getTime()) / 86_400_000);
                  return (
                    <li key={po.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{po.number}</p>
                        <p className="text-sm text-muted">{po.status === "pending" ? "Not emailed yet" : po.status === "sent" ? "Not confirmed" : "Confirmed, no tracking"} · {days === 0 ? "today" : `${days} day${days > 1 ? "s" : ""} old`}</p>
                      </div>
                      <Link href={`/admin/orders/${po.orderId}`} className={`btn min-h-10 shrink-0 px-4 text-sm ${po.status === "pending" || days >= 3 ? "btn-blaze" : "btn-line"}`}>Open</Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <div className="flex items-baseline justify-between">
            <h2 className="display text-3xl">Ship these</h2>
            <Link href="/admin/orders" className="text-sm underline">All orders</Link>
          </div>
          {toShip.length === 0 ? (
            <p className="mt-2 text-muted">Nothing waiting. Nice.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {toShip.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{o.number} <span className="font-normal text-muted">· {o.source}</span></p>
                    <p className="truncate text-sm text-muted">{o.items.map((i) => i.title).join(", ")}</p>
                  </div>
                  <Link href={`/admin/orders/${o.id}`} className="btn btn-blaze min-h-10 shrink-0 px-4 text-sm">Buy label</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={card}>
          <div className="flex items-baseline justify-between">
            <h2 className="display text-3xl">Support tickets</h2>
            <Link href="/admin/support" className="text-sm underline">Inbox</Link>
          </div>
          {tickets.length === 0 ? (
            <p className="mt-2 text-muted">No open tickets. The assistant is handling it.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {tickets.slice(0, 6).map((t) => (
                <li key={t.id} className="py-3">
                  <p className="font-semibold">{t.topic}</p>
                  <p className="text-sm text-muted">{t.email}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {demand.length > 0 && (
        <section className={card}>
          <h2 className="display text-3xl">Customers are waiting for</h2>
          <p className="text-muted">Email alerts set on parts you haven&apos;t listed yet. Sort and list these first; everyone waiting gets an email automatically when you publish a match.</p>
          <ul className="mt-3 divide-y divide-line">
            {demand.map((d) => (
              <li key={d.label} className="flex items-center justify-between gap-3 py-2.5">
                <span className="font-semibold">{d.label}</span>
                <span className="shrink-0 rounded-full bg-blaze/15 px-3 py-0.5 text-sm font-semibold text-blaze-deep">{d.waiting} waiting</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {delists.length > 0 && (
        <section className={card}>
          <h2 className="display text-3xl">Remove these from other marketplaces</h2>
          <p className="text-muted">They sold out. Delete the listing on that marketplace, then tick it off.</p>
          <ul className="mt-3 divide-y divide-line">
            {delists.map(({ l, title, sku }) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{manualChannels.find((c) => c.id === l.channel)?.name ?? l.channel}: {title}</p>
                  <p className="text-sm text-muted">{sku}{l.url && <> · <a href={l.url} className="underline" target="_blank" rel="noreferrer">open listing</a></>}</p>
                </div>
                <DelistDone productId={l.productId} channel={l.channel} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {drafts[0].n > 0 && (
        <p>
          <Link href="/admin/products?status=draft" className="font-semibold underline">{drafts[0].n} drafts</Link> waiting for review and publish.
        </p>
      )}
    </div>
  );
}
