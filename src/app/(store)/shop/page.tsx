import type { Metadata } from "next";
import { Catalog } from "@/components/catalog";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const used = sp.condition === "used";
  const hasFilters = Object.keys(sp).some((k) => k !== "condition");
  return {
    title: used ? "Pre-owned Patagonia & outdoor gear" : "Shop all outdoor gear",
    description: used
      ? "Inspected pre-owned Patagonia jackets and outdoor gear, graded and photographed. Ships from Denver."
      : "New-with-tags tents, jackets, snow gear and replacement tent poles below retail. Ships from Denver.",
    alternates: { canonical: used ? "/shop?condition=used" : "/shop" },
    robots: hasFilters ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const sp = await searchParams;
  const used = sp.condition === "used";
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h1 className="display mb-8 text-6xl sm:text-7xl">{used ? "Pre-owned gear" : sp.q ? "Search" : "All gear"}</h1>
      <Catalog path="/shop" sp={sp} />
    </div>
  );
}
