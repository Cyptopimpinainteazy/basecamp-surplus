import type { Metadata } from "next";
import Link from "next/link";
import { PolesTabs } from "@/components/poles-tabs";
import { buildSafe } from "@/lib/build-safe";
import { money, slugify } from "@/lib/format";
import { poleSizeChart } from "@/lib/products";
import { SizeFilter } from "./size-filter";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Tent pole sizes by model: lengths, sections & diameters",
  description:
    "Replacement tent pole lengths for The North Face tents, measured from our stock: assembled length, sections, packed length, diameter and color code for each pole.",
  alternates: { canonical: "/poles/sizes" },
};

const inch = (n: number | null) => (n == null ? "–" : `${Number.isInteger(n) ? n : n.toFixed(1)} in`);
const cm = (n: number | null) => (n == null ? "" : `${Math.round(n * 2.54)} cm`);

export default async function PoleSizesPage() {
  const groups = await buildSafe(() => poleSizeChart(), []);
  const listed = groups.filter((g) => g.tent !== "Unmatched poles");

  return (
    <>
      <section className="topo-lines bg-spruce text-glacier">
        <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
          <h1 className="display text-[clamp(3rem,9vw,6.5rem)]">Tent pole sizes</h1>
          <p className="mt-3 max-w-2xl text-lg text-glacier/80">
            Lengths, sections and diameters for every pole we stock, grouped by the tent it fits. Measure your broken pole and
            compare.
          </p>
          <div className="mt-8">
            <PolesTabs active="sizes" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        {groups.length === 0 ? (
          <div className="rounded-[var(--radius-tag)] bg-snow p-8">
            <p className="text-lg font-semibold">The size chart fills in as poles are listed.</p>
            <p className="mt-1 max-w-xl text-granite">
              We&apos;re measuring a truckload of poles now. Need a size today? Open the Help chat with your tent model and we&apos;ll
              check the unlisted stock.
            </p>
          </div>
        ) : (
          <>
            <SizeFilter count={groups.length} />
            {listed.length > 2 && (
              <nav aria-label="Jump to tent" className="mt-5 flex flex-wrap gap-2">
                {listed.map((g) => (
                  <a key={g.tent} href={`#${slugify(g.tent)}`} className="rounded-full border-[1.5px] border-ice bg-snow px-3 py-1 text-sm hover:border-spruce">
                    {g.tent.replace(/^The North Face /, "")}
                  </a>
                ))}
              </nav>
            )}

            <div className="mt-8 space-y-10">
              {groups.map((g) => (
                <section key={g.tent} id={slugify(g.tent)} data-tent={g.tent} className="scroll-mt-24" aria-labelledby={`h-${slugify(g.tent)}`}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                    <h2 id={`h-${slugify(g.tent)}`} className="display text-4xl">{g.tent}</h2>
                    {g.tent !== "Unmatched poles" && (
                      <Link href={`/poles?model=${encodeURIComponent(g.tent)}`} className="text-sm font-semibold underline underline-offset-4">
                        Shop poles for this tent
                      </Link>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-[var(--radius-tag)] bg-snow">
                    <table className="w-full min-w-[760px] text-left text-sm [font-variant-numeric:tabular-nums]">
                      <thead className="border-b border-ice text-granite">
                        <tr>
                          <th scope="col" className="p-3 font-medium">Position</th>
                          <th scope="col" className="p-3 font-medium">Assembled length</th>
                          <th scope="col" className="p-3 font-medium">Sections</th>
                          <th scope="col" className="p-3 font-medium">Packed</th>
                          <th scope="col" className="p-3 font-medium">Diameter</th>
                          <th scope="col" className="p-3 font-medium">Color</th>
                          <th scope="col" className="p-3 font-medium">Material</th>
                          <th scope="col" className="p-3 font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ice">
                        {g.poles.map((p) => (
                          <tr key={p.slug}>
                            <td className="p-3">
                              <Link href={`/p/${p.slug}`} className="font-semibold capitalize hover:underline">
                                {p.role || "Pole"}
                              </Link>
                            </td>
                            <td className="p-3">
                              <span className="font-semibold">{inch(p.lengthIn)}</span>{" "}
                              <span className="text-granite">{cm(p.lengthIn)}</span>
                            </td>
                            <td className="p-3">{p.sections ?? "–"}</td>
                            <td className="p-3">{inch(p.packedLengthIn)}</td>
                            <td className="p-3">{p.diameterMm ? `${p.diameterMm} mm` : "–"}</td>
                            <td className="p-3">{p.colorCode || "–"}</td>
                            <td className="p-3">{p.material || "–"}</td>
                            <td className="p-3">
                              {p.inStock ? (
                                <Link href={`/p/${p.slug}`} className="font-semibold text-blaze-deep hover:underline">{money(p.priceCents)}</Link>
                              ) : (
                                <span className="text-granite">Sold out</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          </>
        )}

        <section className="mt-16 max-w-3xl" aria-labelledby="measure">
          <h2 id="measure" className="display text-4xl">How to measure a tent pole</h2>
          <ol className="prose-review mt-4 list-decimal pl-5 [&>li]:pl-1">
            <li><strong>Assembled length:</strong> snap every section together, lay the pole straight on the floor and measure tip to tip. Pre-bent poles: measure along the curve with a soft tape.</li>
            <li><strong>Sections:</strong> count the shock-corded pieces, including the broken one.</li>
            <li><strong>Packed length:</strong> measure one full section without its ferrule.</li>
            <li><strong>Diameter:</strong> many DAC poles have it printed near a ferrule (for example 8.7 or 9.5 mm). Otherwise use calipers on the tube.</li>
            <li><strong>Color:</strong> note the color on the tips or ferrules. It matches the corner webbing on the tent.</li>
          </ol>
          <p className="mt-4 text-granite">
            Lengths are measured from the poles we stock and can vary by a fraction of an inch between production runs. Older
            versions of a tent sometimes used different poles, so check your tent&apos;s label for the model and year.
          </p>
        </section>
      </div>
    </>
  );
}
