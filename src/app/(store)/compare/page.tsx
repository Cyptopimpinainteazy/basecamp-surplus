import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { allComparisons } from "@/lib/compare";
import { site } from "@/lib/config";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "North Face Tent Comparisons: Which Model to Pick",
  description:
    "Side-by-side comparisons of North Face tents: Rock 22 vs Rock 32, Tadpole vs Rock, Dome 8 vs 2-Meter Dome and more. Size, weight, season and pole compatibility.",
  alternates: { canonical: "/compare" },
};

export default async function CompareIndex() {
  const list = await allComparisons();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "North Face tent comparisons",
          itemListElement: list.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${site.url}/compare/${c.slug}`, name: `${c.A.short} vs ${c.B.short}` })),
        }}
      />
      <section className="topo-lines bg-spruce text-glacier">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6">
          <h1 className="display text-[clamp(3rem,9vw,6.5rem)]">Compare tents</h1>
          <p className="mt-3 max-w-2xl text-lg text-glacier/80">
            Torn between two North Face models? Each comparison puts the published specs side by side, says who each tent suits,
            and whether the poles swap.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        {list.length === 0 ? (
          <p className="text-muted">Comparisons appear here once both tents&apos; reviews are published.</p>
        ) : (
          <ul className="reveal-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <li key={c.slug}>
                <Link href={`/compare/${c.slug}`} className="tag-card flex h-full flex-col p-6 transition hover:-translate-y-0.5">
                  <span className="display text-3xl">
                    {c.A.short} <span className="text-blaze">vs</span> {c.B.short}
                  </span>
                  <span className="mt-2 flex-1 text-muted">{c.summary}</span>
                  <span className="mt-4 text-sm font-semibold underline underline-offset-4">Compare</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-10 text-muted">
          Looking at one tent? Read the <Link href="/reviews" className="font-semibold text-fg underline">tent reviews</Link> or find{" "}
          <Link href="/parts" className="font-semibold text-fg underline">poles and parts by model</Link>.
        </p>
      </div>
    </>
  );
}
