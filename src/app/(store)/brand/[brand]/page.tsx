import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Catalog } from "@/components/catalog";
import { catalogSeo } from "@/lib/seo";
import { brands as knownBrands } from "@/lib/config";
import { brandsInStock } from "@/lib/products";

type Props = {
  params: Promise<{ brand: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 300;

async function findBrand(slug: string) {
  const stock = (await brandsInStock()).find(b => b.slug === slug);
  const known = knownBrands.find(b => b.slug === slug);
  return stock ?? (known ? {brand: known.name, slug: known.slug, n: 0} : null);
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { brand } = await params;
  const b = await findBrand(brand);
  if (!b) return {};
  const seo = catalogSeo(`/brand/${b.slug}`, await searchParams);
  const used = b.slug === "patagonia";
  return {
    title: `${used ? `Pre-owned ${b.brand} jackets & gear` : `${b.brand} outdoor gear`}${seo.page > 1 ? ` — Page ${seo.page}` : ""}`,
    description: `${b.n} ${b.brand} ${used ? "pre-owned" : "listed"} pieces in stock: jackets, tents and more, shipped from Denver. Independent reseller.`,
    alternates: { canonical: seo.canonical },
    robots: seo.noindex || b.n === 0 ? {index:false,follow:true} : undefined,
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { brand } = await params;
  const b = await findBrand(brand);
  if (!b) notFound();
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h1 className="display text-6xl sm:text-7xl">{b.brand}</h1>
      <p className="mb-8 mt-3 max-w-2xl text-lg text-muted">
        {b.slug === "patagonia"
          ? "Inspected pre-owned Patagonia. Each listing shows its grade and photographs any wear."
          : `${b.brand} outdoor gear. Check each listing for condition, dimensions and availability. We're an independent reseller, not affiliated with ${b.brand}.`}
      </p>
      <Catalog path={`/brand/${b.slug}`} sp={sp} base={{ brand: b.slug }} />
    </div>
  );
}
