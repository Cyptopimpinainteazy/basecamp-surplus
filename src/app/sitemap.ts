import type { MetadataRoute } from "next";
import { categories, site } from "@/lib/config";
import { buildSafe } from "@/lib/build-safe";
import { publishedArticles } from "@/lib/articles";
import { allActiveProducts, brandsInStock, inventoryStats } from "@/lib/products";
import { poleGuides } from "@/lib/pole-guides";
import { seoCollections } from "@/lib/seo-collections";
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [reviews, items, brands, stats] = await buildSafe(
    () => Promise.all([publishedArticles(500), allActiveProducts(), brandsInStock(), inventoryStats()]),
    [[], [], [], {total:0,byCategory:{} as Record<string,number>}] as const,
  );
  // Do not claim every page was modified each time the sitemap is requested.
  return [
    {url:site.url}, {url:`${site.url}/shop`}, {url:`${site.url}/poles`},
    {url:`${site.url}/poles/sizes`}, {url:`${site.url}/poles/size`},
    {url:`${site.url}/help`}, {url:`${site.url}/reviews`},
    ...seoCollections.map(c=>({url:`${site.url}/collections/${c.slug}`})),
    ...poleGuides.map(t=>({url:`${site.url}/poles/tents/${t.slug}`})),
    ...categories.filter(c=>c.slug!=="poles" && (stats.byCategory[c.slug]??0)>0).map(c=>({url:`${site.url}/c/${c.slug}`})),
    ...brands.map(b=>({url:`${site.url}/brand/${b.slug}`})),
    ...reviews.map(a=>({url:`${site.url}/reviews/${a.slug}`,lastModified:a.updatedAt})),
    ...items.map(p=>({url:`${site.url}/p/${p.slug}`,lastModified:p.updatedAt,images:p.images.slice(0,5).map(i=>i.url)})),
  ];
}
