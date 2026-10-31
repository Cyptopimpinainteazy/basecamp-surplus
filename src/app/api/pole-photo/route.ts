import { NextResponse } from "next/server";
import { z } from "zod";
import { PhotoLimitError, runPhotoCheck } from "@/lib/pole-photo";

export const maxDuration = 60;

// Vercel caps request bodies at 4.5 MB; the browser shrinks each photo well under this.
const MAX_B64 = 1_400_000;

const optNum = (min: number, max: number, int = false) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    (int ? z.number().int() : z.number()).min(min).max(max).optional(),
  );

const body = z.object({
  images: z
    .array(
      z.object({
        mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        data: z.string().min(100).max(MAX_B64).regex(/^[A-Za-z0-9+/]+=*$/),
      }),
    )
    .min(1)
    .max(3),
  tent: z.string().trim().max(80).optional(),
  length: optNum(5, 600),
  unit: z.enum(["in", "cm"]).default("in"),
  sections: optNum(1, 20, true),
  diameter: optNum(3, 25),
  shape: z.enum(["straight", "prebent", "hub", ""]).optional(),
  arms: optNum(2, 8, true),
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const tooBig = parsed.error.issues.some((i) => i.path.includes("data") && i.code === "too_big");
    return NextResponse.json(
      { error: tooBig ? "That photo is too large. Try a smaller one." : "Add one to three photos (JPG, PNG or WebP)." },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const lengthIn = d.length ? (d.unit === "cm" ? Math.round((d.length / 2.54) * 10) / 10 : d.length) : undefined;
  try {
    const id = await runPhotoCheck(ip, d.images, {
      tent: d.tent || undefined,
      lengthIn,
      sections: d.sections,
      diameterMm: d.diameter,
      shape: d.shape || undefined,
      hubArms: d.shape === "hub" ? d.arms : undefined,
    });
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof PhotoLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    console.error("[pole photo]", e);
    return NextResponse.json(
      { error: "We couldn't read those photos right now. Search by size instead, or open the Help chat." },
      { status: 502 },
    );
  }
}
