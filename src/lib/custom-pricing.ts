import { z } from "zod";

// Configuration, pricing and plain-language summaries for custom jobs.
// Pure (no database) so the browser builders, the API and the tests all agree.
// The owner overrides any number in Admin → Custom jobs → Pricing; these are
// starting values, not market research.

export type CanopySize = "10x10" | "10x15" | "10x20";

export const defaultPricing = {
  canopy: {
    /** Full-color printed top and valances, steel frame, carry bag. Per tent, in cents. */
    top: { "10x10": 54900, "10x15": 74900, "10x20": 89900 } as Record<CanopySize, number>,
    aluminumFrame: { "10x10": 18000, "10x15": 26000, "10x20": 32000 } as Record<CanopySize, number>,
    /** Full back wall spans the tent's long side. */
    backWall: { "10x10": 19900, "10x15": 25900, "10x20": 31900 } as Record<CanopySize, number>,
    /** Full 10 ft side wall, each. */
    sideWall: 19900,
    /** Half-height rail wall per 10 ft run, each. */
    halfWall: 11900,
    /** [minimum tents, percent off]. Highest qualifying tier applies. */
    quantityTiers: [
      [3, 5],
      [6, 10],
    ] as [number, number][],
  },
  poles: {
    /** Labor and tips per complete pole (or per hub leg). */
    perPole: 900,
    perSection: 375,
    /** Extra per section for 9.5 mm and thicker tube. */
    heavyTubePerSection: 75,
    /** Extra per section for factory-style bends. */
    prebentPerSection: 150,
    /** Hub casting and assembly, per hub. */
    hub: 2400,
  },
};
export type Pricing = typeof defaultPricing;

/** Merge a saved override over the defaults, ignoring anything malformed. */
export function mergePricing(saved: unknown): Pricing {
  const out: Pricing = structuredClone(defaultPricing);
  if (!saved || typeof saved !== "object") return out;
  const s = saved as Partial<Pricing>;
  const cents = (v: unknown) => (Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) < 10_000_000 ? (v as number) : null);
  for (const size of ["10x10", "10x15", "10x20"] as CanopySize[]) {
    for (const key of ["top", "aluminumFrame", "backWall"] as const) {
      const v = cents(s.canopy?.[key]?.[size]);
      if (v != null) out.canopy[key][size] = v;
    }
  }
  for (const key of ["sideWall", "halfWall"] as const) {
    const v = cents(s.canopy?.[key]);
    if (v != null) out.canopy[key] = v;
  }
  if (Array.isArray(s.canopy?.quantityTiers)) {
    const tiers = s.canopy.quantityTiers.filter(
      (t): t is [number, number] => Array.isArray(t) && Number.isInteger(t[0]) && t[0] > 1 && Number.isFinite(t[1]) && t[1] >= 0 && t[1] < 60,
    );
    out.canopy.quantityTiers = tiers.sort((a, b) => a[0] - b[0]);
  }
  for (const key of Object.keys(out.poles) as (keyof Pricing["poles"])[]) {
    const v = cents(s.poles?.[key]);
    if (v != null) out.poles[key] = v;
  }
  return out;
}

// ---------- Logo canopy ----------

export const canopySizes: { id: CanopySize; label: string; longSide: number }[] = [
  { id: "10x10", label: "10 × 10 ft", longSide: 10 },
  { id: "10x15", label: "10 × 15 ft", longSide: 15 },
  { id: "10x20", label: "10 × 20 ft", longSide: 20 },
];

export const canopyConfig = z.object({
  size: z.enum(["10x10", "10x15", "10x20"]),
  frame: z.enum(["steel", "aluminum"]),
  backWall: z.boolean(),
  sideWalls: z.number().int().min(0).max(2),
  halfWalls: z.number().int().min(0).max(4),
  quantity: z.number().int().min(1).max(50),
  canopyColor: z.string().trim().max(60).default(""),
  printNotes: z.string().trim().max(1000).default(""),
});
export type CanopyConfig = z.infer<typeof canopyConfig>;

export function canopyEstimate(c: CanopyConfig, p: Pricing = defaultPricing) {
  const each =
    p.canopy.top[c.size] +
    (c.frame === "aluminum" ? p.canopy.aluminumFrame[c.size] : 0) +
    (c.backWall ? p.canopy.backWall[c.size] : 0) +
    c.sideWalls * p.canopy.sideWall +
    c.halfWalls * p.canopy.halfWall;
  const tier = [...p.canopy.quantityTiers].reverse().find(([min]) => c.quantity >= min);
  const percentOff = tier?.[1] ?? 0;
  const subtotal = each * c.quantity;
  const total = Math.round(subtotal * (1 - percentOff / 100));
  return { each, subtotal, percentOff, total };
}

export function canopySummary(c: CanopyConfig) {
  const size = canopySizes.find((s) => s.id === c.size)!;
  return [
    `${c.quantity} × ${size.label} pop-up canopy, full-color printed top and valances`,
    c.frame === "aluminum" ? "Commercial aluminum frame" : "Steel frame",
    c.backWall ? `Full printed back wall (${size.longSide} ft)` : "",
    c.sideWalls ? `${c.sideWalls} full printed side wall${c.sideWalls > 1 ? "s" : ""}` : "",
    c.halfWalls ? `${c.halfWalls} printed half wall${c.halfWalls > 1 ? "s" : ""}` : "",
    c.canopyColor ? `Base color: ${c.canopyColor}` : "",
    c.printNotes ? `Print notes: ${c.printNotes}` : "",
  ].filter(Boolean);
}

// ---------- Custom-cut poles ----------

/** Common DAC and Easton outside diameters, in mm. */
export const poleDiameters = [7.9, 8.5, 8.7, 9.0, 9.5, 9.6, 10.25, 11.0];

export const poleSpec = z
  .object({
    label: z.string().trim().max(40).default(""),
    shape: z.enum(["straight", "prebent", "hub"]),
    /** Assembled tip-to-tip length; for hubs, the longest leg from hub center to tip. */
    lengthIn: z.number().min(12).max(240),
    sections: z.number().int().min(2).max(14),
    diameterMm: z.number().refine((d) => poleDiameters.includes(d), "Choose a listed diameter"),
    hubLegs: z.number().int().min(3).max(6).optional(),
    quantity: z.number().int().min(1).max(12),
  })
  .superRefine((p, ctx) => {
    const sectionLen = p.lengthIn / p.sections;
    if (sectionLen < 10 || sectionLen > 26) {
      ctx.addIssue({
        code: "custom",
        path: ["sections"],
        message: `That's ${sectionLen.toFixed(1)} in per section. Shock-corded sections need to be 10–26 in; change the length or section count.`,
      });
    }
    if (p.shape === "hub" && !p.hubLegs) ctx.addIssue({ code: "custom", path: ["hubLegs"], message: "Count the legs on the hub." });
  });
export type PoleSpecInput = z.infer<typeof poleSpec>;

export const poleBuild = z.object({
  tent: z.string().trim().max(80).default(""),
  poles: z.array(poleSpec).min(1).max(12),
  notes: z.string().trim().max(1000).default(""),
});
export type PoleBuild = z.infer<typeof poleBuild>;

/** Price of one finished pole (or one hub assembly with all its legs). */
export function polePrice(spec: PoleSpecInput, p: Pricing = defaultPricing) {
  const perSection = p.poles.perSection + (spec.diameterMm >= 9.5 ? p.poles.heavyTubePerSection : 0) + (spec.shape === "prebent" ? p.poles.prebentPerSection : 0);
  const onePole = p.poles.perPole + perSection * spec.sections;
  return spec.shape === "hub" ? p.poles.hub + onePole * (spec.hubLegs ?? 0) : onePole;
}

export function poleBuildTotal(build: PoleBuild, p: Pricing = defaultPricing) {
  return build.poles.reduce((s, spec) => s + polePrice(spec, p) * spec.quantity, 0);
}

export function poleTitle(spec: PoleSpecInput) {
  const kind = spec.shape === "hub" ? `${spec.hubLegs}-leg hub assembly` : spec.shape === "prebent" ? "pre-bent pole" : "pole";
  return `Custom ${kind}, ${spec.lengthIn} in, ${spec.sections} sections, ${spec.diameterMm} mm${spec.label ? ` (${spec.label})` : ""}`;
}

export function poleSummary(build: PoleBuild) {
  return [
    build.tent ? `For: ${build.tent}` : "",
    ...build.poles.map((spec) => `${spec.quantity} × ${poleTitle(spec)}, ${(spec.lengthIn / spec.sections).toFixed(1)} in sections`),
    build.notes ? `Notes: ${build.notes}` : "",
  ].filter(Boolean);
}

// ---------- Private label / bulk ----------

export const privateLabelConfig = z.object({
  style: z.enum(["backpacking", "family", "canopy", "other"]),
  quantity: z.number().int().min(50).max(100_000),
  branding: z.array(z.enum(["fly", "body", "bag", "packaging", "poles"])).min(1),
  colors: z.string().trim().max(200).default(""),
  targetPrice: z.string().trim().max(60).default(""),
  details: z.string().trim().max(2000).default(""),
});
export type PrivateLabelConfig = z.infer<typeof privateLabelConfig>;

const styleLabel: Record<PrivateLabelConfig["style"], string> = {
  backpacking: "Backpacking tent (1–3 person)",
  family: "Family / car-camping tent (4–8 person)",
  canopy: "Pop-up canopy",
  other: "Other tent style",
};
const brandingLabel: Record<PrivateLabelConfig["branding"][number], string> = {
  fly: "logo on rainfly",
  body: "logo on tent body",
  bag: "printed stuff sack",
  packaging: "custom retail box",
  poles: "printed poles",
};

export function privateLabelSummary(c: PrivateLabelConfig) {
  return [
    `${c.quantity.toLocaleString()} × ${styleLabel[c.style]}`,
    `Branding: ${c.branding.map((b) => brandingLabel[b]).join(", ")}`,
    c.colors ? `Colors: ${c.colors}` : "",
    c.targetPrice ? `Target unit price: ${c.targetPrice}` : "",
    c.details ? `Details: ${c.details}` : "",
  ].filter(Boolean);
}

export const jobNumber = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `CJ-${[...crypto.getRandomValues(new Uint8Array(6))].map((b) => alphabet[b % alphabet.length]).join("")}`;
};
