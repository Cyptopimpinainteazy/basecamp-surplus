import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  brandDefaultCondition,
  brands,
  categories,
  conditions,
  conditionValues,
  categorySlugs,
  site,
} from "../config";
import { anthropic, LISTING_MODEL } from "./client";

// Shape the model must return. Validated with zod before anything touches the DB.
export const aiListingSchema = z.object({
  category: z.enum(categorySlugs),
  brand: z.string().min(1),
  model: z.string().default(""),
  productType: z.string().default(""),
  gender: z.enum(["mens", "womens", "unisex", "kids", ""]).default(""),
  size: z.string().default(""),
  color: z.string().default(""),
  material: z.string().default(""),
  condition: z.enum(conditionValues),
  conditionNotes: z.string().default(""),
  title: z.string().min(10).max(120),
  description: z.string().min(80),
  highlights: z.array(z.string()).max(8).default([]),
  specs: z.array(z.object({ label: z.string(), value: z.string() })).max(16).default([]),
  seoTitle: z.string().max(70),
  seoDescription: z.string().max(170),
  keywords: z.array(z.string()).max(25),
  hashtags: z.array(z.string()).max(12).default([]),
  imageAlts: z.array(z.string()).default([]),
  msrpEstimateUsd: z.number().nullable(),
  msrpConfidence: z.enum(["high", "medium", "low"]),
  weightOzEstimate: z.number().nullable(),
  fitment: z.array(z.string()).default([]),
  poleSpec: z
    .object({
      sections: z.number().optional(),
      lengthIn: z.number().optional(),
      packedLengthIn: z.number().optional(),
      shape: z.enum(["straight", "prebent", "hub"]).optional(),
      hubArms: z.number().optional(),
      diameterMm: z.number().optional(),
      material: z.string().optional(),
      colorCode: z.string().optional(),
      role: z.string().optional(),
    })
    .nullable()
    .default(null),
  ebayAspects: z.record(z.string(), z.array(z.string())).default({}),
  compsQuery: z.string().min(3),
  readFromTags: z.array(z.string()).default([]),
  uncertainties: z.array(z.string()).default([]),
});

export type AiListing = z.infer<typeof aiListingSchema>;

const listingTool: Anthropic.Tool = {
  name: "create_listing",
  description: "Return the complete, structured product listing for the photographed item.",
  input_schema: {
    type: "object",
    required: [
      "category",
      "brand",
      "condition",
      "title",
      "description",
      "seoTitle",
      "seoDescription",
      "keywords",
      "msrpEstimateUsd",
      "msrpConfidence",
      "weightOzEstimate",
      "compsQuery",
    ],
    properties: {
      category: { type: "string", enum: [...categorySlugs] },
      brand: { type: "string", description: "Exact brand name, e.g. 'The North Face', 'Fjällräven'." },
      model: {
        type: "string",
        description: "Official product/model name as printed on tags or as the brand sells it, e.g. 'Nuptse 1996 Retro', 'Stormbreak 2'.",
      },
      productType: { type: "string", description: "Short type, e.g. 'Down jacket', 'Backpacking tent', 'Tent pole', 'Rainfly', 'Footprint', 'Tent stakes'." },
      gender: { type: "string", enum: ["mens", "womens", "unisex", "kids", ""] },
      size: { type: "string", description: "Size exactly as on the tag (S, M, L, XL...). Empty for tents/poles." },
      color: { type: "string", description: "Brand color name if on tag, else plain color." },
      material: { type: "string" },
      condition: { type: "string", enum: [...conditionValues] },
      conditionNotes: {
        type: "string",
        description: "For used items: specific visible wear or flaws. For NWT: confirm tags visible. Never invent flaws you cannot see.",
      },
      title: {
        type: "string",
        description: "Marketplace title, max 80 characters. Pattern: Brand + Model + key type + gender + size + color + 'NWT' or 'Used'. No emojis, no all-caps words except NWT.",
      },
      description: {
        type: "string",
        description: "Product page description, 120–220 words, plain paragraphs separated by blank lines. Specific, factual, buyer-focused. Mention condition plainly. No hype words, no emojis.",
      },
      highlights: { type: "array", items: { type: "string" }, description: "3–6 short feature bullets." },
      specs: {
        type: "array",
        items: {
          type: "object",
          properties: { label: { type: "string" }, value: { type: "string" } },
          required: ["label", "value"],
        },
        description: "Spec table rows read from tags/labels or known model specs (fill, waterproofing, capacity, packed weight, floor area...).",
      },
      seoTitle: { type: "string", description: `Under 60 characters before the site name is appended. Lead with the highest-intent search phrase.` },
      seoDescription: { type: "string", description: "150–160 characters, includes brand, model, condition and a reason to buy here (below retail, ships from Denver)." },
      keywords: {
        type: "array",
        items: { type: "string" },
        description: "12–20 search phrases buyers actually type, mixing head terms and long-tail (model + size, model + color, 'replacement pole for <tent>').",
      },
      hashtags: { type: "array", items: { type: "string" }, description: "6–10 hashtags for Depop/Poshmark, no # symbol." },
      imageAlts: { type: "array", items: { type: "string" }, description: "One descriptive alt text per photo, in photo order." },
      msrpEstimateUsd: { type: ["number", "null"], description: "Original US retail price. Use the tag price if visible." },
      msrpConfidence: { type: "string", enum: ["high", "medium", "low"] },
      weightOzEstimate: { type: ["number", "null"], description: "Shipping weight of the item itself in ounces." },
      fitment: {
        type: "array",
        items: { type: "string" },
        description: "Poles and tent parts (rainflies, footprints, model-specific stakes or vestibules): the tent models it fits, e.g. 'The North Face Stormbreak 2'. Read tags, labels and printed style numbers; include only models you have evidence for.",
      },
      poleSpec: {
        type: ["object", "null"],
        description: "Poles only. Fill a field only when a label, printed marking or a tape measure in the photo shows it. Never estimate lengths from photos.",
        properties: {
          sections: { type: "number", description: "Number of shock-corded sections, counted in the photo." },
          lengthIn: { type: "number", description: "Assembled tip-to-tip length in inches, only if printed on the label or read off a tape measure in the photo." },
          packedLengthIn: { type: "number", description: "Folded/packed length in inches, only if shown." },
          shape: { type: "string", enum: ["straight", "prebent", "hub"], description: "hub = legs joined at an aluminum hub; prebent = visible factory bends." },
          hubArms: { type: "number", description: "Hub assemblies: number of legs." },
          diameterMm: { type: "number", description: "Tube diameter in mm, only if printed (e.g. DAC labels show 8.7, 9.0, 9.5)." },
          material: { type: "string", description: "e.g. 'DAC Featherlite NSL aluminum', 'DAC DA17', 'Fiberglass'." },
          colorCode: { type: "string", description: "Color marking on the tips or ferrules that matches the tent's corner webbing." },
          role: { type: "string", description: "Position on the tent if labeled: 'main', 'brow', 'fly', 'hub', 'cross', 'door arch'." },
        },
      },
      ebayAspects: {
        type: "object",
        additionalProperties: { type: "array", items: { type: "string" } },
        description: "eBay item specifics, e.g. {\"Brand\":[\"The North Face\"],\"Size\":[\"M\"],\"Department\":[\"Men\"],\"Type\":[\"Jacket\"],\"Color\":[\"Black\"],\"Style\":[\"Puffer\"],\"Outer Shell Material\":[\"Nylon\"]}.",
      },
      compsQuery: { type: "string", description: "Short eBay search query to find comparable listings, e.g. 'north face nuptse 1996 mens M'." },
      readFromTags: { type: "array", items: { type: "string" }, description: "Facts you read directly from tags/labels in the photos." },
      uncertainties: { type: "array", items: { type: "string" }, description: "Anything the seller should double-check before publishing." },
    },
  },
};

function systemPrompt(hints: { brandHint?: string; categoryHint?: string; conditionHint?: string; notes?: string }) {
  return `You write product listings for ${site.name}, a Denver, Colorado outdoor gear store selling new-with-tags surplus (The North Face, Montec, Dope, Fjällräven and more), pre-owned Patagonia, tents, and replacement tent poles.

From the seller's photos, identify the item precisely and produce a complete listing with the create_listing tool.

Rules:
- Read every visible tag, label, size tag, care label, pole sleeve label and price tag. Prefer printed facts over guesses, and list them in readFromTags.
- Identify the exact model where you can (e.g. "Nuptse 1996 Retro", "Thermoball Eco", "Stormbreak 2", "Wawona 6"). If unsure, say so in uncertainties rather than inventing a model name.
- Condition: if tags are attached and the item is unworn, use new_with_tags. Patagonia items default to used_good unless tags are clearly attached. For used items, describe only wear you can see.
- Write like a knowledgeable gear shop: specific, plain, accurate. No hype ("amazing", "must-have"), no emojis, no ALL CAPS beyond "NWT".
- Titles must fit in 80 characters for eBay/Poshmark.
- SEO: target what buyers search: brand + model + type + size/gender, and for poles "replacement pole for <brand> <tent model>".
- Never claim the item is from the brand directly or that the store is an authorized dealer. Brand names are used only to describe the product.
- Rainflies, footprints and stakes sold on their own go in the parts category with fitment set. Titles: 'Replacement Rainfly for <Brand> <Model> Tent', '<Brand> <Model> Footprint'.
- Categories: ${categories.map((c) => `${c.slug} (${c.name})`).join(", ")}.
- Conditions: ${conditions.map((c) => `${c.value} = ${c.detail}`).join(" | ")}.
- Known brands in stock: ${brands.map((b) => b.name).join(", ")}. Default conditions by brand: ${JSON.stringify(brandDefaultCondition)}.
${hints.brandHint ? `- Seller says the brand is: ${hints.brandHint}` : ""}
${hints.categoryHint ? `- Seller says the category is: ${hints.categoryHint}` : ""}
${hints.conditionHint ? `- Seller says the condition is: ${hints.conditionHint}` : ""}
${hints.notes ? `- Seller notes: ${hints.notes}` : ""}`;
}

export async function generateListing(
  imageUrls: string[],
  hints: { brandHint?: string; categoryHint?: string; conditionHint?: string; notes?: string } = {},
): Promise<AiListing> {
  if (imageUrls.length === 0) throw new Error("Add at least one photo.");
  const content: Anthropic.ContentBlockParam[] = [
    ...imageUrls.slice(0, 12).map(
      (url) => ({ type: "image", source: { type: "url", url } }) as Anthropic.ImageBlockParam,
    ),
    {
      type: "text",
      text: `${imageUrls.length} photo(s) of one item. Create the listing.`,
    },
  ];

  const res = await anthropic().messages.create({
    model: LISTING_MODEL,
    max_tokens: 4000,
    system: systemPrompt(hints),
    tools: [listingTool],
    tool_choice: { type: "tool", name: "create_listing" },
    messages: [{ role: "user", content }],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("The AI did not return a listing. Try again.");
  const parsed = aiListingSchema.safeParse(block.input);
  if (!parsed.success) {
    throw new Error(`The AI returned an incomplete listing: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`);
  }
  const listing = parsed.data;
  // Enforce marketplace-safe lengths regardless of model output.
  listing.title = listing.title.slice(0, 80).trim();
  listing.hashtags = listing.hashtags.map((h) => h.replace(/^#/, "").replace(/\s+/g, ""));
  return listing;
}
