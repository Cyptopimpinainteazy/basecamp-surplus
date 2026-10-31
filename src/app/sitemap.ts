import type { MetadataRoute } from "next";
import { categories, site } from "@/lib/config";
import { buildSafe } from "@/lib/build-safe";
import { publishedArticles } from "@/lib/articles";
import { allActiveProducts, brandsInStock, poleFitmentIndex } from "@/lib/products";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const reviews = await buildSafe(() => publishedArticles(500), []);
  const [items, brands, fitment] = await buildSafe(
    () => Promise.all([allActiveProducts(), brandsInStock(), poleFitmentIndex()]),
    [[], [], []] as unknown as [Awaited<ReturnType<typeof allActiveProducts>>, Awaited<ReturnType<typeof brandsInStock>>, Awaited<ReturnType<typeof poleFitmentIndex>>],
  );
  const now = new Date();
  return [
    { url: site.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${site.url}/shop?condition=used`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${site.url}/poles`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/poles/sizes`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/help`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${site.url}/reviews`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...reviews.map((a) => ({ url: `${site.url}/reviews/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...categories
      .filter((c) => c.slug !== "poles")
      .map((c) => ({ url: `${site.url}/c/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.9 })),
    ...brands.map((b) => ({ url: `${site.url}/brand/${b.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 })),
    ...fitment.map((f) => ({
      url: `${site.url}/poles?model=${encodeURIComponent(f.model)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...items.map((p) => ({
      url: `${site.url}/p/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.slice(0, 5).map((i) => i.url),
    })),
  ];
}
