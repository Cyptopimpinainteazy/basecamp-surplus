import { NextResponse } from "next/server";
import { z } from "zod";
import { readPoleSet } from "@/lib/ai/pole-set";
import { brandSlug } from "@/lib/config";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { skuFor, slugify } from "@/lib/format";
import { suggestPrice } from "@/lib/pricing";
import { isAdmin } from "@/lib/require-admin";

export const maxDuration = 120;

const body = z.object({
  images: z.array(z.object({ url: z.string().url(), width: z.number().optional(), height: z.number().optional() })).min(1).max(12),
  tentHint: z.string().max(80).optional(),
  notes: z.string().max(500).optional(),
  sets: z.number().int().min(1).max(500).default(1),
  condition: z.enum(["new_without_tags", "used_excellent", "used_good"]).default("new_without_tags"),
});

/** Creates one draft pole listing per distinct pole in the photographed kit. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add at least one photo." }, { status: 400 });
  const input = parsed.data;

  try {
    const set = await readPoleSet(input.images.map((i) => i.url), { tentHint: input.tentHint, notes: input.notes });
    const bSlug = brandSlug(set.brand);
    const tent = `${set.brand} ${set.tentModel}`.trim();
    const ids: string[] = [];

    for (const pole of set.poles) {
      const price = await suggestPrice({
        msrpUsd: null,
        condition: input.condition,
        compsQuery: `${set.brand} ${set.tentModel} tent pole ${pole.role}`.toLowerCase(),
      });
      const sku = skuFor("poles", bSlug);
      const specs = [
        { label: "Fits", value: tent },
        { label: "Position", value: pole.role },
        { label: "Type", value: pole.shape === "hub" ? `Hub assembly${pole.hubArms ? `, ${pole.hubArms} legs` : ""}` : pole.shape === "prebent" ? "Pre-bent" : "Straight" },
        pole.lengthIn ? { label: "Assembled length", value: `${pole.lengthIn} in` } : null,
        pole.sections ? { label: "Sections", value: String(pole.sections) } : null,
        pole.diameterMm ? { label: "Diameter", value: `${pole.diameterMm} mm` } : null,
        pole.colorCode ? { label: "Color code", value: pole.colorCode } : null,
        pole.material ? { label: "Material", value: pole.material } : null,
        pole.countInSet > 1 ? { label: "Used per tent", value: String(pole.countInSet) } : null,
      ].filter((s): s is { label: string; value: string } => Boolean(s));

      const [row] = await db
        .insert(products)
        .values({
          sku,
          slug: `${slugify(pole.title)}-${sku.slice(-5).toLowerCase()}`,
          status: "draft",
          title: pole.title.slice(0, 80),
          brand: set.brand,
          brandSlug: bSlug,
          model: `${set.tentModel} ${pole.role} pole`,
          category: "poles",
          productType: "Tent pole",
          condition: input.condition,
          description: pole.description,
          specs,
          seoTitle: `Replacement Pole: ${tent}`.slice(0, 60),
          seoDescription: `Replacement ${pole.role} pole for the ${tent} tent${pole.lengthIn ? `, ${pole.lengthIn} in assembled` : ""}. Ships from Denver.`.slice(0, 160),
          keywords: [...new Set([`${tent} replacement pole`.toLowerCase(), `${set.tentModel} tent pole`.toLowerCase(), ...pole.keywords])],
          images: input.images.map((img, i) => ({ url: img.url, alt: `${tent} pole set, photo ${i + 1}`, width: img.width, height: img.height })),
          priceCents: price.priceCents,
          quantity: input.sets * pole.countInSet,
          weightOz: pole.weightOz ? Math.round(pole.weightOz) : null,
          packagePreset: "pole-tube",
          fitment: [tent],
          poleSpec: {
            role: pole.role,
            shape: pole.shape,
            hubArms: pole.shape === "hub" ? (pole.hubArms ?? undefined) : undefined,
            sections: pole.sections ?? undefined,
            lengthIn: pole.lengthIn ?? undefined,
            packedLengthIn: pole.packedLengthIn ?? undefined,
            diameterMm: pole.diameterMm ?? undefined,
            colorCode: pole.colorCode || undefined,
            material: pole.material || undefined,
            measured: false,
          },
          pricingBasis: price.basis,
          aiRaw: { poleSet: set, pole, comps: price.comps, uncertainties: set.uncertainties, readFromTags: set.readFromLabels },
        })
        .returning({ id: products.id });
      ids.push(row.id);
    }
    return NextResponse.json({ ids, tent, uncertainties: set.uncertainties });
  } catch (e) {
    console.error("[pole-set]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Pole set reading failed." }, { status: 500 });
  }
}
