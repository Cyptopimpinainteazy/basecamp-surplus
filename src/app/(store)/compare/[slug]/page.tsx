import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { mentionsModel } from "@/lib/articles";
import { allComparisons, getComparison, keyDifferences, poleCompatibility, specRows, type Comparison, type Side } from "@/lib/compare";
import { site } from "@/lib/config";
import { toModel } from "@/lib/models";
import { listProducts } from "@/lib/products";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 600;

export async function generateStaticParams() {
  return (await allComparisons()).map((c) => ({ slug: c.slug }));
}

const title = (c: Comparison) => `North Face ${c.A.short} vs ${c.B.short}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getComparison(slug);
  if (!c) return {};
  const t = `${title(c)}: Size, Weight & Poles Compared`;
  return {
    title: { absolute: t.length <= 60 ? t : `${title(c)}: Specs Compared` },
    description: `${c.A.short} or ${c.B.short}? Floor area, weight, season and pole compatibility side by side, with who each tent suits. ${c.summary}`.slice(0, 158).replace(/\s+\S*$/, "") + "…",
    keywords: c.keywords,
    alternates: { canonical: `/compare/${c.slug}` },
    openGraph: { type: "article", title: title(c), description: c.summary, url: `/compare/${c.slug}`, images: [`/og/review/${c.A.review.slug}`] },
  };
}

async function stockFor(s: Side) {
  const rows = await listProducts({ q: s.short, limit: 12 });
  return rows.filter((p) => mentionsModel(`${p.title} ${p.model} ${p.fitment.join(" ")}`, s.short));
}

function Pick({ s, text, accent }: { s: Side; text: string; accent: string }) {
  return (
    <div className={`rounded-[var(--radius-tag)] p-6 ${accent}`}>
      <p className="text-sm font-semibold uppercase tracking-wide opacity-80">Pick the</p>
      <p className="display text-4xl">{s.short}</p>
      <p className="mt-2 text-lg">if {text.charAt(0).toLowerCase() + text.slice(1)}</p>
    </div>
  );
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;
  const c = await getComparison(slug);
  if (!c) notFound();
  const rows = specRows(c);
  const diffs = keyDifferences(c);
  const [stockA, stockB, others] = await Promise.all([stockFor(c.A), stockFor(c.B), allComparisons()]);
  const stock = [...new Map([...stockA, ...stockB].map((p) => [p.id, p])).values()].slice(0, 8);
  const more = others.filter((o) => o.slug !== c.slug && [o.a, o.b].some((x) => x === c.a || x === c.b)).slice(0, 4);
  const sources = [...new Map([...c.A.review.sources, ...c.B.review.sources].map((s) => [s.url, s])).values()];
  const url = `${site.url}/compare/${c.slug}`;
  const faq = [
    {
      q: `Which is bigger, the ${c.A.short} or the ${c.B.short}?`,
      a: diffs.find((d) => /sq ft/.test(d)) ?? `See the floor and height rows in the spec table for each tent's published size.`,
    },
    { q: `Do ${c.A.short} poles fit the ${c.B.short}?`, a: poleCompatibility(c) },
    { q: `Who should buy the ${c.A.short}?`, a: c.A.review.bestFor },
    { q: `Who should buy the ${c.B.short}?`, a: c.B.review.bestFor },
  ];

  return (
    <article>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: `${title(c)} compared`,
            description: c.summary,
            url,
            dateModified: (c.A.review.updatedAt > c.B.review.updatedAt ? c.A.review.updatedAt : c.B.review.updatedAt).toISOString(),
            author: { "@type": "Organization", name: site.name, url: site.url },
            publisher: { "@type": "Organization", name: site.name, url: site.url },
            about: [c.a, c.b].map((name) => ({ "@type": "Product", name })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: site.url },
              { "@type": "ListItem", position: 2, name: "Compare tents", item: `${site.url}/compare` },
              { "@type": "ListItem", position: 3, name: title(c), item: url },
            ],
          },
        ]}
      />

      <header className="topo-lines bg-spruce text-glacier">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6">
          <nav aria-label="Breadcrumb" className="text-sm text-glacier/70">
            <Link href="/compare" className="hover:underline">Compare tents</Link>
          </nav>
          <h1 className="display mt-4 text-[clamp(2.8rem,7vw,6rem)] [text-wrap:balance]">
            {c.A.short} <span className="text-blaze">vs</span> {c.B.short}
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-glacier/85 sm:text-xl">{c.summary}</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <section aria-label="Which to pick" className="reveal-stagger grid gap-4 md:grid-cols-2">
          <Pick s={c.A} text={c.pickA} accent="bg-lichen/45" />
          <Pick s={c.B} text={c.pickB} accent="bg-card" />
        </section>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <section aria-labelledby="diff">
              <h2 id="diff" className="display text-4xl">Key differences</h2>
              <ul className="mt-4 space-y-3 text-lg">
                {diffs.map((d) => (
                  <li key={d} className="flex gap-3"><span className="mt-[0.7em] h-[3px] w-3 shrink-0 bg-blaze" aria-hidden /><span>{d}</span></li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="specs" className="mt-12">
              <h2 id="specs" className="display text-4xl">Specs side by side</h2>
              <div className="mt-4 overflow-x-auto rounded-[var(--radius-tag)] bg-card">
                <table className="w-full min-w-[34rem] text-left [font-variant-numeric:tabular-nums]">
                  <thead>
                    <tr className="border-b border-line text-sm">
                      <th scope="col" className="w-[28%] px-4 py-3 font-semibold text-muted"><span className="sr-only">Spec</span></th>
                      <th scope="col" className="px-4 py-3 font-semibold">{c.A.short}</th>
                      <th scope="col" className="px-4 py-3 font-semibold">{c.B.short}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r) => (
                      <tr key={r.label}>
                        <th scope="row" className="px-4 py-2.5 font-normal text-muted">{r.label}</th>
                        <td className="px-4 py-2.5 font-medium">{r.a ?? <span className="font-normal text-muted">Not published</span>}</td>
                        <td className="px-4 py-2.5 font-medium">{r.b ?? <span className="font-normal text-muted">Not published</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-sm text-muted">From each tent&apos;s review sources. Weights and sizes are as published, not measured by us.</p>
            </section>

            <section aria-labelledby="verdicts" className="mt-12">
              <h2 id="verdicts" className="display text-4xl">What each review found</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[c.A, c.B].map((s) => (
                  <div key={s.review.id} className="tag-card flex flex-col p-6">
                    <h3 className="display text-3xl">{s.short}</h3>
                    <p className="mt-2 flex-1">{s.review.verdict}</p>
                    <p className="mt-3 text-sm"><strong>Watch out for:</strong> {s.review.cons.slice(0, 2).join("; ")}.</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                      <Link href={`/reviews/${s.review.slug}`} className="underline underline-offset-4">Full {s.short} review</Link>
                      <Link href={`/parts/${toModel(s.review.subject).slug}`} className="underline underline-offset-4">{s.short} poles &amp; parts</Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="faq" className="mt-12">
              <h2 id="faq" className="display text-4xl">Questions</h2>
              <div className="mt-4 divide-y divide-line rounded-[var(--radius-tag)] bg-card">
                {faq.map((f, i) => (
                  <details key={f.q} open={i === 0} className="group px-4 py-3">
                    <summary className="cursor-pointer font-semibold">{f.q}</summary>
                    <p className="mt-2 text-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>

            {sources.length > 0 && (
              <footer className="mt-12 border-t border-line pt-6 text-sm text-muted">
                <p>
                  <strong className="text-fg">How we compare.</strong> Numbers come from manufacturer specs, retailer listings and
                  independent reviews cited in each tent&apos;s review. {site.name} sells used and new-with-tags gear, including these
                  models when we have them.
                </p>
                <p className="mt-4 font-semibold text-fg">Sources</p>
                <ul className="mt-2 space-y-1">
                  {sources.map((s) => (
                    <li key={s.url}><a href={s.url} target="_blank" rel="noopener nofollow" className="underline hover:text-fg">{s.title}</a></li>
                  ))}
                </ul>
              </footer>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <section aria-labelledby="stock" className="rounded-[var(--radius-tag)] bg-spruce p-5 text-glacier">
              <h2 id="stock" className="display text-3xl">{stock.length ? "In stock now" : "Not in stock right now"}</h2>
              {stock.length ? (
                <ul className="mt-4 grid grid-cols-2 gap-3 text-fg">
                  {stock.slice(0, 4).map((p) => <li key={p.id}><ProductCard p={p} /></li>)}
                </ul>
              ) : (
                <p className="mt-2 text-glacier/80">Set an alert on either tent&apos;s parts page and we&apos;ll email you when one is listed.</p>
              )}
              <div className="mt-4 flex flex-col gap-2 text-sm font-semibold">
                {[c.A, c.B].map((s) => (
                  <Link key={s.short} href={`/parts/${toModel(s.review.subject).slug}`} className="underline underline-offset-4">
                    {s.short} poles, flies &amp; parts
                  </Link>
                ))}
              </div>
            </section>

            {more.length > 0 && (
              <section aria-labelledby="more" className="rounded-[var(--radius-tag)] bg-card p-5">
                <h2 id="more" className="display text-3xl">More comparisons</h2>
                <ul className="mt-3 divide-y divide-line">
                  {more.map((o) => (
                    <li key={o.slug}><Link href={`/compare/${o.slug}`} className="block py-2.5 font-semibold hover:underline">{o.A.short} vs {o.B.short}</Link></li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </article>
  );
}
