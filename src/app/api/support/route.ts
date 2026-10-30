import { NextResponse } from "next/server";
import { z } from "zod";
import { supportReply } from "@/lib/support";

export const maxDuration = 60;
const body = z.object({ message: z.string().min(1).max(2000), conversationId: z.string().uuid().optional() });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type a message first." }, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  try {
    const r = await supportReply({ ...parsed.data, ip });
    return NextResponse.json(r);
  } catch (e) {
    console.error("[support]", e);
    const msg = e instanceof Error ? e.message : "";
    const safe = /chat|email|message/i.test(msg) ? msg : "The assistant is unavailable right now. Email us and we'll help directly.";
    return NextResponse.json({ error: safe }, { status: 429 });
  }
}
