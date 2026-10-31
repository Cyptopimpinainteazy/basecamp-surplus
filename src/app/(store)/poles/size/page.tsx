import type { Metadata } from "next";
import Link from "next/link";
import { PoleSizeForm } from "@/components/pole-size-form";
import { PolesTabs } from "@/components/poles-tabs";
import { ProductCard } from "@/components/product-card";
import { cmToIn, matchLabel, matchPoles } from "@/lib/pole-match";

type SP = { shape?: string; arms?: string; length?: string; unit?: string; sections?: string; diameter?: string };
type Props = { searchParams: Promise<SP> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: "Find a replacement tent pole by size",
    description:
      "Don't know your tent model? Enter your pole's assembled length, sections and diameter to find replacement tent poles that match. Ships from Denver.",
    alternates: { canonical: "/poles/size" },
    robots: sp.length ? { index: false, follow: true } : undefined,
  };
}

export const dynamic = "force-dynamic";

const shapeOf = (v?: string) => (v === "hub" || v === "prebent" || v === "straight" ? v : undefined);
const num = (v?: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export default async function FindBySize({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = num(sp.length);
  const lengthIn = raw ? (sp.unit === "cm" ? cmToIn(raw) : raw) : undefined;
  const matches = lengthIn
    ? await matchPoles({ lengthIn, shape: shapeOf(sp.shape), hubArms: num(sp.arms), sections: num(sp.sections), diameterMm: num(sp.diameter), toleranceIn: 2 })
    : null;

  return (
    <>
      <section className="topo-lines bg-spruce text-glacier">
        <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
          <h1 className="display text-[clamp(3rem,9vw,6.5rem)]">Find a pole by size</h1>
          <p className="mb-8 mt-3 max-w-2xl text-lg text-glacier/80">
            No tag, no tent name? Measure the broken pole and we&apos;ll show every pole in stock that matches, within 2 inches.
          </p>
          <PoleSizeForm action="/poles/size" values={sp} submitLabel="Find matches" dark />
          <div className="mt-8">
            <PolesTabs active="size" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        {matches && (
          <>
            {matches.length > 0 ? (
              <>
                <p className="mb-5 text-lg">
                  {matches.length} {matches.length === 1 ? "pole matches" : "poles match"} {lengthIn} in
                  {sp.sections ? `, ${sp.sections} sections` : ""}
                  {sp.diameter ? `, ${sp.diameter} mm` : ""}.
                </p>
                <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                  {matches.map((m) => (
                    <li key={m.product.id} className="flex flex-col">
                      <p className={`mb-1.5 text-sm font-semibold ${matchLabel(m) === "Exact match" ? "text-spruce" : "text-granite"}`}>
                        {matchLabel(m)}
                        {m.lengthDiff !== null && m.lengthDiff !== 0 && (
                          <span className="font-normal"> · {m.lengthDiff > 0 ? "+" : ""}{m.lengthDiff} in</span>
                        )}
                      </p>
                      <ProductCard p={m.product} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="rounded-[var(--radius-tag)] bg-snow p-8">
                <p className="text-lg font-semibold">No listed pole matches that size yet.</p>
                <p className="mt-1 max-w-xl text-granite">
                  We have barrels of poles still being sorted. Open the Help chat with these measurements and a photo, and we&apos;ll
                  check the unlisted stock by hand.
                </p>
              </div>
            )}
          </>
        )}

        <section className="mt-14 max-w-3xl" aria-labelledby="how">
          <h2 id="how" className="display text-4xl">Measuring for a match</h2>
          <ol className="prose-review mt-4 list-decimal pl-5 [&>li]:pl-1">
            <li><strong>Length:</strong> assemble every section (tape the broken one together), lay it straight and measure tip to tip.</li>
            <li><strong>Sections:</strong> count every shock-corded piece.</li>
            <li><strong>Pre-bent or hub:</strong> if the sections have factory bends, choose Pre-bent and measure along the curve. If several poles join at an aluminum center piece, choose Hub assembly, count the legs and give the longest leg from hub center to tip.</li>
            <li><strong>Diameter:</strong> look for a printed number near a joint (like 8.7 or 9.5). Otherwise use calipers on the tube, not the joint.</li>
          </ol>
          <p className="mt-4 text-granite">
            A pole within half an inch and with the same sections and diameter usually fits. Longer differences change how tight
            the tent pitches. Know your tent model? <Link href="/poles" className="font-semibold text-ink underline">Search by tent</Link> instead.
          </p>
        </section>
      </div>
    </>
  );
}
