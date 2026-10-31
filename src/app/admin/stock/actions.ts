"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { products, stockAdjustments } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/require-admin";
import { syncStock } from "@/lib/channels/sync";
import { parseStockCount, stockStatus } from "@/lib/stock-rules";

export async function updateStock(_: unknown, form: FormData): Promise<{ error?: string; ok?: string }> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { error: "Invalid product." };
  const quantity = parseStockCount(form.get("quantity"));
  const previous = parseStockCount(form.get("previous"));
  const version = String(form.get("version") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  if (quantity === null || previous === null) return { error: "Use a whole quantity of zero or more (maximum 2 billion)." };
  if (!version || reason.length < 3 || reason.length > 300) return { error: "Add a reason, 3–300 characters." };

  const result = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(products).where(eq(products.id, id)).for("update");
    if (!current) return { error: "Product not found." };
    // Compare the unrounded database timestamp so sales and other edits cannot be overwritten.
    const [updated] = await tx.update(products).set({
      quantity, status: stockStatus(current.status, quantity), updatedAt: new Date(),
    }).where(and(eq(products.id, id), eq(products.quantity, previous), sql`${products.updatedAt}::text = ${version}`)).returning();
    if (!updated) return { error: "Stock changed since this page loaded. Refresh before saving your count." };
    await tx.insert(stockAdjustments).values({ productId: id, previousQuantity: previous, quantity, reason });
    return { slug: updated.slug };
  });
  if (result.error) return { error: result.error };
  let warning = "";
  try { await syncStock([id]); } catch { warning = " Marketplace sync could not complete; check Channels before selling elsewhere."; }
  revalidatePath("/", "layout");
  revalidatePath(`/p/${result.slug}`);
  return { ok: `Stock count saved.${warning}` };
}

/** Manual intake works without an AI key and always creates an unpublished draft. */
export async function createStockDraft(_: unknown, form: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const { brands, categories, conditionValues } = await import("@/lib/config");
  const { redirect } = await import("next/navigation");
  const title = String(form.get("title") ?? "").trim();
  const sku = String(form.get("sku") ?? "").trim();
  const brand = brands.find(b => b.slug === form.get("brand"));
  const category = categories.find(c => c.slug === form.get("category"));
  const condition = String(form.get("condition") ?? "");
  const quantity = parseStockCount(form.get("quantity"));
  if (title.length < 5 || title.length > 200 || !/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(sku)) return { error: "Use a title (5–200 characters) and SKU (2–80 letters, numbers, dots, dashes or underscores)." };
  if (!brand || !category || !conditionValues.includes(condition as never) || quantity === null) return { error: "Check brand, category, condition and whole-number quantity." };
  const model = String(form.get("model") ?? "").trim().slice(0, 150);
  const size = String(form.get("size") ?? "").trim().slice(0, 40);
  const productType = String(form.get("productType") ?? "").trim().slice(0, 100);
  const [created] = await db.insert(products).values({
    sku, slug: `gear-${crypto.randomUUID()}`, title, brand: brand.name, brandSlug: brand.slug,
    category: category.slug, condition, quantity, model, size, productType,
    status: "draft", packagePreset: category.packagePreset,
  }).onConflictDoNothing({ target: products.sku }).returning({ id: products.id });
  if (!created) return { error: "That SKU already exists. Search stock to update its count instead." };
  revalidatePath("/admin/stock");
  return redirect(`/admin/products/${created.id}`);
}
