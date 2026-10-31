import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { getCategory, site } from "@/lib/config";
import { getArticle, mentionsModel, readingMinutes, relatedArticles, renderArticle } from "@/lib/articles";
import { money } from "@/lib/format";
import { listProducts } from "@/lib/products";
import { comparisonsFor } from "@/lib/compare";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a || a.status !== "published") return {};
  const base = a.seoTitle || a.title;
  // Keep the brand suffix only when the whole title still fits Google's ~60-character display.
  const title = `${base} | ${site.name}`.length <= 60 ? `${base} | ${site.name}` : base;
  const card = `/og/review/${a.slug}`;
  return {
    title: { absolute: title },
    description: a.seoDescription || a.dek,
    alternates: { canonical: `/reviews/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.dek,
      url: `/reviews/${a.slug}`,
      publishedTime: a.publishedAt?.toISOString(),
      modifiedTime: a.updatedAt.toISOString(),
      images: [{ url: a.heroImage ?? card, width: 1200, height: 630, alt: a.title }],
    },
    twitter: { card: "summary_large_image", title: a.title, description: a.dek, images: [a.heroImage ?? card] },
  };
}

const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function ReviewPage({ params }: Props) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a || a.status !== "published") notFound();
  const { html, toc } = renderArticle(a.body);
  const [related, versus] = await Promise.all([relatedArticles(a), comparisonsFor(a.subject)]);
  const stock = a.stockQuery
    ? (await listProducts({ q: a.stockQuery, limit: 24 })).filter((p) => mentionsModel(`${p.title} ${p.model} ${p.fitment.join(" ")}`, a.stockQuery))
    : [];
  // Poles that fit this model also match the stock query; keep the main item first.
  const main = stock.filter((p) => p.category === a.category);
  const parts = stock.filter((p) => p.category !== a.category);
  const fallback = main.length === 0 ? await listProducts({ category: a.category, limit: 3 }) : [];
  const cat = getCategory(a.category);
  const url = `${site.url}/reviews/${a.slug}`;
  const updated = a.updatedAt > (a.publishedAt ?? a.updatedAt) ? a.updatedAt : (a.publishedAt ?? a.updatedAt);

  return (
    <article>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: a.title,
            description: a.dek,
            url,
            datePublished: a.publishedAt?.toISOString(),
            dateModified: updated.toISOString(),
            image: [a.heroImage ?? main[0]?.images[0]?.url, `${site.url}/og/review/${a.slug}`].filter(Boolean),
            author: { "@type": "Organization", name: site.name, url: site.url },
            publisher: { "@type": "Organization", name: site.name, url: site.url },
            about: { "@type": "Product", name: a.subject },
            mainEntityOfPage: url,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: site.url },
              { "@type": "ListItem", position: 2, name: "Reviews", item: `${site.url}/reviews` },
              { "@type": "ListItem", position: 3, name: a.subject, item: url },
            ],
          },
        ]}
      />

      <header className="topo-lines bg-spruce text-glacier">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20">
          <nav aria-label="Breadcrumb" className="text-sm text-glacier/70">
            <Link href="/reviews" className="hover:underline">Reviews</Link>
            <span aria-hidden> / </span>
            <span>{cat?.name}</span>
          </nav>
          <h1 className="display mt-4 max-w-5xl text-[clamp(2.8rem,6.5vw,5.5rem)] [text-wrap:balance]">{a.title}</h1>
          <p className="mt-5 max-w-3xl text-lg text-glacier/85 sm:text-xl">{a.dek}</p>
          <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-glacier/70">
            <span>By the {site.name} gear desk</span>
            <span>Updated {fmtDate(updated)}</span>
            <span>{readingMinutes(a.body)} min read</span>
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {/* Verdict up front: the answer before the essay. */}
          <section aria-labelledby="verdict" className="tag-card overflow-hidden">
            <div className="p-6 sm:p-8">
              <h2 id="verdict" className="display text-4xl">The verdict</h2>
              <p className="mt-3 text-lg">{a.verdict}</p>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-md bg-lichen/45 p-4">
                  <dt className="font-semibold">Best for</dt>
                  <dd className="mt-1">{a.bestFor}</dd>
                </div>
                <div className="rounded-md bg-glacier p-4">
                  <dt className="font-semibold">Look elsewhere if you need</dt>
                  <dd className="mt-1">{a.notFor}</dd>
                </div>
              </dl>
            </div>
            <div className="grid border-t border-ice sm:grid-cols-2">
              <div className="p-6 sm:p-8">
                <h3 className="font-semibold">What it does well</h3>
                <ul className="mt-3 space-y-2">
                  {a.pros.map((p) => (
                    <li key={p} className="flex gap-3"><span className="mt-[0.6em] h-[3px] w-3 shrink-0 bg-spruce" aria-hidden /><span>{p}</span></li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-ice p-6 sm:border-l sm:border-t-0 sm:p-8">
                <h3 className="font-semibold">Where it falls short</h3>
                <ul className="mt-3 space-y-2">
                  {a.cons.map((c) => (
                    <li key={c} className="flex gap-3"><span className="mt-[0.6em] h-[3px] w-3 shrink-0 bg-blaze" aria-hidden /><span>{c}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <div className="prose-review mx-auto mt-6 max-w-[68ch]" dangerouslySetInnerHTML={{ __html: html }} />

          {a.specs.length > 0 && (
            <section aria-labelledby="specs" className="mx-auto mt-14 max-w-[68ch]">
              <h2 id="specs" className="display text-4xl">Specs</h2>
              <dl className="mt-4 divide-y divide-ice rounded-[var(--radius-tag)] bg-snow">
                {a.specs.map((s) => (
                  <div key={s.label} className="grid grid-cols-[minmax(8rem,40%)_1fr] gap-4 px-4 py-2.5">
                    <dt className="text-granite">{s.label}</dt>
                    <dd className="font-medium [font-variant-numeric:tabular-nums]">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {versus.length > 0 && (
            <section aria-labelledby="versus" className="mx-auto mt-14 max-w-[68ch]">
              <h2 id="versus" className="display text-4xl">Compare it</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {versus.map((v) => (
                  <li key={v.slug}>
                    <Link href={`/compare/${v.slug}`} className="inline-block rounded-full bg-snow px-4 py-2 font-semibold hover:bg-lichen/45">
                      {v.A.short} vs {v.B.short}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section aria-labelledby="more" className="mx-auto mt-14 max-w-[68ch]">
              <h2 id="more" className="display text-4xl">More tent reviews</h2>
              <ul className="mt-4 divide-y divide-ice rounded-[var(--radius-tag)] bg-snow">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link href={`/reviews/${r.slug}`} className="block px-4 py-3 hover:bg-glacier">
                      <span className="font-semibold">{r.subject}</span>
                      <span className="block text-sm text-granite">{r.dek.length > 120 ? `${r.dek.slice(0, 117).replace(/\s+\S*$/, "")}…` : r.dek}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/reviews" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">All gear reviews</Link>
            </section>
          )}

          <footer className="mx-auto mt-14 max-w-[68ch] border-t border-ice pt-6 text-sm text-granite">
            <p>
              <strong className="text-ink">How we review.</strong> This review is built from the manufacturer&apos;s published specs,
              major retailer listings and independent testing, listed below. {site.name} sells this product. Our verdict covers
              the weaknesses as well as the strengths either way.
            </p>
            {a.sources.length > 0 && (
              <>
                <p className="mt-4 font-semibold text-ink">Sources</p>
                <ul className="mt-2 space-y-1">
                  {a.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener nofollow" className="underline hover:text-ink">{s.title}</a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </footer>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
          <section aria-labelledby="buy" className="rounded-[var(--radius-tag)] bg-spruce p-5 text-glacier">
            <h2 id="buy" className="display text-3xl">{main.length ? "In stock now" : `Shop ${cat?.name.toLowerCase() ?? "gear"}`}</h2>
            {main.length > 0 ? (
              <p className="mt-1 text-sm text-glacier/75">From our Denver stock, below retail.</p>
            ) : (
              <p className="mt-1 text-sm text-glacier/75">{/^the /i.test(a.subject) ? a.subject : `The ${a.subject}`} isn&apos;t in stock right now. These are.</p>
            )}
            <ul className="mt-4 space-y-3">
              {(main.length ? main : fallback).slice(0, 3).map((p) => (
                <li key={p.id} className="text-ink">
                  <ProductCard p={p} />
                </li>
              ))}
            </ul>
          </section>

          {parts.length > 0 && (
            <section aria-labelledby="parts" className="rounded-[var(--radius-tag)] bg-snow p-5">
              <h2 id="parts" className="display text-2xl">Replacement parts</h2>
              <ul className="mt-3 divide-y divide-ice">
                {parts.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3 py-2">
                    <Link href={`/p/${p.slug}`} className="text-sm font-semibold hover:underline">{p.title}</Link>
                    <span className="shrink-0 font-semibold">{money(p.priceCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {toc.length > 2 && (
            <nav aria-labelledby="toc" className="hidden rounded-[var(--radius-tag)] bg-snow p-5 lg:block">
              <h2 id="toc" className="font-semibold">In this review</h2>
              <ol className="mt-2 space-y-1.5 text-sm">
                <li><a href="#verdict" className="text-granite hover:text-ink">The verdict</a></li>
                {toc.map((t) => (
                  <li key={t.id}><a href={`#${t.id}`} className="text-granite hover:text-ink">{t.text}</a></li>
                ))}
                {a.specs.length > 0 && <li><a href="#specs" className="text-granite hover:text-ink">Specs</a></li>}
              </ol>
            </nav>
          )}
        </aside>
      </div>
    </article>
  );
}
