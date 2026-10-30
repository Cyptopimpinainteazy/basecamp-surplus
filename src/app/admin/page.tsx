import { and, desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { channelListings, orders, products, supportTickets } from "@/lib/db/schema";
import { money } from "@/lib/format";
import { manualChannels } from "@/lib/channels/crosslist";
import { DelistDone } from "./delist-done";
import { syncEbayIfStale } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await syncEbayIfStale();
  const [toShip, attention, drafts, tickets, delists, stats] = await Promise.all([
    db.select().from(orders).where(eq(orders.status, "paid")).orderBy(orders.createdAt),
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

  const card = "rounded-[var(--radius-tag)] bg-snow p-5";
  return (
    <div className="space-y-8">
      <h1 className="display text-6xl">Today</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={card}><p className="text-granite">Ready to ship</p><p className="display text-5xl">{toShip.length}</p></div>
        <div className={card}><p className="text-granite">Open tickets</p><p className="display text-5xl">{tickets.length}</p></div>
        <div className={card}><p className="text-granite">Live listings</p><p className="display text-5xl">{s.live}</p><p className="text-sm text-granite">{s.units} units, {money(Number(s.value))} at list</p></div>
        <div className={card}><p className="text-granite">Last 30 days</p><p className="display text-5xl">{money(Number(sales30[0].total))}</p><p className="text-sm text-granite">{sales30[0].n} orders</p></div>
      </div>

      {attention.length > 0 && (
        <section className="rounded-[var(--radius-tag)] border-2 border-blaze bg-snow p-5">
          <h2 className="display text-3xl">Needs your attention</h2>
          <ul className="mt-3 divide-y divide-ice">
            {attention.map((o) => (
              <li key={o.id} className="py-3">
                <Link href={`/admin/orders/${o.id}`} className="font-semibold underline">{o.number}</Link>{" "}
                <span className="text-granite">({o.source})</span>
                <p className="text-sm">{o.attentionReason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <div className="flex items-baseline justify-between">
            <h2 className="display text-3xl">Ship these</h2>
            <Link href="/admin/orders" className="text-sm underline">All orders</Link>
          </div>
          {toShip.length === 0 ? (
            <p className="mt-2 text-granite">Nothing waiting. Nice.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ice">
              {toShip.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{o.number} <span className="font-normal text-granite">· {o.source}</span></p>
                    <p className="truncate text-sm text-granite">{o.items.map((i) => i.title).join(", ")}</p>
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
            <p className="mt-2 text-granite">No open tickets. The assistant is handling it.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ice">
              {tickets.slice(0, 6).map((t) => (
                <li key={t.id} className="py-3">
                  <p className="font-semibold">{t.topic}</p>
                  <p className="text-sm text-granite">{t.email}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {delists.length > 0 && (
        <section className={card}>
          <h2 className="display text-3xl">Remove these from other marketplaces</h2>
          <p className="text-granite">They sold out. Delete the listing on that marketplace, then tick it off.</p>
          <ul className="mt-3 divide-y divide-ice">
            {delists.map(({ l, title, sku }) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{manualChannels.find((c) => c.id === l.channel)?.name ?? l.channel}: {title}</p>
                  <p className="text-sm text-granite">{sku}{l.url && <> · <a href={l.url} className="underline" target="_blank" rel="noreferrer">open listing</a></>}</p>
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
