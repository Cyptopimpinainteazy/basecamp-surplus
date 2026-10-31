import "server-only";
import { and, asc, desc, eq, gt, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { products, type Product } from "./db/schema";
import { fitmentCategories } from "./config";

export type ProductQuery = {
  category?: string;
  brand?: string;
  condition?: "new" | "used";
  q?: string;
  size?: string;
  maxPriceCents?: number;
  sort?: "new" | "price_asc" | "price_desc" | "savings";
  limit?: number;
  offset?: number;
};

const NEW_CONDITIONS = ["new_with_tags", "new_without_tags"];

function filters(q: ProductQuery): SQL[] {
  const where: SQL[] = [eq(products.status, "active"), gt(products.quantity, 0)];
  if (q.category) where.push(eq(products.category, q.category));
  if (q.brand) where.push(eq(products.brandSlug, q.brand));
  if (q.size) where.push(ilike(products.size, q.size));
  if (q.maxPriceCents) where.push(lte(products.priceCents, q.maxPriceCents));
  if (q.condition === "new") where.push(inArray(products.condition, NEW_CONDITIONS));
  if (q.condition === "used")
    where.push(sql`${products.condition} not in ('new_with_tags','new_without_tags')`);
  if (q.q?.trim()) {
    const terms = q.q.trim().split(/\s+/).slice(0, 8);
    for (const term of terms) {
      const like = `%${term.replace(/[%_]/g, "")}%`;
      where.push(
        or(
          ilike(products.title, like),
          ilike(products.brand, like),
          ilike(products.model, like),
          ilike(products.color, like),
          ilike(products.productType, like),
          sql`${products.keywords}::text ilike ${like}`,
          sql`${products.fitment}::text ilike ${like}`,
        )!,
      );
    }
  }
  return where;
}

export async function listProducts(q: ProductQuery = {}) {
  const order =
    q.sort === "price_asc"
      ? [asc(products.priceCents)]
      : q.sort === "price_desc"
        ? [desc(products.priceCents)]
        : q.sort === "savings"
          ? [
              desc(
                sql`coalesce((${products.msrpCents} - ${products.priceCents})::float / nullif(${products.msrpCents},0), 0)`,
              ),
            ]
          : [desc(products.featured), desc(products.publishedAt)];
  return db
    .select()
    .from(products)
    .where(and(...filters(q)))
    .orderBy(...order)
    .limit(q.limit ?? 48)
    .offset(q.offset ?? 0);
}

export async function countProducts(q: ProductQuery = {}) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(and(...filters(q)));
  return row?.n ?? 0;
}

export async function getProductBySlug(slug: string) {
  const [p] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return p ?? null;
}

export async function getProductById(id: string) {
  const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return p ?? null;
}

export async function relatedProducts(p: Product, limit = 4) {
  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.status, "active"),
        gt(products.quantity, 0),
        eq(products.category, p.category),
        sql`${products.id} <> ${p.id}`,
      ),
    )
    .orderBy(sql`(${products.brandSlug} = ${p.brandSlug}) desc`, desc(products.publishedAt))
    .limit(limit);
}

export async function inventoryStats() {
  const rows = await db
    .select({ category: products.category, n: sql<number>`sum(${products.quantity})::int` })
    .from(products)
    .where(and(eq(products.status, "active"), gt(products.quantity, 0)))
    .groupBy(products.category);
  const byCategory = Object.fromEntries(rows.map((r) => [r.category, r.n]));
  const total = rows.reduce((s, r) => s + r.n, 0);
  return { total, byCategory };
}

export async function brandsInStock() {
  return db
    .select({ brand: products.brand, slug: products.brandSlug, n: sql<number>`count(*)::int` })
    .from(products)
    .where(and(eq(products.status, "active"), gt(products.quantity, 0)))
    .groupBy(products.brand, products.brandSlug)
    .orderBy(desc(sql`count(*)`));
}

export async function sizesInCategory(category: string) {
  const rows = await db
    .selectDistinct({ size: products.size })
    .from(products)
    .where(
      and(eq(products.status, "active"), gt(products.quantity, 0), eq(products.category, category)),
    );
  const order = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL"];
  return rows
    .map((r) => r.size)
    .filter(Boolean)
    .sort((a, b) => {
      const ia = order.indexOf(a.toUpperCase());
      const ib = order.indexOf(b.toUpperCase());
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
}

/** Tent models that have poles or parts in stock, for the fitment finder. */
export async function poleFitmentIndex() {
  const rows = await db
    .select({ fitment: products.fitment })
    .from(products)
    .where(
      and(eq(products.status, "active"), gt(products.quantity, 0), inArray(products.category, fitmentCategories)),
    );
  const models = new Map<string, number>();
  for (const r of rows) for (const m of r.fitment) models.set(m, (models.get(m) ?? 0) + 1);
  return [...models.entries()]
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => a.model.localeCompare(b.model));
}

export async function polesForModel(model: string) {
  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.status, "active"),
        gt(products.quantity, 0),
        inArray(products.category, fitmentCategories),
        sql`exists (select 1 from jsonb_array_elements_text(${products.fitment}) f where f ilike ${"%" + model.replace(/[%_]/g, "") + "%"})`,
      ),
    )
    .orderBy(asc(products.category), asc(products.priceCents));
}

export async function allActiveProducts() {
  return db
    .select()
    .from(products)
    .where(eq(products.status, "active"))
    .orderBy(desc(products.publishedAt));
}

/**
 * Atomically decrement stock. Returns false if there wasn't enough left
 * (the caller flags the order as oversold).
 */
export async function decrementStock(productId: string, qty: number) {
  const rows = await db
    .update(products)
    .set({
      quantity: sql`${products.quantity} - ${qty}`,
      status: sql`case when ${products.quantity} - ${qty} <= 0 then 'sold_out'::product_status else ${products.status} end`,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), sql`${products.quantity} >= ${qty}`))
    .returning({ id: products.id, quantity: products.quantity });
  return rows.length > 0 ? rows[0] : null;
}

export type PoleSizeRow = {
  slug: string;
  title: string;
  inStock: boolean;
  priceCents: number;
  role: string;
  lengthIn: number | null;
  packedLengthIn: number | null;
  sections: number | null;
  diameterMm: number | null;
  colorCode: string;
  material: string;
  measured: boolean;
  shape: "straight" | "prebent" | "hub";
  hubArms: number | null;
};

/**
 * Pole sizes grouped by the tent they fit, built from listed pole stock.
 * Sold-out poles stay in the chart so it keeps working as a size reference.
 */
export async function poleSizeChart() {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.category, "poles"), inArray(products.status, ["active", "sold_out"])));
  const byTent = new Map<string, PoleSizeRow[]>();
  for (const p of rows) {
    const s = p.poleSpec ?? {};
    const row: PoleSizeRow = {
      slug: p.slug,
      title: p.title,
      inStock: p.status === "active" && p.quantity > 0,
      priceCents: p.priceCents,
      role: s.role ?? "",
      lengthIn: s.lengthIn ?? null,
      packedLengthIn: s.packedLengthIn ?? null,
      sections: s.sections ?? null,
      diameterMm: s.diameterMm ?? null,
      colorCode: s.colorCode ?? "",
      material: s.material ?? "",
      measured: Boolean(s.measured),
      shape: s.shape ?? "straight",
      hubArms: s.hubArms ?? null,
    };
    for (const tent of p.fitment.length ? p.fitment : ["Unmatched poles"]) {
      byTent.set(tent, [...(byTent.get(tent) ?? []), row]);
    }
  }
  return [...byTent.entries()]
    .map(([tent, poles]) => ({
      tent,
      poles: poles.sort((a, b) => (b.lengthIn ?? 0) - (a.lengthIn ?? 0)),
    }))
    .sort((a, b) => (a.tent === "Unmatched poles" ? 1 : b.tent === "Unmatched poles" ? -1 : a.tent.localeCompare(b.tent)));
}
