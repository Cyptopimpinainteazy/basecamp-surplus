import type { MetadataRoute } from "next";
import { categories, site } from "@/lib/config";
import { buildSafe } from "@/lib/build-safe";
import { publishedArticles } from "@/lib/articles";
import { allComparisons } from "@/lib/compare";
import { allModels } from "@/lib/models";
import { allActiveProducts, brandsInStock, inventoryStats } from "@/lib/products";
import { seoCollections } from "@/lib/seo-collections";

export const revalidate = 3600;

// Only canonical, indexable URLs: no filtered or paginated variants, no empty
// categories, and no legacy /poles/tents guide URLs (they redirect to /parts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [reviews, items, brands, stats, models] = await buildSafe(
    () => Promise.all([publishedArticles(500), allActiveProducts(), brandsInStock(), inventoryStats(), allModels()]),
    [[], [], [], { total: 0, byCategory: {} as Record<string, number> }, []] as unknown as [
      Awaited<ReturnType<typeof publishedArticles>>,
      Awaited<ReturnType<typeof allActiveProducts>>,
      Awaited<ReturnType<typeof brandsInStock>>,
      Awaited<ReturnType<typeof inventoryStats>>,
      Awaited<ReturnType<typeof allModels>>,
    ],
  );
  const versus = await allComparisons();
  const now = new Date();
  return [
    { url: site.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${site.url}/poles`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/poles/sizes`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/poles/size`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site.url}/poles/photo`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site.url}/help`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${site.url}/about`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${site.url}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${site.url}/wholesale`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${site.url}/returns`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/reviews`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...reviews.map((a) => ({ url: `${site.url}/reviews/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...seoCollections.map((c) => ({ url: `${site.url}/collections/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...categories
      .filter((c) => c.slug !== "poles" && (stats.byCategory[c.slug] ?? 0) > 0)
      .map((c) => ({ url: `${site.url}/c/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.9 })),
    ...brands.map((b) => ({ url: `${site.url}/brand/${b.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 })),
    { url: `${site.url}/compare`, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${site.url}/custom`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${site.url}/custom/canopy-tents`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${site.url}/custom/tent-poles`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${site.url}/custom/private-label`, changeFrequency: "monthly" as const, priority: 0.6 },
    ...versus.map((c) => ({
      url: `${site.url}/compare/${c.slug}`,
      lastModified: c.A.review.updatedAt > c.B.review.updatedAt ? c.A.review.updatedAt : c.B.review.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${site.url}/parts`, lastModified: now, changeFrequency: "daily" as const, priority: 0.9 },
    ...models.map((m) => ({ url: `${site.url}/parts/${m.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...items.map((p) => ({
      url: `${site.url}/p/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.slice(0, 5).map((i) => i.url),
    })),
  ];
}
