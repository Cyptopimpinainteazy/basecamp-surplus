import type { Metadata } from "next";
import Link from "next/link";
import { CanopyBuilder } from "@/components/canopy-builder";
import { JsonLd } from "@/components/json-ld";
import { buildSafe } from "@/lib/build-safe";
import { getPricing } from "@/lib/custom-jobs";
import { defaultPricing } from "@/lib/custom-pricing";
import { site } from "@/lib/config";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Custom Logo Canopy Tents 10x10, 10x15, 10x20: Instant Estimate",
  description:
    "Design a custom printed canopy tent with your logo. Live preview, instant estimate, free proof before you pay. Steel or aluminum frames, printed walls.",
  alternates: { canonical: "/custom/canopy-tents" },
};

const faq = [
  ["What file should I upload?", "Vector artwork (AI, EPS, SVG or PDF) prints sharpest at canopy size. A PNG or JPG works if it's at least 300 dpi at the print size; the printer will tell you on the proof if it isn't."],
  ["When do I pay?", "After you approve the proof. You'll get a private link with the proof and final price; payment happens there."],
  ["How long does it take?", "Proofs usually come back within 2 business days. Production is typically 5–10 business days after approval, plus shipping. Tell us your event date and we'll confirm it's doable before you pay."],
  ["Steel or aluminum?", "Steel frames suit occasional events and markets. Commercial aluminum frames are lighter, don't rust and stand up to weekly setups."],
];

export default async function CanopyPage() {
  const pricing = await buildSafe(() => getPricing(), defaultPricing);
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Custom printed logo canopy tents",
            provider: { "@type": "Organization", name: site.name, url: site.url },
            areaServed: "US",
            offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: (pricing.canopy.top["10x10"] / 100).toFixed(2) },
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
          <h1 className="display mt-3 text-[clamp(3rem,8vw,6rem)]">Logo canopy tents</h1>
          <p className="mt-3 max-w-2xl text-lg text-glacier/80">Build it, watch it update, get a free proof. You only pay once you love it.</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <CanopyBuilder pricing={pricing} />
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
