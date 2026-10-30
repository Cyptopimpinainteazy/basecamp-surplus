import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { JsonLd } from "@/components/json-ld";
import { PoleFinder } from "@/components/pole-finder";
import { ProductGrid } from "@/components/product-card";
import { site } from "@/lib/config";
import { listProducts, poleFitmentIndex, polesForModel } from "@/lib/products";

type Props = { searchParams: Promise<{ model?: string }> };

async function onPolesDomain() {
  const host = (await headers()).get("host")?.replace(/^www\./, "") ?? "";
  return host === site.polesDomain;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { model } = await searchParams;
  const polesHost = await onPolesDomain();
  const base = polesHost ? `https://${site.polesDomain}` : site.url;
  if (model) {
    return {
      title: `Replacement tent pole for ${model}`,
      description: `Factory replacement poles that fit the ${model}. In stock and shipped from Denver.`,
      alternates: { canonical: `${base}/poles?model=${encodeURIComponent(model)}` },
    };
  }
  return {
    title: polesHost ? { absolute: `${site.polesName}: find the pole that fits your tent` } : "Replacement tent poles by tent model",
    description:
      "Snapped a tent pole? Search by tent model to find factory replacement poles for The North Face and other tents. Shipped from Denver.",
    alternates: { canonical: polesHost ? `https://${site.polesDomain}/` : `${site.url}/poles` },
  };
}

export const dynamic = "force-dynamic";

export default async function PolesPage({ searchParams }: Props) {
  const { model } = await searchParams;
  const [index, results, all] = await Promise.all([
    poleFitmentIndex(),
    model ? polesForModel(model) : Promise.resolve(null),
    model ? Promise.resolve([]) : listProducts({ category: "poles", limit: 24 }),
  ]);
  const polesHost = await onPolesDomain();

  return (
    <>
      <section className="bg-spruce text-glacier">
        <div className="topo-lines">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
            <h1 className="display text-[clamp(3.5rem,11vw,8rem)]">
              {model ? `Poles for the ${model}` : "Find the pole that fits your tent"}
            </h1>
            <p className="mb-8 mt-4 max-w-xl text-lg text-glacier/80">
              Factory replacement poles, sorted by the tents they fit. Type your tent model and we&apos;ll show what&apos;s in stock.
            </p>
            <PoleFinder models={index} compact={Boolean(model)} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        {model && results && (
          <>
            {results.length > 0 ? (
              <>
                <p className="mb-5 text-lg">
                  {results.length} {results.length === 1 ? "pole fits" : "poles fit"} the {model}.
                </p>
                <ProductGrid items={results} />
              </>
            ) : (
              <div className="rounded-[var(--radius-tag)] bg-snow p-8">
                <p className="text-lg font-semibold">No listed poles match “{model}” yet.</p>
                <p className="mt-1 max-w-xl text-granite">
                  We&apos;re still listing a truckload of poles. Open the Help chat with your tent model and a photo of the
                  broken pole, and we&apos;ll check the unlisted stock.
                </p>
                <Link href="/poles" className="btn btn-spruce mt-4">See all poles</Link>
              </div>
            )}
          </>
        )}

        {!model && (
          <>
            {index.length > 0 && (
              <section aria-labelledby="by-tent" className="mb-14">
                <h2 id="by-tent" className="display mb-4 text-4xl">Browse by tent</h2>
                <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  {index.map((m) => (
                    <li key={m.model}>
                      <Link href={`/poles?model=${encodeURIComponent(m.model)}`} className="flex justify-between gap-4 border-b border-ice py-2 hover:text-blaze-deep">
                        <span>{m.model}</span>
                        <span className="text-granite">{m.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <h2 className="display mb-5 text-4xl">All poles in stock</h2>
            {all.length > 0 ? <ProductGrid items={all} /> : <p className="text-granite">Poles are being sorted and photographed now.</p>}
          </>
        )}

        <section className="mt-16 max-w-3xl" aria-labelledby="faq">
          <h2 id="faq" className="display text-4xl">Matching a replacement pole</h2>
          <div className="prose-gear mt-4 text-granite">
            <p>Most tent poles carry a printed sleeve or tag with the tent model and the pole&apos;s position (main, brow, fly). Search that model above.</p>
            <p>No tag? Measure the assembled length and count the sections, then send both through the Help chat with a photo. We&apos;ll match it.</p>
          </div>
        </section>
        {polesHost && (
          <p className="mt-10 text-granite">
            {site.polesName} is the tent pole shop of <a href={site.url} className="underline">{site.name}</a>, shipping from Denver.
          </p>
        )}
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How do I find the right replacement tent pole?",
              acceptedAnswer: { "@type": "Answer", text: "Search your tent model. Most poles have a printed tag with the tent model and position (main, brow or fly pole). If there's no tag, measure the assembled length and count sections, then contact support with a photo." },
            },
          ],
        }}
      />
    </>
  );
}
