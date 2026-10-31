import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/config";
import { WholesaleForm } from "./wholesale-form";

export const metadata: Metadata = {
  title: "Wholesale tent poles & bulk gear",
  description: `Bulk replacement tent poles, rainflies, stakes and tents for repair shops, outfitters, rentals and scout groups. Request a quote from ${site.name} in Denver.`,
  alternates: { canonical: "/wholesale" },
};

export default function Wholesale() {
  return (
    <>
      <section className="topo-lines bg-spruce text-glacier">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <h1 className="display text-[clamp(3rem,9vw,6.5rem)]">Poles and parts in bulk</h1>
          <p className="mt-4 max-w-2xl text-lg text-glacier/85">
            We hold around a thousand factory replacement pole sets plus rainflies, footprints, stakes and complete tents. Repair
            shops, outfitters, rental fleets and scout groups can buy by the lot.
          </p>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="prose-review">
          <h2>Who buys from us</h2>
          <ul>
            <li><strong>Gear repair shops</strong> stocking common replacement poles</li>
            <li><strong>Outfitters and rental fleets</strong> keeping tents in service</li>
            <li><strong>Scout troops, camps and schools</strong> repairing group tents</li>
            <li><strong>Resellers</strong> buying mixed lots</li>
          </ul>
          <h2>How it works</h2>
          <p>
            Tell us the tent models or pole sizes you need and roughly how many. We reply within one business day with what we
            have and lot pricing. Pickup in {site.city} can save on shipping for large orders.
          </p>
          <p>
            Looking for one pole? Use the <Link href="/poles">pole and parts finder</Link> or{" "}
            <Link href="/poles/size">find a pole by size</Link> instead.
          </p>
        </div>
        <WholesaleForm />
      </div>
    </>
  );
}
