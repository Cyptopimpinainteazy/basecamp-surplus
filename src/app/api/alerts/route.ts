import { NextResponse } from "next/server";
import { z } from "zod";
import { createAlert } from "@/lib/alerts";

const criteria = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("model"), model: z.string().trim().min(2).max(80) }),
  z.object({
    kind: z.literal("size"),
    lengthIn: z.number().positive().max(600),
    sections: z.number().int().min(1).max(20).optional(),
    diameterMm: z.number().positive().max(25).optional(),
    shape: z.enum(["straight", "prebent", "hub"]).optional(),
    hubArms: z.number().int().min(2).max(8).optional(),
  }),
  z.object({ kind: z.literal("product"), productId: z.string().uuid(), title: z.string().max(120) }),
]);
const body = z.object({ email: z.string().trim().email().max(200), criteria, website: z.string().max(0).optional() });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  try {
    const r = await createAlert(parsed.data.email, parsed.data.criteria, ip);
    return NextResponse.json({
      ok: r.existing ? "You're already on the list for this one." : "Alert set. We'll email you once, as soon as it's listed.",
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't set the alert." }, { status: 429 });
  }
}
