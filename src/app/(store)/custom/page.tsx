import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: "Custom Tents & Tent Poles: Logo Canopies, Poles Cut to Size",
  description:
    "Custom logo canopy tents with a free proof, tent poles cut to your measurements in Denver, and private-label tents for brands. Get a price in minutes.",
  alternates: { canonical: "/custom" },
};

const options = [
  {
    href: "/custom/canopy-tents",
    kicker: "Free proof · pay after you approve",
    title: "Logo canopy tents",
    body: "10×10 to 10×20 pop-ups printed with your logo, plus walls. Build it, see a live preview and an instant estimate.",
    cta: "Design a canopy",
  },
  {
    href: "/custom/tent-poles",
    kicker: "Priced instantly · built in Denver",
    title: "Poles cut to size",
    body: "Straight, pre-bent or hub assemblies made to your measurements from DAC and Easton tube. Checkout in two minutes.",
    cta: "Build poles",
  },
  {
    href: "/custom/private-label",
    kicker: "Brands, teams and retailers",
    title: "Private-label tents",
    body: "Your logo on a factory-made tent, from about 100 pieces. We source, sample and manage production.",
    cta: "Request a quote",
  },
];

export default function CustomHub() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Custom tents and poles",
          itemListElement: options.map((o, i) => ({ "@type": "ListItem", position: i + 1, url: `${site.url}${o.href}`, name: o.title })),
        }}
      />
      <section className="topo-lines bg-spruce text-glacier">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[.2em] text-blaze">Custom shop</p>
          <h1 className="display mt-3 text-[clamp(3.2rem,9vw,7rem)]">
            Made for <span className="text-cutout [text-shadow:none]">your</span> camp.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-glacier/80">
            Branded canopies for your booth, replacement poles cut to the inch, and tents under your own name.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <ul className="reveal-stagger grid gap-5 md:grid-cols-3">
          {options.map((o) => (
            <li key={o.href}>
              <Link href={o.href} className="tag-card group flex h-full flex-col p-7 transition duration-300 hover:-translate-y-1 motion-reduce:transform-none">
                <span className="text-sm font-semibold text-blaze-deep">{o.kicker}</span>
                <span className="display mt-2 text-5xl">{o.title}</span>
                <span className="mt-3 flex-1 text-muted">{o.body}</span>
                <span className="btn btn-blaze mt-6 self-start">{o.cta}</span>
              </Link>
            </li>
          ))}
        </ul>
        <section className="mt-16 grid gap-6 md:grid-cols-3" aria-label="How custom orders work">
          {[
            ["1. Build it", "Pick sizes and options, upload your logo or enter measurements. Prices update as you go."],
            ["2. Approve it", "Printed items get a proof from the printer. You approve and pay on your own private page."],
            ["3. Track it", "We email tracking as soon as it ships, straight from the maker or our Denver shop."],
          ].map(([t, b]) => (
            <div key={t} className="reveal">
              <h2 className="display text-3xl">{t}</h2>
              <p className="mt-2 text-muted">{b}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
