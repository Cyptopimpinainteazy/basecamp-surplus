import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createPoleCheckout } from "@/lib/custom-jobs";
import { RateLimitError, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.build) return NextResponse.json({ error: "Add at least one pole." }, { status: 400 });
  try {
    return NextResponse.json({ url: await createPoleCheckout(body, clientIp(req)) });
  } catch (e) {
    if (e instanceof ZodError) {
      const i = e.issues[0];
      const where = i?.path[0] === "poles" && typeof i.path[1] === "number" ? `Pole ${i.path[1] + 1}: ` : "";
      return NextResponse.json({ error: `${where}${i?.message ?? "Check the measurements."}` }, { status: 400 });
    }
    if (e instanceof RateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    console.error("[pole checkout]", e);
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Try again in a minute." }, { status: 503 });
  }
}
