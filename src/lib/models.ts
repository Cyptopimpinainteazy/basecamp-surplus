import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { articles, products, type Product } from "./db/schema";
import { mentionsModel } from "./articles";
import { fitmentCategories } from "./config";
import { slugify } from "./format";
import { tentReference, type TentReference } from "./tent-reference";

// Every tent model we can say something useful about gets a parts page:
// models in the pole reference, models named in stock fitment, and reviewed tents.

export type TentModel = {
  /** Full name, e.g. "The North Face Rock 22". */
  model: string;
  /** Name without "The", for headings: "North Face Rock 22". */
  display: string;
  /** Model only, for matching stock: "Rock 22". */
  short: string;
  slug: string;
};

const BRAND = /^the north face\s+/i;

export function toModel(name: string): TentModel {
  const model = name.trim().replace(/\s+/g, " ");
  const display = model.replace(/^the\s+/i, "");
  const short = model.replace(BRAND, "");
  return { model, display, short, slug: slugify(display) };
}

export async function allModels(): Promise<TentModel[]> {
  const [stock, reviews] = await Promise.all([
    db
      .select({ fitment: products.fitment })
      .from(products)
      .where(and(inArray(products.category, fitmentCategories), inArray(products.status, ["active", "sold_out"]))),
    db
      .select({ subject: articles.subject, category: articles.category })
      .from(articles)
      .where(and(eq(articles.status, "published"), eq(articles.category, "tents"))),
  ]);
  const names = [
    ...tentReference.map((t) => t.model),
    ...stock.flatMap((s) => s.fitment),
    ...reviews.map((r) => r.subject),
  ];
  const bySlug = new Map<string, TentModel>();
  for (const n of names) {
    if (!n.trim()) continue;
    const m = toModel(n);
    if (!bySlug.has(m.slug)) bySlug.set(m.slug, m);
  }
  return [...bySlug.values()].sort((a, b) => a.display.localeCompare(b.display, undefined, { numeric: true }));
}

export async function modelBySlug(slug: string) {
  return (await allModels()).find((m) => m.slug === slug) ?? null;
}

/** The parts page for a free-text model, if one exists ("stormbreak 2" → North Face Stormbreak 2). */
export async function modelForQuery(q: string) {
  const models = await allModels();
  const norm = q.trim().toLowerCase().replace(BRAND, "").replace(/^north face\s+/, "");
  return (
    models.find((m) => m.short.toLowerCase() === norm) ??
    models.filter((m) => mentionsModel(q, m.short)).sort((a, b) => b.short.length - a.short.length)[0] ??
    null
  );
}

export function referenceFor(m: TentModel): TentReference | null {
  return tentReference.find((t) => toModel(t.model).slug === m.slug) ?? null;
}

/** Poles and parts (live and sold out) that can be matched to tent models. */
export async function fitmentStock() {
  return db
    .select()
    .from(products)
    .where(and(inArray(products.category, fitmentCategories), inArray(products.status, ["active", "sold_out"])));
}

export function partsIn(rows: Product[], m: TentModel) {
  return rows.filter((p) => p.fitment.some((f) => mentionsModel(f, m.short)) || mentionsModel(p.title, m.short));
}

/** All poles and parts listed for a model, including sold-out ones for the size table. */
export async function partsForModel(m: TentModel) {
  return partsIn(await fitmentStock(), m);
}

export function partKind(p: Product) {
  if (p.category === "poles") return "poles";
  const t = `${p.productType} ${p.title}`.toLowerCase();
  if (/(rain ?fly|fly sheet|\bfly\b)/.test(t)) return "flies";
  if (/(footprint|ground ?sheet)/.test(t)) return "footprints";
  if (/stake|peg/.test(t)) return "stakes";
  return "other";
}

export const partKindLabel: Record<string, string> = {
  poles: "Poles",
  flies: "Rainflies",
  footprints: "Footprints",
  stakes: "Stakes",
  other: "Other parts",
};

/** Models that share a pole diameter or capacity, for "similar tents" links. */
export function similarModels(m: TentModel, all: TentModel[], limit = 6) {
  const ref = referenceFor(m);
  return all
    .filter((x) => x.slug !== m.slug)
    .map((x) => {
      const r = referenceFor(x);
      let score = 0;
      if (ref && r) {
        if (ref.diametersMm.some((d) => r.diametersMm.some((e) => Math.abs(d - e) < 0.2))) score += 3;
        if (ref.capacity && r.capacity === ref.capacity) score += 2;
        if (ref.hub === r.hub) score += 1;
        if (ref.season === r.season) score += 1;
      }
      return { x, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.x.display.localeCompare(b.x.display))
    .slice(0, limit)
    .map((s) => s.x);
}
