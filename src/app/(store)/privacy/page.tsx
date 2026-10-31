import type { Metadata } from "next";
import Link from "next/link";
import { BusinessIdentity, PolicyPage } from "@/components/policy-page";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What personal information ${site.name} collects, why, who processes it, and how to ask us to see or delete it.`,
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <PolicyPage title="Privacy policy" updated intro={`This policy explains what ${site.name} collects when you use ${new URL(site.url).hostname}, and what we do with it.`}>
      <h2>Who we are</h2>
      <p><BusinessIdentity />. Contact: {site.supportEmail}.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Orders:</strong> your name, email, shipping address, phone number and what you bought. We need these to ship your order and send tracking.</li>
        <li><strong>Payment:</strong> card and wallet payments are handled by Stripe. We never see or store your full card number.</li>
        <li><strong>Help chat:</strong> the messages you send, the email you give us, and your IP address (used to limit abuse). We keep chats so we can follow up on your question.</li>
        <li><strong>Support tickets and wholesale requests:</strong> the details you submit.</li>
        <li><strong>Stock alerts:</strong> your email and what you asked to be notified about.</li>
        <li><strong>Usage data:</strong> anonymous page-view statistics from Vercel Web Analytics, which doesn&apos;t use cookies.</li>
      </ul>

      <h2>Cookies and browser storage</h2>
      <p>
        We don&apos;t use advertising or tracking cookies. Your cart is saved in your browser&apos;s local storage, and an open Help chat in
        session storage, so they survive a page reload. Both stay on your device. Store staff signing in to manage the shop use a
        sign-in cookie.
      </p>

      <h2>Who processes your information for us</h2>
      <ul>
        <li><strong>Stripe</strong> processes payments and may use your details to prevent fraud.</li>
        <li><strong>Shippo</strong> and the shipping carrier (USPS, UPS or FedEx) receive your name, address and phone number to create the label and deliver your order.</li>
        <li><strong>Resend</strong> sends our order, shipping and alert emails.</li>
        <li><strong>Anthropic</strong> provides the AI model behind the Help chat, which processes the messages you type there.</li>
        <li><strong>Vercel</strong> hosts the site, and <strong>Neon</strong> hosts our database.</li>
        <li><strong>eBay</strong> and other marketplaces handle your information under their own policies when you buy from us there.</li>
      </ul>
      <p>We don&apos;t sell your personal information, and we don&apos;t share it for advertising.</p>

      <h2>Emails</h2>
      <p>
        We send order confirmations, shipping notices and replies to your questions. Stock alerts send one email when the item is
        listed, then stop; every alert email has a link to cancel it. We don&apos;t send marketing emails unless you&apos;ve asked for them.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Order records are kept as long as we need them for tax, accounting and warranty or return questions. Chats, tickets and
        alerts are deleted on request, or when we no longer need them.
      </p>

      <h2>Your choices</h2>
      <p>
        Email {site.supportEmail} to ask what information we hold about you, to correct it, or to delete it. We&apos;ll confirm your
        identity using the email address on file and respond within 30 days. Some order records may need to be kept for legal
        reasons.
      </p>

      <h2>Children</h2>
      <p>The site isn&apos;t directed to children under 13, and we don&apos;t knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we&apos;ll update the date at the top of this page. See also our <Link href="/terms">terms of sale</Link>.</p>
    </PolicyPage>
  );
}
