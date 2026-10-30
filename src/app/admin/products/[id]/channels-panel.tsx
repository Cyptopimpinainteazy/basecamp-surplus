"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { listingPack } from "@/lib/channels/crosslist";
import type { ChannelListing, Channel } from "@/lib/db/schema";
import { listOnEbay, markManualListing } from "../../actions";

type Pack = ReturnType<typeof listingPack>;
const fmt = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;

function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="rounded-md border-[1.5px] border-ice px-2.5 py-1 text-sm hover:border-spruce"
    >
      {done ? "Copied" : label}
    </button>
  );
}

function StatusLine({ l }: { l: ChannelListing | null }) {
  if (!l) return <span className="text-granite">Not listed</span>;
  const label = { pending: "Pending", listed: "Listed", needs_delist: "Sold out: remove it there", delisted: "Removed", error: "Error" }[l.status];
  return (
    <span className={l.status === "error" || l.status === "needs_delist" ? "font-semibold text-blaze-deep" : "text-spruce"}>
      {label}
      {l.url && (
        <>
          {" · "}
          <a href={l.url} target="_blank" rel="noreferrer" className="underline">open</a>
        </>
      )}
    </span>
  );
}

function ManualChannel({ productId, pack, listing }: { productId: string; pack: Pack; listing: ChannelListing | null }) {
  const [url, setUrl] = useState(listing?.url ?? "");
  const [pending, start] = useTransition();
  const ch = pack.channel;
  return (
    <details className="border-t border-ice py-3">
      <summary className="flex cursor-pointer items-center justify-between gap-3">
        <span className="font-semibold">{ch.name}</span>
        <StatusLine l={listing} />
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="text-granite">
          {ch.name} has no listing API, so copy each field into their form. Priced at {fmt(pack.priceCents)} to cover their fees.
        </p>
        <div className="flex flex-wrap gap-2">
          {pack.title && <Copy text={pack.title} label="Copy title" />}
          <Copy text={pack.description} label="Copy description" />
          <Copy text={String(pack.priceCents / 100)} label={`Copy price ${fmt(pack.priceCents)}`} />
          {pack.originalPriceCents && <Copy text={String(Math.round(pack.originalPriceCents / 100))} label="Copy original price" />}
          <Copy text={pack.images.join("\n")} label={`Copy ${pack.images.length} photo links`} />
        </div>
        <p className="text-granite">Brand {pack.brand} · {pack.category}{pack.size ? ` · Size ${pack.size}` : ""} · {pack.condition}</p>
        <a href={ch.url} target="_blank" rel="noreferrer" className="inline-block font-semibold underline">Open {ch.name} listing form</a>
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={`${ch.name} listing URL`} className="field h-10 min-h-0 flex-1" />
          <button
            type="button"
            disabled={pending}
            onClick={() => start(() => markManualListing(productId, ch.id as Channel, "listed", url))}
            className="btn btn-spruce min-h-10 px-3 text-sm"
          >
            Mark listed
          </button>
        </div>
        {listing && listing.status !== "delisted" && (
          <button type="button" disabled={pending} onClick={() => start(() => markManualListing(productId, ch.id as Channel, "delisted"))} className="text-granite underline">
            Mark removed
          </button>
        )}
      </div>
    </details>
  );
}

export function ChannelsPanel(props: {
  productId: string;
  live: boolean;
  ebay: { configured: boolean; connected: boolean; priceCents: number; listing: ChannelListing | null };
  feedUrl: string;
  packs: { pack: Pack; listing: ChannelListing | null }[];
}) {
  const [msg, setMsg] = useState<{ ok?: string; error?: string; url?: string } | null>(null);
  const [pending, start] = useTransition();
  const e = props.ebay;

  return (
    <aside className="h-fit space-y-5 xl:sticky xl:top-20">
      <section className="rounded-[var(--radius-tag)] bg-snow p-5">
        <h2 className="display text-3xl">Sell everywhere</h2>
        {!props.live && <p className="mt-1 text-sm text-granite">Publish on your site first. Then push it out to the marketplaces.</p>}

        <div className="mt-4 border-t border-ice py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">eBay</span>
            <StatusLine l={e.listing} />
          </div>
          {e.listing?.error && <p className="mt-2 rounded-md bg-blaze/10 p-2 text-sm">{e.listing.error}</p>}
          {!e.configured || !e.connected ? (
            <p className="mt-2 text-sm text-granite">
              <Link href="/admin/channels" className="underline">Connect eBay</Link> to list in one click and auto-remove when it sells.
            </p>
          ) : (
            <>
              <button
                type="button"
                disabled={!props.live || pending}
                onClick={() => start(async () => setMsg(await listOnEbay(props.productId)))}
                className="btn btn-blaze mt-3 w-full"
              >
                {pending ? "Sending to eBay…" : e.listing?.status === "listed" ? `Update eBay listing (${fmt(e.priceCents)})` : `List on eBay at ${fmt(e.priceCents)}`}
              </button>
              <p className="mt-1 text-xs text-granite">Quantity syncs automatically. When it sells anywhere, eBay updates on its own.</p>
            </>
          )}
          {msg && (
            <p className={`mt-2 text-sm ${msg.error ? "text-blaze-deep" : "text-spruce"}`}>
              {msg.error ?? msg.ok} {msg.url && <a href={msg.url} target="_blank" rel="noreferrer" className="underline">View</a>}
            </p>
          )}
        </div>

        <div className="border-t border-ice py-3">
          <p className="font-semibold">Google Shopping, Facebook & Instagram, Pinterest</p>
          <p className="mt-1 text-sm text-granite">
            {props.live ? "Automatic. Live items are in your product feed, which those platforms pull every few hours." : "Joins the product feed automatically when published."}
          </p>
          <div className="mt-2"><Copy text={props.feedUrl} label="Copy feed URL" /></div>
        </div>

        {props.packs.map(({ pack, listing }) => (
          <ManualChannel key={pack.channel.id} productId={props.productId} pack={pack} listing={listing} />
        ))}
      </section>
    </aside>
  );
}
