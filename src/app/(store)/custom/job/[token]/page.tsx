import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { jobByToken } from "@/lib/custom-jobs";
import { jobKindLabel } from "@/lib/custom-labels";
import { money } from "@/lib/format";
import type { CustomJobStatus } from "@/lib/db/schema";
import { JobActions } from "./job-actions";

export const metadata: Metadata = { title: "Your custom order", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const steps: { status: CustomJobStatus[]; label: string }[] = [
  { status: ["requested"], label: "Request received" },
  { status: ["quoted"], label: "Proof & price ready" },
  { status: ["paid", "checkout"], label: "Paid" },
  { status: ["in_production"], label: "In production" },
  { status: ["shipped"], label: "Shipped" },
];

export default async function JobPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ paid?: string }> }) {
  const [{ token }, { paid }] = await Promise.all([params, searchParams]);
  const job = await jobByToken(token);
  if (!job) notFound();
  const closed = job.status === "declined" || job.status === "cancelled";
  const flow = job.kind === "poles" ? steps.filter((s) => !s.status.includes("requested") && !s.status.includes("quoted")) : steps;
  const at = flow.findIndex((s) => s.status.includes(job.status));
  const total = (job.priceCents ?? 0) + job.shippingCents;
  const justPaid = paid === "1" && (job.status === "checkout" || job.status === "quoted");

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
      <p className="text-sm text-muted">{jobKindLabel[job.kind]} · <span className="font-mono">{job.number}</span></p>
      <h1 className="display mt-1 text-5xl sm:text-6xl">
        {justPaid ? "Payment received" : closed ? "This request is closed" : job.status === "quoted" ? "Your proof is ready" : job.status === "requested" ? (job.quotedAt ? "Changes received" : "We're on it") : "Your order"}
      </h1>
      {justPaid && <p className="mt-2 text-lg text-muted">Thanks! Your confirmation email is on the way. This page updates as your order moves along.</p>}

      {!closed && (
        <ol className="mt-8 grid gap-2 sm:grid-cols-5" aria-label="Progress">
          {flow.map((s, i) => {
            const done = justPaid ? i <= flow.findIndex((x) => x.status.includes("paid")) : i <= at;
            return (
              <li key={s.label} className={`rounded-md px-3 py-2 text-sm font-semibold ${done ? "bg-spruce text-glacier" : "bg-card text-muted"}`} aria-current={i === at ? "step" : undefined}>
                {s.label}
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="rounded-[var(--radius-tag)] bg-card p-6">
          <h2 className="display text-3xl">What you ordered</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">{job.summary.map((l) => <li key={l}>{l}</li>)}</ul>
          {job.artwork.length > 0 && (
            <p className="mt-4 text-sm">
              Your files:{" "}
              {job.artwork.map((a, i) => (
                <a key={a.url} href={a.url} target="_blank" rel="noopener" className="underline">{i > 0 && ", "}{a.name}</a>
              ))}
            </p>
          )}
        </section>
        <section className="rounded-[var(--radius-tag)] bg-card p-6">
          <h2 className="display text-3xl">Price</h2>
          {job.priceCents ? (
            <>
              <p className="display mt-2 text-5xl">{money(total)}</p>
              <p className="text-sm text-muted">{job.shippingCents ? `Includes ${money(job.shippingCents)} shipping.` : job.kind === "poles" ? "Plus shipping and tax at checkout." : "Shipping included."} Tax, if any, is added at checkout.</p>
            </>
          ) : (
            <>
              <p className="display mt-2 text-5xl">{money(job.estimateCents)}</p>
              <p className="text-sm text-muted">{job.estimateCents ? "Estimate. Your final price comes with the proof." : "We'll send a quote."}</p>
            </>
          )}
        </section>
      </div>

      {job.proofs.length > 0 && (
        <section className="mt-6 rounded-[var(--radius-tag)] bg-card p-6" aria-labelledby="proof">
          <h2 id="proof" className="display text-3xl">Proof</h2>
          {job.ownerNote && <p className="mt-2 whitespace-pre-line">{job.ownerNote}</p>}
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {job.proofs.map((p) => (
              <li key={p.url}>
                <a href={p.url} target="_blank" rel="noopener" className="block overflow-hidden rounded-md border border-line">
                  {/\.(png|jpe?g|webp)$/i.test(p.url) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- proof image from the printer
                    <img src={p.url} alt={`Proof: ${p.name}`} className="w-full bg-page object-contain" />
                  ) : (
                    <span className="grid h-40 place-items-center bg-page font-semibold">Open {p.name}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {job.status === "quoted" && !justPaid && (
        <div className="mt-6">
          <JobActions token={job.token} total={money(total)} />
        </div>
      )}

      {job.status === "requested" && (
        <p className="mt-6 rounded-[var(--radius-tag)] bg-lichen/45 p-5">
          {job.quotedAt
            ? "Got your changes. We're getting a revised proof from our production partner and will email you when it's ready."
            : "We're checking your artwork and details with our production partner. Expect your proof and final price by email, usually within 2 business days."}{" "}
          Nothing is charged until you approve it.
        </p>
      )}
      {closed && (
        <p className="mt-6 rounded-[var(--radius-tag)] bg-card p-5">
          Questions about this request? Reply to any of our emails, or <Link href="/contact" className="underline">contact us</Link>.
        </p>
      )}
      <p className="mt-10 text-sm text-muted">Keep this link private. It&apos;s how you approve and track this order.</p>
    </div>
  );
}
