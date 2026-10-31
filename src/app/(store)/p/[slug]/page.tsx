import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { StockAlert } from "@/components/stock-alert";
import { Gallery } from "@/components/gallery";
import { JsonLd } from "@/components/json-ld";
import { ConditionMark, ProductGrid } from "@/components/product-card";
import { getCategory, getCondition, isNewCondition, policies, shippingPolicy, site } from "@/lib/config";
import { money, savingsPercent, truncate } from "@/lib/format";
import { getProductBySlug, relatedProducts } from "@/lib/products";
import { reviewForProduct } from "@/lib/articles";
import { toModel } from "@/lib/models";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p || p.status === "draft" || p.status === "archived") return {};
  return {
    title: p.seoTitle || p.title,
    description: p.seoDescription || truncate(p.description, 158),
    keywords: p.keywords,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: {
      type: "website",
      title: p.title,
      description: p.seoDescription,
      images: p.images.slice(0, 4).map((i) => ({ url: i.url, alt: i.alt })),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p || p.status === "draft" || p.status === "archived") notFound();
  const [related, review] = await Promise.all([relatedProducts(p), reviewForProduct(`${p.title} ${p.model}`)]);
  const cat = getCategory(p.category);
  const cond = getCondition(p.condition);
  const available = p.status === "active" && p.quantity > 0;
  const save = savingsPercent(p.priceCents, p.msrpCents);
  const url = `${site.url}/p/${p.slug}`;
  const bulky = shippingPolicy.bulkyCategories.includes(p.category);
  const shipCents = p.priceCents >= shippingPolicy.freeThresholdCents ? 0 : bulky ? shippingPolicy.standardCents.bulky : shippingPolicy.standardCents.light;

  return (
    <article className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.title,
            sku: p.sku,
            mpn: p.sku,
            brand: { "@type": "Brand", name: p.brand },
            model: p.model || undefined,
            color: p.color || undefined,
            size: p.size || undefined,
            material: p.material || undefined,
            category: cat?.googleCategory,
            image: p.images.map((i) => i.url),
            description: p.description,
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: "USD",
              price: (p.priceCents / 100).toFixed(2),
              availability: available ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
              itemCondition: isNewCondition(p.condition) ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
              seller: { "@type": "Organization", name: site.name },
              shippingDetails: {
                "@type": "OfferShippingDetails",
                shippingRate: { "@type": "MonetaryAmount", value: (shipCents / 100).toFixed(2), currency: "USD" },
                shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
                deliveryTime: {
                  "@type": "ShippingDeliveryTime",
                  handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
                  transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 6, unitCode: "DAY" },
                },
              },
              hasMerchantReturnPolicy: {
                "@type": "MerchantReturnPolicy",
                applicableCountry: "US",
                returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
                merchantReturnDays: 30,
                returnMethod: "https://schema.org/ReturnByMail",
                merchantReturnLink: `${site.url}/returns`,
              },
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: site.url },
              {
                "@type": "ListItem",
                position: 2,
                name: cat?.name ?? p.category,
                item: `${site.url}${p.category === "poles" ? "/poles" : `/c/${p.category}`}`,
              },
              { "@type": "ListItem", position: 3, name: p.title, item: url },
            ],
          },
        ]}
      />

      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-granite">
        <Link href="/" className="hover:underline">Home</Link>
        <span aria-hidden> / </span>
        <Link href={p.category === "poles" ? "/poles" : `/c/${p.category}`} className="hover:underline">{cat?.name}</Link>
        <span aria-hidden> / </span>
        <span>{p.brand}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <Gallery images={p.images} title={p.title} />

        <div className="lg:pt-2">
          <Link href={`/brand/${p.brandSlug}`} className="font-semibold text-granite hover:text-ink">{p.brand}</Link>
          <h1 className="display mt-1 text-[2.6rem] sm:text-5xl xl:text-[3.5rem]">{p.title}</h1>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="display text-6xl">{money(p.priceCents)}</span>
            {save > 0 && (
              <span className="text-lg text-granite">
                <s>{money(p.msrpCents)}</s> original retail, {save}% off
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ConditionMark condition={p.condition} />
            {p.size && <span className="font-semibold">Size {p.size}</span>}
            {p.color && <span className="text-granite">{p.color}</span>}
          </div>
          <p className="mt-3 text-granite">{p.conditionNotes || cond.detail}</p>

          <div className="mt-6">
            <AddToCart
              disabled={!available}
              line={{ id: p.id, slug: p.slug, title: p.title, priceCents: p.priceCents, image: p.images[0]?.url, max: p.quantity }}
            />
            <p className="mt-3 text-sm text-granite">
              {available
                ? `${p.quantity > 1 ? `${p.quantity} in stock. ` : "Only one. "}${shipCents === 0 ? "Free shipping" : `Ships for ${money(shipCents)}`}, out of Denver in ${shippingPolicy.handlingDays}.`
                : "This one sold. Similar pieces are below."}
            </p>
            {!available && (
              <div className="mt-4">
                <StockAlert
                  criteria={p.fitment.length ? { kind: "model", model: p.fitment[0] } : { kind: "product", productId: p.id, title: p.title }}
                  heading={p.fitment.length ? `Get an email when parts for the ${p.fitment[0].replace(/^the\s+/i, "")} are back` : "Get an email if this comes back in stock"}
                />
              </div>
            )}
          </div>

          {review && (
            <Link
              href={`/reviews/${review.slug}`}
              className="mt-8 flex items-center justify-between gap-4 rounded-[var(--radius-tag)] border-[1.5px] border-spruce/20 bg-snow p-4 hover:border-spruce"
            >
              <span>
                <span className="block text-sm text-granite">Read our review</span>
                <span className="font-semibold">{review.title}</span>
              </span>
              <span className="display shrink-0 text-2xl text-blaze-deep">{Math.max(1, Math.round(review.body.split(/\s+/).length / 230))} min</span>
            </Link>
          )}

          {p.fitment.length > 0 && (
            <div className="mt-8 rounded-[var(--radius-tag)] bg-snow p-5">
              <h2 className="display text-3xl">Fits these tents</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {p.fitment.map((f) => (
                  <li key={f}>
                    <Link href={`/parts/${toModel(f).slug}`} className="underline underline-offset-2 hover:text-blaze-deep">{f}</Link>
                  </li>
                ))}
              </ul>
              {p.poleSpec?.role && <p className="mt-2 text-granite">Position: {p.poleSpec.role}</p>}
            </div>
          )}

          {p.highlights.length > 0 && (
            <ul className="mt-8 space-y-2">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-3">
                  <span className="mt-2.5 h-1.5 w-3 shrink-0 bg-blaze" aria-hidden />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="prose-gear mt-8">
            {p.description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {p.specs.length > 0 && (
            <div className="mt-8">
              <h2 className="display text-3xl">Specs</h2>
              <dl className="mt-3 divide-y divide-ice rounded-[var(--radius-tag)] bg-snow">
                {p.specs.map((s) => (
                  <div key={s.label} className="grid grid-cols-[minmax(8rem,40%)_1fr] gap-4 px-4 py-2.5">
                    <dt className="text-granite">{s.label}</dt>
                    <dd className="font-medium">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <details className="mt-8 border-t border-ice pt-4">
            <summary className="cursor-pointer font-semibold">Shipping & returns</summary>
            <p className="mt-2 text-granite">{policies.shipping}</p>
            <p className="mt-2 text-granite">{policies.returns}</p>
          </details>
          <p className="mt-6 text-xs text-granite">SKU {p.sku}. {site.name} is an independent reseller and is not affiliated with {p.brand}.</p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related">
          <h2 id="related" className="display mb-6 text-5xl">More {cat?.name.toLowerCase()}</h2>
          <ProductGrid items={related} />
        </section>
      )}
    </article>
  );
}
