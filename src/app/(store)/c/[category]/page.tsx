import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Catalog } from "@/components/catalog";
import { JsonLd } from "@/components/json-ld";
import { countProducts } from "@/lib/products";
import { catalogSeo, serializeParams } from "@/lib/seo";
import { categories, getCategory, site } from "@/lib/config";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 300;
export function generateStaticParams() {
  return categories.filter((c) => c.slug !== "poles").map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category } = await params;
  const sp = await searchParams;
  const c = getCategory(category);
  if (!c) return {};
  const seo = catalogSeo(`/c/${c.slug}`, sp);
  const count = await countProducts({ category: c.slug });
  return {
    title: `${c.heading}${seo.page > 1 ? ` — Page ${seo.page}` : ""}`,
    description: `${c.blurb} Below retail, shipped from Denver.`.slice(0, 160),
    alternates: { canonical: seo.canonical },
    robots: seo.noindex || count === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  if (category === "poles") {
    const query = serializeParams(await searchParams);
    redirect(query ? `/poles?${query}` : "/poles");
  }
  const c = getCategory(category);
  if (!c) notFound();
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: site.url },
            { "@type": "ListItem", position: 2, name: c.name, item: `${site.url}/c/${c.slug}` },
          ],
        }}
      />
      <h1 className="display text-6xl sm:text-7xl">{c.heading}</h1>
      <p className="mb-8 mt-3 max-w-2xl text-lg text-granite">{c.blurb}</p>
      <Catalog path={`/c/${c.slug}`} sp={sp} base={{ category: c.slug }} sizeCategory={c.slug} />
    </div>
  );
}
