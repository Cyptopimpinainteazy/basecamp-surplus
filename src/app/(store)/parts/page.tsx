import type { Metadata } from "next";
import Link from "next/link";
import { PoleFinder } from "@/components/pole-finder";
import { PolesTabs } from "@/components/poles-tabs";
import { buildSafe } from "@/lib/build-safe";
import { allModels, fitmentStock, partsIn } from "@/lib/models";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Replacement tent parts by model",
  description:
    "Replacement tent poles, rainflies, footprints and stakes for The North Face tents, listed by tent model. Pole sizes and specs for each model. Ships from Denver.",
  alternates: { canonical: "/parts" },
};

export default async function PartsIndex() {
  const models = await buildSafe(() => allModels(), []);
  const stock = await buildSafe(() => fitmentStock(), []);
  const counts = models.map((m) => partsIn(stock, m).filter((p) => p.status === "active" && p.quantity > 0).length);
  return (
    <>
      <section className="topo-lines bg-spruce text-glacier">
        <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
          <h1 className="display text-[clamp(3rem,9vw,6.5rem)]">Replacement tent parts</h1>
          <p className="mb-8 mt-3 max-w-2xl text-lg text-glacier/80">
            Poles, rainflies, footprints and stakes for North Face tents, by model. Pick your tent for its pole sizes, specs and
            what&apos;s in stock.
          </p>
          <PoleFinder models={models.map((m) => ({ model: m.display, count: 0 }))} compact />
          <div className="mt-8">
            <PolesTabs active="finder" />
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m, i) => (
            <li key={m.slug}>
              <Link href={`/parts/${m.slug}`} className="flex justify-between gap-4 border-b border-line py-2.5 hover:text-blaze-deep">
                <span>{m.display}</span>
                <span className="text-muted">{counts[i] ? `${counts[i]} in stock` : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
