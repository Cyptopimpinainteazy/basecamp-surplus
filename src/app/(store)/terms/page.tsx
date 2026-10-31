import type { Metadata } from "next";
import Link from "next/link";
import { BusinessIdentity, PolicyPage } from "@/components/policy-page";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of sale",
  description: `The terms that apply when you buy from ${site.name}: pricing, payment, shipping, condition, returns and liability.`,
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <PolicyPage title="Terms of sale" updated intro={`These terms apply to orders placed on ${new URL(site.url).hostname}. By placing an order you agree to them.`}>
      <h2>Who you&apos;re buying from</h2>
      <p><BusinessIdentity />. We&apos;re an independent reseller and aren&apos;t affiliated with or authorized by the brands we sell.</p>

      <h2>Prices and availability</h2>
      <p>
        Prices are in US dollars. Most items are one-of-a-kind or limited, and the same stock may be listed on other marketplaces,
        so an item can sell out between when you add it to your cart and when you pay. If that happens, or if an item was listed
        at an obviously wrong price, we&apos;ll contact you and refund that item in full.
      </p>

      <h2>Payment and tax</h2>
      <p>Payment is taken by Stripe when you place your order. Sales tax is added where required and shown at checkout.</p>

      <h2>Shipping</h2>
      <p>
        We ship to US addresses only. {`Orders leave ${site.city} within 1–2 business days`}, and delivery estimates come from the
        carrier and aren&apos;t guaranteed. Risk of loss passes to you on delivery. If a package is lost or arrives damaged, contact us
        and we&apos;ll work with the carrier to replace or refund it.
      </p>

      <h2>Condition and descriptions</h2>
      <p>
        Each listing states its condition. New-with-tags items are unworn with original tags. Pre-owned items are inspected, and
        their wear is described and photographed. Replacement poles and parts list the tent they fit and, where measured, their
        size. Please check fit before ordering.
      </p>

      <h2>Warranty</h2>
      <p>
        We don&apos;t offer a separate warranty beyond our <Link href="/returns">return policy</Link>. Because we&apos;re an independent
        reseller of surplus and pre-owned gear, the original manufacturer may not honor its warranty on items bought from us.
      </p>

      <h2>Returns</h2>
      <p>Returns are covered by our <Link href="/returns">returns policy</Link>.</p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, our liability for any order is limited to the amount you paid for it. Outdoor gear is used
        in conditions that can be dangerous; use it within its stated limits and inspect it before each trip.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the State of Colorado.</p>

      <h2>Contact</h2>
      <p>Questions about these terms: {site.supportEmail}. See also our <Link href="/privacy">privacy policy</Link>.</p>
    </PolicyPage>
  );
}
