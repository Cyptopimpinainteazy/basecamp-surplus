import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Catalog } from "@/components/catalog";
import { brandsInStock } from "@/lib/products";

type Props = {
  params: Promise<{ brand: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 300;

async function findBrand(slug: string) {
  return (await brandsInStock()).find((b) => b.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand } = await params;
  const b = await findBrand(brand);
  if (!b) return {};
  const used = b.slug === "patagonia";
  return {
    title: used ? `Pre-owned ${b.brand} jackets & gear` : `${b.brand} below retail, new with tags`,
    description: `${b.n} ${b.brand} ${used ? "pre-owned, inspected" : "new-with-tags"} pieces in stock: jackets, tents and more, shipped from Denver. Independent reseller.`,
    alternates: { canonical: `/brand/${b.slug}` },
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
          : `New-with-tags ${b.brand} below retail. We're an independent reseller, not affiliated with ${b.brand}.`}
      </p>
      <Catalog path={`/brand/${b.slug}`} sp={sp} base={{ brand: b.slug }} />
    </div>
  );
}
