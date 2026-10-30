import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { channelListings, products, type Channel, type Product } from "../db/schema";
import { ebayConfigured, ebayConnected, publishToEbay, updateEbayQuantity, withdrawEbay } from "./ebay";

const MANUAL: Channel[] = ["poshmark", "mercari", "depop", "geartrade"];

export async function listingsFor(productId: string) {
  return db.select().from(channelListings).where(eq(channelListings.productId, productId));
}

export async function upsertListing(
  productId: string,
  channel: Channel,
  data: Partial<typeof channelListings.$inferInsert>,
) {
  await db
    .insert(channelListings)
    .values({ productId, channel, ...data })
    .onConflictDoUpdate({
      target: [channelListings.productId, channelListings.channel],
      set: { ...data },
    });
}

export async function pushToEbay(p: Product) {
  const [existing] = await db
    .select()
    .from(channelListings)
    .where(and(eq(channelListings.productId, p.id), eq(channelListings.channel, "ebay")));
  try {
    const r = await publishToEbay(p, existing?.offerId);
    await upsertListing(p.id, "ebay", {
      status: "listed",
      externalId: r.listingId,
      offerId: r.offerId,
      url: r.url,
      error: null,
      lastSyncedAt: new Date(),
    });
    if (!p.ebayCategoryId) {
      await db.update(products).set({ ebayCategoryId: r.categoryId }).where(eq(products.id, p.id));
    }
    return { ok: true as const, url: r.url };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await upsertListing(p.id, "ebay", { status: "error", error, lastSyncedAt: new Date() });
    return { ok: false as const, error };
  }
}

/**
 * Called whenever stock changes (site sale, eBay sale, manual edit).
 * Keeps eBay quantity in sync and flags manual marketplaces that need delisting.
 */
export async function syncStock(productIds: string[]) {
  if (productIds.length === 0) return;
  const rows = await db.select().from(products).where(inArray(products.id, productIds));
  const listings = await db.select().from(channelListings).where(inArray(channelListings.productId, productIds));
  const ebayReady = ebayConfigured() && (await ebayConnected());

  for (const p of rows) {
    const mine = listings.filter((l) => l.productId === p.id);
    const soldOut = p.quantity <= 0 || p.status !== "active";

    const ebay = mine.find((l) => l.channel === "ebay" && l.status === "listed" && l.offerId);
    if (ebay && ebayReady) {
      try {
        if (soldOut) {
          await withdrawEbay(ebay.offerId!);
          await upsertListing(p.id, "ebay", { status: "delisted", lastSyncedAt: new Date(), error: null });
        } else {
          await updateEbayQuantity(p.sku, ebay.offerId!, p.quantity);
          await upsertListing(p.id, "ebay", { lastSyncedAt: new Date(), error: null });
        }
      } catch (e) {
        await upsertListing(p.id, "ebay", { error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (soldOut) {
      for (const l of mine.filter((l) => MANUAL.includes(l.channel) && l.status === "listed")) {
        await upsertListing(p.id, l.channel, { status: "needs_delist" });
      }
    }
  }
}
