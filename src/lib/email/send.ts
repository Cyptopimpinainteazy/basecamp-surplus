import "server-only";
import { site } from "../config";

// Transactional email via Resend's HTTP API.
export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string; idempotencyKey?: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set; skipped "${opts.subject}" to ${opts.to}`);
    return { skipped: true as const };
  }
  const from = process.env.EMAIL_FROM ?? `${site.name} <orders@${new URL(site.url).hostname}>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(opts.idempotencyKey ? {"Idempotency-Key":opts.idempotencyKey}: {}) },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo ?? site.supportEmail,
    }),
  });
  if (!res.ok) throw new Error(`Email send failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string };
}
