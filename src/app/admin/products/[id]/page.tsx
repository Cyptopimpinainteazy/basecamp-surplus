import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, conditions, packagePresets, site } from "@/lib/config";
import { listingPack, manualChannels } from "@/lib/channels/crosslist";
import { ebayConfigured, ebayConnected, ebayPriceCents } from "@/lib/channels/ebay";
import { listingsFor } from "@/lib/channels/sync";
import { getProductById } from "@/lib/products";
import { ChannelsPanel } from "./channels-panel";
import { ProductEditor } from "./product-editor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> };

export default async function EditProduct({ params, searchParams }: Props) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const p = await getProductById(id);
  if (!p) notFound();
  const [listings, ebayReady] = await Promise.all([listingsFor(p.id), ebayConfigured() ? ebayConnected() : Promise.resolve(false)]);
  const ai = (p.aiRaw ?? {}) as { uncertainties?: string[]; readFromTags?: string[]; msrpConfidence?: string };

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link href="/admin/products" className="underline">Inventory</Link>
        {p.status === "active" && (
          <>
            {" · "}
            <Link href={`/p/${p.slug}`} className="underline" target="_blank">View on site</Link>
          </>
        )}
      </p>
      <h1 className="display text-5xl">{p.title}</h1>
      <p className="mt-1 text-granite">
        <span className="font-mono">{p.sku}</span> · <span className="capitalize">{p.status.replace("_", " ")}</span>
      </p>

      {isNew && (
        <div className="mt-5 rounded-[var(--radius-tag)] bg-lichen/50 p-4">
          <p className="font-semibold">Draft written. Check it over, then publish.</p>
          {ai.uncertainties && ai.uncertainties.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {ai.uncertainties.map((u) => <li key={u}>Double-check: {u}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ProductEditor
          p={p}
          categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
          conditions={conditions.map((c) => ({ value: c.value, label: c.label }))}
          presets={packagePresets.map((x) => ({ value: x.id, label: x.name }))}
          aiNotes={{ readFromTags: ai.readFromTags ?? [], msrpConfidence: ai.msrpConfidence ?? "" }}
        />
        <ChannelsPanel
          productId={p.id}
          live={p.status === "active"}
          ebay={{
            configured: ebayConfigured(),
            connected: ebayReady,
            priceCents: ebayPriceCents(p),
            listing: listings.find((l) => l.channel === "ebay") ?? null,
          }}
          feedUrl={`${site.url}/feeds/products.xml`}
          packs={manualChannels.map((c) => ({
            pack: listingPack(p, c.id),
            listing: listings.find((l) => l.channel === c.id) ?? null,
          }))}
        />
      </div>
    </div>
  );
}
