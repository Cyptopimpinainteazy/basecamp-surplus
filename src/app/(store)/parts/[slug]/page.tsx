import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { PolesTabs } from "@/components/poles-tabs";
import { ProductGrid } from "@/components/product-card";
import { StockAlert } from "@/components/stock-alert";
import { site } from "@/lib/config";
import { money } from "@/lib/format";
import { reviewLinker } from "@/lib/articles";
import { allModels, modelBySlug, partKind, partKindLabel, partsForModel, referenceFor, similarModels } from "@/lib/models";
import { confidenceLabel } from "@/lib/tent-reference";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 600;

export async function generateStaticParams() {
  if (!process.env.DATABASE_URL) return [];
  return (await allModels()).map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const m = await modelBySlug(slug);
  if (!m) return {};
  const parts = await partsForModel(m);
  const live = parts.filter((p) => p.status === "active" && p.quantity > 0);
  const kinds = [...new Set(live.map(partKind))].map((k) => partKindLabel[k].toLowerCase());
  const title = `${m.display} Replacement Poles & Parts`;
  return {
    title: title.length + site.name.length + 3 <= 60 ? title : { absolute: title },
    description: live.length
      ? `${live.length} replacement ${kinds.join(", ")} for the ${m.display} tent in stock, with pole sizes and specs. Ships from Denver.`.slice(0, 160)
      : `Replacement poles, rainflies and footprints for the ${m.display} tent: pole count, diameter and sizes, plus an alert when parts are listed.`.slice(0, 160),
    alternates: { canonical: `/parts/${m.slug}` },
    openGraph: { title: `${m.display} replacement poles & parts`, url: `/parts/${m.slug}` },
  };
}

const inch = (n?: number) => (n ? `${Number.isInteger(n) ? n : n.toFixed(1)} in` : "–");

export default async function ModelParts({ params }: Props) {
  const { slug } = await params;
  const m = await modelBySlug(slug);
  if (!m) notFound();
  const [parts, models, reviewFor] = await Promise.all([partsForModel(m), allModels(), reviewLinker()]);
  const ref = referenceFor(m);
  const review = reviewFor(m.model);
  const live = parts.filter((p) => p.status === "active" && p.quantity > 0);
  const poles = parts.filter((p) => p.category === "poles");
  const order = ["poles", "flies", "footprints", "stakes", "other"];
  const groups = order
    .map((k) => ({ k, items: live.filter((p) => partKind(p) === k) }))
    .filter((g) => g.items.length);
  const similar = similarModels(m, models);
  const url = `${site.url}/parts/${m.slug}`;

  const poleLine = ref
    ? [
        ref.poleCount ? `${ref.poleCount} poles` : ref.hub ? "a hubbed pole set" : "",
        ref.hub && ref.poleCount ? "joined at an aluminum hub" : "",
        ref.diametersMm.length ? `${ref.diametersMm.join(" and ")} mm diameter` : "",
        ref.poleSystem,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const faq = [
    {
      q: `What poles does the ${m.display} use?`,
      a: poleLine
        ? `The ${m.display} uses ${poleLine}, according to ${ref!.confidence === "owner" ? "owner reports" : "published specs"}. The North Face doesn't publish pole lengths; measured lengths for poles we stock are listed on this page.`
        : `Published specs for the ${m.display} don't list its poles. Measure your pole's assembled length, sections and diameter and compare with the poles listed here, or use our find-by-size search.`,
    },
    {
      q: `Do you have replacement parts for the ${m.display}?`,
      a: live.length
        ? `Yes. We currently have ${live.length} listed: ${groups.map((g) => `${g.items.length} ${partKindLabel[g.k].toLowerCase()}`).join(", ")}. Stock changes as we list more.`
        : `Nothing is listed for the ${m.display} right now. We're still sorting about a thousand pole sets, so you can leave your email on this page and we'll send one message when a part is listed.`,
    },
    {
      q: `How do I know a replacement pole fits my ${m.display}?`,
      a: `Check the tent's label for the model, then match the pole's position (main, brow or fly), color code, number of sections and assembled length tip to tip. Diameter is printed near a joint on many poles; ${ref?.diametersMm.length ? `the ${m.display} uses ${ref.diametersMm.join(" and ")} mm.` : "calipers work too."}`,
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: site.url },
              { "@type": "ListItem", position: 2, name: "Poles & parts", item: `${site.url}/parts` },
              { "@type": "ListItem", position: 3, name: m.display, item: url },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
          ...(live.length
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "ItemList",
                  name: `${m.display} replacement parts`,
                  itemListElement: live.slice(0, 30).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${site.url}/p/${p.slug}`, name: p.title })),
                },
              ]
            : []),
        ]}
      />

      <section className="topo-lines bg-spruce text-glacier">
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
          <nav aria-label="Breadcrumb" className="text-sm text-glacier/70">
            <Link href="/parts" className="hover:underline">Poles & parts</Link>
            <span aria-hidden> / </span>
            <span>{m.display}</span>
          </nav>
          <h1 className="display mt-4 max-w-5xl text-[clamp(3rem,8vw,6.5rem)] [text-wrap:balance]">{m.display} poles &amp; parts</h1>
          <p className="mt-4 max-w-2xl text-lg text-glacier/85">
            {live.length
              ? `${live.length} replacement ${live.length === 1 ? "part" : "parts"} in stock for the ${m.display}, shipped from Denver.`
              : `Replacement poles, rainflies and footprints for the ${m.display}. Nothing is listed yet; set an alert below.`}
            {poleLine && ` It uses ${poleLine}.`}
          </p>
          {review && (
            <p className="mt-3">
              <Link href={`/reviews/${review}`} className="font-semibold text-glacier underline decoration-blaze decoration-2 underline-offset-4">
                Read our {m.short} review
              </Link>
            </p>
          )}
          <div className="mt-8">
            <PolesTabs active="finder" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        {groups.length > 0 ? (
          <div className="space-y-12">
            {groups.map((g) => (
              <section key={g.k} aria-labelledby={`g-${g.k}`}>
                <h2 id={`g-${g.k}`} className="display mb-4 text-4xl">{partKindLabel[g.k]}</h2>
                <ProductGrid items={g.items} />
              </section>
            ))}
          </div>
        ) : null}

        <div className="mt-10 max-w-3xl">
          <StockAlert
            criteria={{ kind: "model", model: m.model }}
            heading={live.length ? `Need a different part for the ${m.display}?` : `Get an email when ${m.display} parts are listed`}
          />
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-10">
            {poles.some((p) => p.poleSpec?.lengthIn) && (
              <section aria-labelledby="sizes">
                <h2 id="sizes" className="display text-4xl">{m.short} pole sizes</h2>
                <p className="mt-1 text-granite">Measured from poles we&apos;ve stocked for this tent.</p>
                <div className="mt-4 overflow-x-auto rounded-[var(--radius-tag)] bg-snow">
                  <table className="w-full min-w-[560px] text-left text-sm [font-variant-numeric:tabular-nums]">
                    <thead className="border-b border-ice text-granite">
                      <tr>
                        <th scope="col" className="p-3 font-medium">Position</th>
                        <th scope="col" className="p-3 font-medium">Length</th>
                        <th scope="col" className="p-3 font-medium">Sections</th>
                        <th scope="col" className="p-3 font-medium">Diameter</th>
                        <th scope="col" className="p-3 font-medium">Color</th>
                        <th scope="col" className="p-3 font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ice">
                      {poles.map((p) => {
                        const s = p.poleSpec ?? {};
                        const inStock = p.status === "active" && p.quantity > 0;
                        return (
                          <tr key={p.id}>
                            <td className="p-3 font-semibold capitalize"><Link href={`/p/${p.slug}`} className="hover:underline">{s.role || "Pole"}</Link></td>
                            <td className="p-3">{inch(s.lengthIn)}{s.shape === "hub" ? " (longest leg)" : ""}</td>
                            <td className="p-3">{s.sections ?? "–"}</td>
                            <td className="p-3">{s.diameterMm ? `${s.diameterMm} mm` : "–"}</td>
                            <td className="p-3">{s.colorCode || "–"}</td>
                            <td className="p-3">{inStock ? <Link href={`/p/${p.slug}`} className="font-semibold text-blaze-deep">{money(p.priceCents)}</Link> : <span className="text-granite">Sold out</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section aria-labelledby="faq">
              <h2 id="faq" className="display text-4xl">Questions about {m.short} parts</h2>
              <div className="mt-4 divide-y divide-ice rounded-[var(--radius-tag)] bg-snow">
                {faq.map((f) => (
                  <details key={f.q} className="group p-4" open={f === faq[0]}>
                    <summary className="cursor-pointer font-semibold">{f.q}</summary>
                    <p className="mt-2 text-granite">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            {ref && (
              <section aria-labelledby="spec" className="rounded-[var(--radius-tag)] bg-snow p-5">
                <h2 id="spec" className="display text-3xl">{m.short} specs</h2>
                <dl className="mt-3 divide-y divide-ice text-sm">
                  {[
                    ["Sleeps", ref.capacity ? String(ref.capacity) : ""],
                    ["Season", ref.season],
                    ["Poles", ref.poleCount ? `${ref.poleCount}${ref.hub ? " + hub" : ""}` : ref.hub ? "Hubbed set" : ""],
                    ["Pole diameter", ref.diametersMm.length ? ref.diametersMm.map((d) => `${d} mm`).join(" / ") : ""],
                    ["Pole system", ref.poleSystem],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2">
                        <dt className="text-granite">{k}</dt>
                        <dd className="font-medium">{v}</dd>
                      </div>
                    ))}
                </dl>
                {ref.notes && <p className="mt-3 text-sm text-granite">{ref.notes}</p>}
                <p className="mt-3 text-xs text-granite">
                  Source:{" "}
                  <a href={ref.source.url} target="_blank" rel="noopener nofollow" className="underline">{ref.source.title}</a> ({confidenceLabel[ref.confidence].toLowerCase()})
                </p>
              </section>
            )}
            <section className="rounded-[var(--radius-tag)] bg-snow p-5">
              <h2 className="display text-2xl">Not sure it&apos;s a {m.short}?</h2>
              <p className="mt-1 text-sm text-granite">Match by measurement or by photo instead.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/poles/size" className="btn btn-line min-h-10 px-3 text-sm">Find by size</Link>
                <Link href="/poles/photo" className="btn btn-spruce min-h-10 px-3 text-sm">Match from a photo</Link>
              </div>
            </section>
            {similar.length > 0 && (
              <section aria-labelledby="similar" className="rounded-[var(--radius-tag)] bg-snow p-5">
                <h2 id="similar" className="display text-2xl">Tents with similar poles</h2>
                <ul className="mt-2 divide-y divide-ice">
                  {similar.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/parts/${s.slug}`} className="block py-2 hover:text-blaze-deep">{s.display}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
