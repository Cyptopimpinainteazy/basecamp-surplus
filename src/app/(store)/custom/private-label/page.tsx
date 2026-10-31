import type { Metadata } from "next";
import Link from "next/link";
import { PrivateLabelForm } from "@/components/private-label-form";

export const metadata: Metadata = {
  title: "Private-Label Tents With Your Logo: Factory Sourcing",
  description:
    "Put your brand on factory-made backpacking, family and canopy tents. Low-minimum private label from about 100 pieces, sampling and production managed for you.",
  alternates: { canonical: "/custom/private-label" },
};

export default function PrivateLabelPage() {
  return (
    <>
      <section className="topo-lines bg-spruce text-glacier">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6">
          <p className="text-sm text-glacier/70"><Link href="/custom" className="hover:underline">Custom shop</Link></p>
          <h1 className="display mt-3 text-[clamp(3rem,8vw,6rem)]">Private-label tents</h1>
          <p className="mt-3 max-w-2xl text-lg text-glacier/80">
            Your logo on a proven factory design. Most factories start at 100–500 pieces per design, with samples in 2–4 weeks
            and production in about 2 months.
          </p>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PrivateLabelForm />
        <aside className="space-y-4 text-muted lg:sticky lg:top-24 lg:h-fit">
          <div className="tag-card p-5">
            <h2 className="display text-2xl text-fg">How it works</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
              <li>We match your brief to factories with the right designs and certifications.</li>
              <li>You get a quote with unit price, minimums, sample cost and timeline.</li>
              <li>Paid samples ship to you before any production order.</li>
              <li>We manage production, inspection and freight to your door.</li>
            </ol>
          </div>
          <p className="text-sm">Need branded canopies for an event instead? <Link href="/custom/canopy-tents" className="font-semibold text-fg underline">Design one now</Link>, no minimum.</p>
        </aside>
      </div>
    </>
  );
}
