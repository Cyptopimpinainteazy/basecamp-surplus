import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { InputError, createRequest, jobLink } from "@/lib/custom-jobs";
import { RateLimitError, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || (body.kind !== "canopy" && body.kind !== "private_label")) {
    return NextResponse.json({ error: "Unknown request type." }, { status: 400 });
  }
  if (body.website) return NextResponse.json({ ok: true }); // honeypot
  try {
    const job = await createRequest(body, clientIp(req));
    return NextResponse.json({ link: jobLink(job), number: job.number });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Check the form and try again." }, { status: 400 });
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    console.error("[custom request]", e);
    return NextResponse.json({ error: "We couldn't save your request. Try again, or email us." }, { status: 500 });
  }
}
