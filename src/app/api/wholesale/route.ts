import { and, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { site } from "@/lib/config";
import { db } from "@/lib/db";
import { supportTickets } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { ownerAlertEmail } from "@/lib/email/templates";

const body = z.object({
  name: z.string().trim().min(2).max(100),
  company: z.string().trim().max(120).default(""),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).default(""),
  buyerType: z.string().trim().max(60).default(""),
  interest: z.array(z.string().max(40)).max(6).default([]),
  quantity: z.string().trim().max(120).default(""),
  details: z.string().trim().min(10).max(3000),
  website: z.string().max(0).optional(), // honeypot
});

/** Wholesale and bulk quote requests become support tickets the owner answers from admin. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Add your name, a valid email, and a few words about what you need." }, { status: 400 });
  }
  const d = parsed.data;
  const email = d.email.toLowerCase();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(supportTickets)
    .where(and(eq(supportTickets.email, email), gt(supportTickets.createdAt, new Date(Date.now() - 3600_000))));
  if (n >= 3) return NextResponse.json({ error: "We already have your requests from the last hour. We'll be in touch." }, { status: 429 });

  const who = d.company ? `${d.company} (${d.name})` : d.name;
  const lines = [
    `Wholesale inquiry from ${who}`,
    d.buyerType ? `Buyer type: ${d.buyerType}` : "",
    d.interest.length ? `Interested in: ${d.interest.join(", ")}` : "",
    d.quantity ? `Quantity: ${d.quantity}` : "",
    d.phone ? `Phone: ${d.phone}` : "",
  ].filter(Boolean);
  const summary = [...lines, "", d.details].join("\n");

  await db.insert(supportTickets).values({ name: d.name, email, topic: `Wholesale: ${who}`.slice(0, 200), summary });
  if (site.ownerEmail) {
    await sendEmail({ to: site.ownerEmail, replyTo: email, ...ownerAlertEmail(`Wholesale inquiry: ${who}`, summary.split("\n")) }).catch(
      (e) => console.error("[wholesale alert]", e),
    );
  }
  return NextResponse.json({ ok: "Thanks. We'll reply by email within one business day with availability and pricing." });
}
