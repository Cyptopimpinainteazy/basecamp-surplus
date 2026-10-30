import { NextResponse } from "next/server";
import { z } from "zod";
import { generateListing } from "@/lib/ai/listing";
import { brandSlug, getCategory } from "@/lib/config";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { skuFor, slugify } from "@/lib/format";
import { suggestPrice } from "@/lib/pricing";
import { isAdmin } from "@/lib/require-admin";

export const maxDuration = 120;

const body = z.object({
  images: z.array(z.object({ url: z.string().url(), width: z.number().optional(), height: z.number().optional() })).min(1).max(12),
  brandHint: z.string().max(60).optional(),
  categoryHint: z.string().max(40).optional(),
  conditionHint: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
  quantity: z.number().int().min(1).max(999).default(1),
});

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add at least one photo." }, { status: 400 });
  const input = parsed.data;

  try {
    const ai = await generateListing(
      input.images.map((i) => i.url),
      { brandHint: input.brandHint, categoryHint: input.categoryHint, conditionHint: input.conditionHint, notes: input.notes },
    );
    const price = await suggestPrice({ msrpUsd: ai.msrpEstimateUsd, condition: ai.condition, compsQuery: ai.compsQuery });
    const bSlug = brandSlug(ai.brand);
    const sku = skuFor(ai.category, bSlug);
    const slug = `${slugify(ai.title)}-${sku.slice(-5).toLowerCase()}`;

    const [row] = await db
      .insert(products)
      .values({
        sku,
        slug,
        status: "draft",
        title: ai.title,
        brand: ai.brand,
        brandSlug: bSlug,
        model: ai.model,
        category: ai.category,
        productType: ai.productType,
        gender: ai.gender,
        size: ai.size,
        color: ai.color,
        material: ai.material,
        condition: ai.condition,
        conditionNotes: ai.conditionNotes,
        description: ai.description,
        highlights: ai.highlights,
        specs: ai.specs,
        seoTitle: ai.seoTitle,
        seoDescription: ai.seoDescription,
        keywords: ai.keywords,
        hashtags: ai.hashtags,
        images: input.images.map((img, i) => ({
          url: img.url,
          alt: ai.imageAlts[i] ?? `${ai.title}, photo ${i + 1}`,
          width: img.width,
          height: img.height,
        })),
        priceCents: price.priceCents,
        msrpCents: price.msrpCents,
        quantity: input.quantity,
        weightOz: ai.weightOzEstimate ? Math.round(ai.weightOzEstimate) : null,
        packagePreset: getCategory(ai.category)?.packagePreset ?? "medium-box",
        fitment: ai.fitment,
        poleSpec: ai.poleSpec ?? null,
        ebayAspects: ai.ebayAspects,
        pricingBasis: price.basis,
        aiRaw: { ...ai, comps: price.comps },
      })
      .returning({ id: products.id });
    return NextResponse.json({ id: row.id });
  } catch (e) {
    console.error("[listing]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Listing generation failed." }, { status: 500 });
  }
}
