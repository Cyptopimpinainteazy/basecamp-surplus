import type { Metadata } from "next";
import Link from "next/link";
import { CopyText } from "@/components/copy-text";
import { JsonLd } from "@/components/json-ld";
import { PolicyPage } from "@/components/policy-page";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Contact ${site.name} in ${site.city}, Colorado about orders, returns, replacement tent poles or wholesale.`,
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  return (
    <PolicyPage title="Contact us" intro="The Help chat answers most questions instantly, including order status and tracking. For anything else, reach us here.">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: site.legalName || site.name,
          url: site.url,
          email: site.supportEmail,
          ...(site.businessPhone ? { telephone: site.businessPhone } : {}),
          address: site.businessAddress
            ? { "@type": "PostalAddress", streetAddress: site.businessAddress, addressCountry: "US" }
            : { "@type": "PostalAddress", addressLocality: site.city, addressRegion: site.region, addressCountry: "US" },
          contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: site.supportEmail, availableLanguage: "English" },
        }}
      />
      <dl className="not-prose grid gap-5 rounded-[var(--radius-tag)] bg-card p-6">
        <div>
          <dt className="text-sm font-semibold text-muted">Email</dt>
          <dd className="mt-1 text-lg"><CopyText text={site.supportEmail} /></dd>
        </div>
        {site.businessPhone && (
          <div>
            <dt className="text-sm font-semibold text-muted">Phone</dt>
            <dd className="mt-1 text-lg"><CopyText text={site.businessPhone} /></dd>
          </div>
        )}
        <div>
          <dt className="text-sm font-semibold text-muted">{site.businessAddress ? "Address" : "Location"}</dt>
          <dd className="mt-1 text-lg">{site.businessAddress || `${site.city}, Colorado (online only, no walk-in store)`}</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-muted">Hours</dt>
          <dd className="mt-1">{site.businessHours}. We reply to email within one business day.</dd>
        </div>
      </dl>
      <h2>Order questions</h2>
      <p>Include your order number (it starts with BC-) and the email you used at checkout so we can find it quickly.</p>
      <h2>Returns</h2>
      <p>See our <Link href="/returns">returns policy</Link> for how to start a return.</p>
      <h2>Buying in quantity</h2>
      <p>Repair shops, outfitters and groups can request a quote on our <Link href="/wholesale">wholesale page</Link>.</p>
    </PolicyPage>
  );
}
