import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PoleBuilder } from "@/components/pole-builder";
import { buildSafe } from "@/lib/build-safe";
import { getPricing } from "@/lib/custom-jobs";
import { defaultPricing } from "@/lib/custom-pricing";
import { site } from "@/lib/config";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Custom Tent Poles Cut to Size: DAC & Easton Aluminum",
  description:
    "Order replacement tent poles built to your exact length, sections and diameter. Straight, pre-bent and hub assemblies, built in Denver in 3–5 days.",
  alternates: { canonical: "/custom/tent-poles" },
};

const faq = [
  ["What tubing do you use?", "Aluminum tube from the DAC and Easton stock we sort in Denver, matched to the diameter you choose. If we can't match your color, we'll email you before building."],
  ["How do I measure?", "Assemble the pole, lay it straight and measure tip to tip. For pre-bent poles, measure along the curve. For a hub, measure each leg from the hub's center to its tip and count the legs."],
  ["Can you copy my broken pole?", "Yes. Enter its measurements here, or use the photo matcher first to see if a factory pole is already in stock."],
  ["What if it doesn't fit?", "Poles built to the measurements you give us can't be resold, so check them twice. If we built it wrong, we'll rebuild it free."],
];

export default async function PolesPage() {
  const pricing = await buildSafe(() => getPricing(), defaultPricing);
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Custom tent poles cut to size",
            provider: { "@type": "Organization", name: site.name, url: site.url },
            areaServed: "US",
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          },
        ]}
      />
      <section className="topo-lines bg-spruce text-glacier">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6">
          <p className="text-sm text-glacier/70"><Link href="/custom" className="hover:underline">Custom shop</Link></p>
          <h1 className="display mt-3 text-[clamp(3rem,8vw,6rem)]">Poles cut to size</h1>
          <p className="mt-3 max-w-2xl text-lg text-glacier/80">Enter your measurements, see each pole drawn to scale, and check out. Built in our Denver shop.</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <PoleBuilder pricing={pricing} />
        <section className="mt-16 max-w-3xl" aria-labelledby="faq">
          <h2 id="faq" className="display text-4xl">Questions</h2>
          <div className="mt-4 divide-y divide-line rounded-[var(--radius-tag)] bg-card">
            {faq.map(([q, a]) => (
              <details key={q} className="px-4 py-3">
                <summary className="cursor-pointer font-semibold">{q}</summary>
                <p className="mt-2 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
