import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PolicyPage } from "@/components/policy-page";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: "About us",
  description: `${site.name} is an independent Denver outdoor gear reseller: new-with-tags surplus tents and jackets, inspected pre-owned Patagonia, and replacement tent poles and parts.`,
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <PolicyPage title="About us" intro={`${site.name} sells outdoor gear that would otherwise sit in a warehouse, out of ${site.city}, Colorado.`}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: `About ${site.name}`,
          url: `${site.url}/about`,
          mainEntity: { "@type": "Organization", name: site.legalName || site.name, url: site.url, email: site.supportEmail },
        }}
      />
      <h2>What we sell</h2>
      <p>
        Most of our stock is new with tags: retail surplus and overstock tents, insulated jackets and snow gear from The North
        Face, Montec, Dope and Fjällräven, sold below original retail. We also sell pre-owned Patagonia that we inspect, grade
        and photograph so you know exactly what you&apos;re getting.
      </p>
      <h2>Keeping tents in service</h2>
      <p>
        A tent with a snapped pole or a worn-out fly usually ends up in a landfill, even when the rest of it is fine. We hold a
        large stock of factory replacement poles, rainflies, footprints and stakes, and we sort and measure them so you can match
        a part to your tent. Search by tent model in the <Link href="/poles">pole and parts finder</Link>, or by measurement in{" "}
        <Link href="/poles/size">find a pole by size</Link>.
      </p>
      <h2>How we describe gear</h2>
      <p>
        Every listing states its condition, and pre-owned items show their wear in the photos. Our <Link href="/reviews">gear reviews</Link>{" "}
        are built from published specs and owner reports, with sources listed, and they cover weaknesses as well as strengths.
      </p>
      <h2>Independent reseller</h2>
      <p>
        We&apos;re not affiliated with, authorized by, or sponsored by any of the brands we sell. Brand names describe the products
        and belong to their owners. Everything we sell is authentic.
      </p>
      <h2>Get in touch</h2>
      <p>
        Questions about an item or an order: use the Help chat or our <Link href="/contact">contact page</Link>. Buying poles or
        tents in quantity: see <Link href="/wholesale">wholesale</Link>.
      </p>
    </PolicyPage>
  );
}
