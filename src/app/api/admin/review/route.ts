import { NextResponse } from "next/server";
import { z } from "zod";
import { writeReview } from "@/lib/ai/review";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { slugify } from "@/lib/format";
import { isAdmin } from "@/lib/require-admin";

export const maxDuration = 300;
const body = z.object({ subject: z.string().min(3).max(120), notes: z.string().max(2000).optional() });

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the brand and model to review." }, { status: 400 });
  try {
    const r = await writeReview(parsed.data);
    let slug = `${slugify(r.subject)}-review`;
    const [row] = await db
      .insert(articles)
      .values({ ...r, slug, status: "draft" })
      .onConflictDoNothing({ target: articles.slug })
      .returning({ id: articles.id });
    if (row) return NextResponse.json({ id: row.id });
    slug = `${slug}-${Date.now().toString(36)}`;
    const [again] = await db.insert(articles).values({ ...r, slug, status: "draft" }).returning({ id: articles.id });
    return NextResponse.json({ id: again.id });
  } catch (e) {
    console.error("[review]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Review writing failed." }, { status: 500 });
  }
}
