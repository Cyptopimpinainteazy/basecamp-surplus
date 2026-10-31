import "server-only";
import { and, eq } from "drizzle-orm";
import { shippingPolicy, site } from "./config";
import {
  canopyConfig,
  canopyEstimate,
  canopySummary,
  jobNumber,
  mergePricing,
  poleBuild,
  poleBuildTotal,
  polePrice,
  poleSummary,
  poleTitle,
  privateLabelConfig,
  privateLabelSummary,
  type Pricing,
} from "./custom-pricing";
import { db } from "./db";
import { customJobs, type CustomJob, type CustomJobKind } from "./db/schema";
import { sendEmail } from "./email/send";
import { customJobOwnerEmail, customQuoteEmail, customRequestReceivedEmail } from "./email/templates";
import { rateLimit } from "./rate-limit";
import { getSetting, setSetting } from "./settings";
import { stripe } from "./stripe";

/** Bad input from the customer (shown to them as-is). */
export class InputError extends Error {}

export const jobLink = (j: Pick<CustomJob, "token">) => `${site.url}/custom/job/${j.token}`;
export const adminJobLink = (j: Pick<CustomJob, "id">) => `${site.url}/admin/custom/${j.id}`;
const token = () => Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");

export async function getPricing(): Promise<Pricing> {
  return mergePricing(await getSetting("custom_pricing"));
}
export async function savePricing(p: Pricing) {
  await setSetting("custom_pricing", mergePricing(p));
}

const contact = {
  email: (v: unknown) => String(v ?? "").trim().toLowerCase().slice(0, 200),
  text: (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max),
};

/** Only files our own upload route produced may be attached. */
export function cleanArtwork(files: unknown) {
  if (!Array.isArray(files)) return [];
  return files
    .slice(0, 8)
    .map((f) => ({ url: String(f?.url ?? ""), name: String(f?.name ?? "file").slice(0, 120) }))
    .filter((f) => /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/custom-artwork\//i.test(f.url));
}

export type RequestInput = {
  kind: Extract<CustomJobKind, "canopy" | "private_label">;
  config: unknown;
  email: string;
  name: string;
  company?: string;
  phone?: string;
  neededBy?: string;
  note?: string;
  artwork?: unknown;
};

/** Quote-first jobs (logo canopies, private label): saved as a request, proof and price follow. */
export async function createRequest(input: RequestInput, ip: string) {
  await rateLimit("custom-request", ip, 6, 3600_000, "Too many requests from this connection. Try again in an hour or email us.");
  const email = contact.email(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError("Enter a valid email address.");
  const pricing = await getPricing();
  let summary: string[];
  let config: Record<string, unknown>;
  let quantity = 1;
  let estimateCents: number | null = null;
  if (input.kind === "canopy") {
    const c = canopyConfig.parse(input.config);
    config = c;
    summary = canopySummary(c);
    quantity = c.quantity;
    estimateCents = canopyEstimate(c, pricing).total;
  } else {
    const c = privateLabelConfig.parse(input.config);
    config = c;
    summary = privateLabelSummary(c);
    quantity = c.quantity;
  }
  const neededBy = contact.text(input.neededBy, 10);
  if (neededBy) summary.push(`Needed by: ${neededBy}`);
  const [job] = await db
    .insert(customJobs)
    .values({
      number: jobNumber(),
      kind: input.kind,
      status: "requested",
      email,
      name: contact.text(input.name),
      company: contact.text(input.company),
      phone: contact.text(input.phone, 40),
      config,
      summary,
      artwork: cleanArtwork(input.artwork),
      quantity,
      estimateCents,
      neededBy: /^\d{4}-\d{2}-\d{2}$/.test(neededBy) ? neededBy : "",
      customerNote: contact.text(input.note, 2000),
      token: token(),
      ip,
    })
    .returning();
  await Promise.allSettled([
    sendEmail({ to: job.email, idempotencyKey: `job/${job.id}/received`, ...customRequestReceivedEmail(job, jobLink(job)) }),
    site.ownerEmail
      ? sendEmail({ to: site.ownerEmail, replyTo: job.email, idempotencyKey: `job/${job.id}/owner`, ...customJobOwnerEmail(job, "New custom request", adminJobLink(job)) })
      : Promise.resolve(),
  ]);
  return job;
}

function shippingOptions(subtotalCents: number) {
  const free = subtotalCents >= shippingPolicy.freeThresholdCents;
  const rate = (name: string, amount: number, min: number, max: number) => ({
    shipping_rate_data: {
      type: "fixed_amount" as const,
      display_name: name,
      fixed_amount: { amount, currency: "usd" },
      delivery_estimate: { minimum: { unit: "business_day" as const, value: min }, maximum: { unit: "business_day" as const, value: max } },
    },
  });
  // Build time is added to the carrier estimate so the promise at checkout is honest.
  return [
    rate(free ? "Standard (free), after a 3–5 day build" : "Standard, after a 3–5 day build", free ? 0 : shippingPolicy.standardCents.light, 7, 13),
    rate("Expedited, after a 3–5 day build", shippingPolicy.expeditedCents.light, 5, 9),
  ];
}

/** Pole builds are priced instantly, so they go straight to checkout. */
export async function createPoleCheckout(input: { build: unknown; email?: string }, ip: string) {
  await rateLimit("pole-checkout", ip, 10, 3600_000, "Too many checkouts from this connection. Try again in an hour.");
  const build = poleBuild.parse(input.build);
  const pricing = await getPricing();
  const total = poleBuildTotal(build, pricing);
  const [job] = await db
    .insert(customJobs)
    .values({
      number: jobNumber(),
      kind: "poles",
      status: "checkout",
      email: contact.email(input.email) || "pending@checkout",
      config: build,
      summary: poleSummary(build),
      quantity: build.poles.reduce((s, p) => s + p.quantity, 0),
      estimateCents: total,
      priceCents: total,
      customerNote: build.notes,
      token: token(),
      ip,
    })
    .returning();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: build.poles.map((spec) => ({
      quantity: spec.quantity,
      price_data: {
        currency: "usd",
        unit_amount: polePrice(spec, pricing),
        tax_behavior: "exclusive" as const,
        product_data: {
          name: poleTitle(spec),
          description: `Built to order in Denver${build.tent ? ` for ${build.tent}` : ""}. Job ${job.number}.`,
          metadata: { custom_job_id: job.id, sku: job.number },
        },
      },
    })),
    shipping_address_collection: { allowed_countries: ["US"] },
    shipping_options: shippingOptions(total),
    phone_number_collection: { enabled: true },
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    metadata: { schema_version: "2", custom_job_id: job.id, shipping_method: "standard", package: "pole-tube" },
    success_url: `${site.url}/custom/job/${job.token}?paid=1`,
    cancel_url: `${site.url}/custom/tent-poles`,
  });
  await db.update(customJobs).set({ stripeSessionId: session.id }).where(eq(customJobs.id, job.id));
  return session.url!;
}

export async function jobByToken(t: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(t)) return null;
  const [job] = await db.select().from(customJobs).where(eq(customJobs.token, t));
  return job ?? null;
}

/** Customer approves the proof: one Stripe line for the whole job, shipping as quoted. */
export async function approveAndPay(t: string) {
  const job = await jobByToken(t);
  if (!job) throw new InputError("This link isn't valid.");
  if (job.status !== "quoted" || !job.priceCents) throw new InputError("This job isn't waiting for payment.");
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: job.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: job.priceCents,
          tax_behavior: "exclusive",
          product_data: {
            name: job.kind === "canopy" ? `Custom logo canopy order ${job.number}` : `Custom tent order ${job.number}`,
            description: job.summary.slice(0, 3).join(" · ").slice(0, 480),
            images: job.proofs.filter((p) => /\.(png|jpe?g|webp)$/i.test(p.url)).slice(0, 1).map((p) => p.url),
            // Made by a supplier and shipped from them, never from our shelf.
            metadata: { custom_job_id: job.id, sku: job.number, fulfillment: "made_to_order" },
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: ["US"] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: job.shippingCents ? "Freight, as quoted" : "Shipping included",
          fixed_amount: { amount: job.shippingCents, currency: "usd" },
        },
      },
    ],
    phone_number_collection: { enabled: true },
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    metadata: { schema_version: "2", custom_job_id: job.id, shipping_method: "standard", package: "large-box" },
    success_url: `${site.url}/custom/job/${job.token}?paid=1`,
    cancel_url: `${site.url}/custom/job/${job.token}`,
  });
  await db.update(customJobs).set({ stripeSessionId: session.id, updatedAt: new Date() }).where(eq(customJobs.id, job.id));
  return session.url!;
}

/** Customer asks for proof changes: back to the owner's queue. */
export async function requestChanges(t: string, message: string) {
  const job = await jobByToken(t);
  if (!job) throw new InputError("This link isn't valid.");
  if (job.status !== "quoted") throw new InputError("Changes can only be requested on a proof that's waiting for approval.");
  const note = message.trim().slice(0, 2000);
  if (note.length < 3) throw new InputError("Tell us what to change.");
  const stamp = new Date().toISOString().slice(0, 10);
  const [updated] = await db
    .update(customJobs)
    .set({ status: "requested", customerNote: `${job.customerNote}\n\n[${stamp}] Changes requested: ${note}`.trim(), updatedAt: new Date() })
    .where(and(eq(customJobs.id, job.id), eq(customJobs.status, "quoted")))
    .returning();
  if (updated && site.ownerEmail) {
    await sendEmail({ to: site.ownerEmail, replyTo: job.email, ...customJobOwnerEmail(updated, "Proof changes requested", adminJobLink(updated)) });
  }
  return updated;
}

/** Owner sends proof + final price. */
export async function sendQuote(id: string, q: { priceCents: number; shippingCents: number; costCents: number | null; supplierId: string | null; ownerNote: string; proofs: { url: string; name: string }[] }) {
  const [job] = await db.select().from(customJobs).where(eq(customJobs.id, id));
  if (!job) throw new Error("Job not found");
  if (!["requested", "quoted"].includes(job.status)) throw new Error("Only open requests can be quoted.");
  if (!Number.isSafeInteger(q.priceCents) || q.priceCents < 100) throw new Error("Enter the final price.");
  if (job.kind === "canopy" && !q.proofs.length) throw new Error("Attach the printer's proof before sending.");
  const [updated] = await db
    .update(customJobs)
    .set({
      status: "quoted",
      priceCents: q.priceCents,
      shippingCents: Math.max(0, q.shippingCents),
      costCents: q.costCents,
      supplierId: q.supplierId,
      ownerNote: q.ownerNote.slice(0, 2000),
      proofs: q.proofs.slice(0, 8),
      quotedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(customJobs.id, id))
    .returning();
  const result = await sendEmail({ to: updated.email, replyTo: site.ownerEmail || site.supportEmail, ...customQuoteEmail(updated, jobLink(updated)) });
  return { job: updated, emailed: !("skipped" in result) };
}
