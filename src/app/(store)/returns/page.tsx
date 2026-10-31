import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: "Returns & refunds",
  description: `${site.name} accepts returns within 30 days of delivery. How to start a return, who pays return shipping, and when refunds are issued.`,
  alternates: { canonical: "/returns" },
};

export default function Returns() {
  return (
    <PolicyPage title="Returns & refunds" updated>
      <h2>30-day returns</h2>
      <p>You can return an item within 30 days of delivery for a refund to your original payment method.</p>
      <ul>
        <li><strong>New-with-tags items</strong> must be unworn and unused, with all original tags attached.</li>
        <li><strong>Pre-owned items</strong> can be returned if they don&apos;t match the listing&apos;s description or photos.</li>
        <li><strong>Tent poles and parts</strong> can be returned unused if they don&apos;t fit. Check the tent model, length, sections and diameter in the listing before you order; the <Link href="/poles/sizes">pole size chart</Link> helps.</li>
      </ul>
      <h2>How to start a return</h2>
      <ol>
        <li>Open the Help chat or email {site.supportEmail} with your order number and what you&apos;re returning.</li>
        <li>We reply within one business day with return instructions and, where we&apos;re covering it, a prepaid label.</li>
        <li>Pack the item securely with its tags and any included parts, and ship it within 7 days of getting the instructions.</li>
      </ol>
      <h2>Return shipping</h2>
      <p>
        If we made a mistake, such as sending the wrong item or missing a flaw in the listing, return shipping is free. Otherwise
        the cost of the return label is deducted from your refund.
      </p>
      <h2>Refunds</h2>
      <p>
        We inspect returns within two business days of receiving them and issue the refund to your original payment method. Your
        bank may take several more business days to show it. Original shipping charges are refunded only when the return is due to
        our mistake.
      </p>
      <h2>Damaged or wrong items</h2>
      <p>Let us know as soon as possible after delivery, with photos of the item and the packaging, and we&apos;ll make it right.</p>
      <h2>Orders from eBay and other marketplaces</h2>
      <p>Items bought through eBay or another marketplace follow that marketplace&apos;s return process. Start the return there.</p>
    </PolicyPage>
  );
}
