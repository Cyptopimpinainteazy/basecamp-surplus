import Link from "next/link";
import { Hero } from "@/components/hero";
import { JsonLd } from "@/components/json-ld";
import { PoleFinder } from "@/components/pole-finder";
import { PoleStory } from "@/components/pole-story";
import { ProductCard, ProductGrid } from "@/components/product-card";
import { GearImage } from "@/components/gear-image";
import { brands as knownBrands, policies, site } from "@/lib/config";
import { buildSafe } from "@/lib/build-safe";
import { brandsInStock, inventoryStats, listProducts, poleFitmentIndex } from "@/lib/products";
import { publishedArticles } from "@/lib/articles";

export const revalidate = 300;

export default async function Home() {
  const [stats, fresh, tents, jackets, poles, brandRows, fitment, used] = await buildSafe(
    () =>
      Promise.all([
        inventoryStats(),
        listProducts({ limit: 8 }),
        listProducts({ category: "tents", limit: 1 }),
        listProducts({ category: "jackets", limit: 1 }),
        listProducts({ category: "poles", limit: 1 }),
        brandsInStock(),
        poleFitmentIndex(),
        listProducts({ condition: "used", limit: 2 }),
      ]),
    [{ total: 0, byCategory: {} as Record<string, number> }, [], [], [], [], [], [], []] as const,
  );

  const latestReviews = await buildSafe(() => publishedArticles(3), []);
  const brandNames = (brandRows.length ? brandRows.map((b) => b.brand) : knownBrands.map((b) => b.name)).filter(
    (b) => b !== "Patagonia",
  );
  const brandsLine =
    brandNames.length > 1 ? `${brandNames.slice(0, -1).join(", ")} and ${brandNames.at(-1)}` : (brandNames[0] ?? "top brands");

  const shelves = [
    { href: "/c/tents", name: "Tents", count: stats.byCategory.tents ?? 0, img: tents[0]?.images[0] },
    { href: "/c/jackets", name: "Jackets & coats", count: stats.byCategory.jackets ?? 0, img: jackets[0]?.images[0] },
    { href: "/poles", name: "Replacement poles", count: stats.byCategory.poles ?? 0, img: poles[0]?.images[0] },
  ];

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: site.name,
            url: site.url,
            potentialAction: {
              "@type": "SearchAction",
              target: `${site.url}/shop?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "OnlineStore",
            name: site.name,
            url: site.url,
            email: site.supportEmail,
            description: site.description,
            address: { "@type": "PostalAddress", addressLocality: site.city, addressRegion: site.region, addressCountry: "US" },
            areaServed: "US",
          },
        ]}
      />
      <Hero inStock={stats.total} brandsLine={brandsLine} featured={fresh.find((p) => p.featured && p.msrpCents) ?? fresh[0] ?? null} />

      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6" aria-labelledby="shelves">
        <h2 id="shelves" className="sr-only">Shop by category</h2>
        <ul className="reveal-stagger grid gap-5 md:grid-cols-3">
          {shelves.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-tag)] bg-line md:aspect-[4/5]">
                  {s.img && (
                    <GearImage src={s.img.url} alt="" sizes="(min-width:768px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.04] motion-reduce:transform-none" />
                  )}
                </div>
                {/* Trail-sign plank: the arrow end points the way in. */}
                <div
                  className="-mt-9 relative ml-4 mr-10 flex items-baseline justify-between gap-3 bg-spruce py-3 pl-5 pr-10 text-glacier shadow-[0_10px_24px_-12px_rgba(19,32,28,.6)] transition-colors group-hover:bg-spruce-2"
                  style={{ clipPath: "polygon(0 0, calc(100% - 26px) 0, 100% 50%, calc(100% - 26px) 100%, 0 100%)" }}
                >
                  <span className="display text-4xl sm:text-5xl">{s.name}</span>
                  <span className="shrink-0 text-sm text-glacier/80">{s.count > 0 ? `${s.count} in stock` : "Restocking"}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6" aria-labelledby="fresh">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="fresh" className="display scroll-stretch text-5xl sm:text-6xl">Just tagged</h2>
          <Link href="/shop" className="font-semibold underline underline-offset-4 hover:text-blaze-deep">See all gear</Link>
        </div>
        {fresh.length > 0 ? (
          <ProductGrid items={fresh} />
        ) : (
          <p className="text-lg text-muted">New stock is being photographed now. Check back shortly.</p>
        )}
      </section>

      <div className="mt-20">
        <PoleStory />
      </div>

      <section className="bg-spruce text-glacier" aria-labelledby="poles">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-center">
          <div>
            <h2 id="poles" className="display text-5xl sm:text-6xl">Snapped a pole?</h2>
            <p className="mt-3 max-w-md text-lg text-glacier/80">
              We have a truckload of factory replacement poles. Type your tent model to see the ones that fit.
            </p>
          </div>
          <div className="text-glacier">
            <PoleFinder models={fitment} />
          </div>
        </div>
      </section>

      {used.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6" aria-labelledby="used">
          <div className="reveal grid gap-8 rounded-[var(--radius-tag)] bg-lichen/45 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:items-center">
            <div>
              <h2 id="used" className="display text-5xl">Pre-owned Patagonia</h2>
              <p className="mt-3">
                Every piece is inspected and graded. Any wear is written up and photographed so you know exactly what
                arrives.
              </p>
              <Link href="/shop?condition=used" className="btn btn-spruce mt-5">Shop pre-owned</Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:gap-5">
              {used.slice(0, 2).map((p) => (
                <li key={p.id}>
                  <ProductCard p={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {latestReviews.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6" aria-labelledby="reviews-h">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 id="reviews-h" className="display scroll-stretch text-5xl">From the gear desk</h2>
            <Link href="/reviews" className="font-semibold underline underline-offset-4 hover:text-blaze-deep">All reviews</Link>
          </div>
          <ul className="reveal-stagger grid gap-5 md:grid-cols-3">
            {latestReviews.map((r) => (
              <li key={r.id}>
                <Link href={`/reviews/${r.slug}`} className="tag-card block h-full p-5 transition duration-300 hover:-translate-y-1 hover:bg-line/40 motion-reduce:transform-none">
                  <p className="text-sm text-muted">{r.subject}</p>
                  <h3 className="display mt-1 text-3xl">{r.title.split(/:\s+/)[1] ? r.title.split(/:\s+/)[1].replace(/^\w/, (c) => c.toUpperCase()) : r.title}</h3>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {brandRows.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6" aria-labelledby="brands">
          <h2 id="brands" className="display mb-5 text-4xl">Shop by brand</h2>
          <ul className="flex flex-wrap gap-x-10 gap-y-3">
            {brandRows.map((b) => (
              <li key={b.slug}>
                <Link href={`/brand/${b.slug}`} className="group inline-flex items-baseline gap-2 text-muted hover:text-fg">
                  <span className="stretch text-3xl uppercase sm:text-4xl">{b.brand}</span>
                  <span className="text-base">{b.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="reveal-stagger mx-auto mt-20 grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3" aria-label="Why buy here">
        {[
          { title: "Ships from Denver", body: `${policies.shipping.split(". ").slice(0, 2).join(". ")}.`, icon: "M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01" },
          { title: "30-day returns", body: `${policies.returns.split(". ")[0]}.`, icon: "M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" },
          { title: "Authentic, always", body: policies.authenticity, icon: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM8.5 12l2.5 2.5 4.5-5" },
        ].map((c) => (
          <div key={c.title} className="tag-card p-6">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-blaze" aria-hidden>
              <path d={c.icon} />
            </svg>
            <h3 className="display mt-3 text-3xl">{c.title}</h3>
            <p className="mt-2 text-muted">{c.body}</p>
          </div>
        ))}
      </section>
    </>
  );
}
