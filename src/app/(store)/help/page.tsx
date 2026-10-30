import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { conditions, policies, site } from "@/lib/config";

export const metadata: Metadata = {
  title: "Shipping, returns & authenticity",
  description: "How shipping, 30-day returns, condition grades and authenticity work at " + site.name + ".",
  alternates: { canonical: "/help" },
};

const sections = [
  { id: "shipping", q: "How fast do you ship?", a: policies.shipping },
  { id: "returns", q: "What's your return policy?", a: policies.returns },
  { id: "authenticity", q: "Is everything authentic?", a: policies.authenticity },
  { id: "sizing", q: "How does sizing run?", a: policies.sizing },
  { id: "payment", q: "How do I pay?", a: policies.payment },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: sections.map((s) => ({ "@type": "Question", name: s.q, acceptedAnswer: { "@type": "Answer", text: s.a } })),
        }}
      />
      <h1 className="display text-6xl sm:text-7xl">Help</h1>
      <p className="mt-3 text-lg text-granite">
        The Help chat answers most questions instantly, including order tracking. You can also email{" "}
        <a href={`mailto:${site.supportEmail}`} className="font-semibold text-ink underline">{site.supportEmail}</a>.
      </p>
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="mt-10 scroll-mt-24">
          <h2 className="display text-4xl">{s.q}</h2>
          <p className="mt-2 text-lg">{s.a}</p>
        </section>
      ))}
      <section id="conditions" className="mt-10 scroll-mt-24">
        <h2 className="display text-4xl">Condition grades</h2>
        <dl className="mt-3 divide-y divide-ice rounded-[var(--radius-tag)] bg-snow">
          {conditions.map((c) => (
            <div key={c.value} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr]">
              <dt className="font-semibold">{c.label}</dt>
              <dd className="text-granite">{c.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
