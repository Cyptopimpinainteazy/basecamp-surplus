"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPricing, savePricing, sendQuote } from "@/lib/custom-jobs";
import type { CanopySize, Pricing } from "@/lib/custom-pricing";
import { db } from "@/lib/db";
import { customJobs, purchaseOrders, suppliers } from "@/lib/db/schema";
import { createPurchaseOrders, sendPurchaseOrder } from "@/lib/purchase-orders";
import { requireAdmin } from "@/lib/require-admin";

export type ActionState = { ok?: string; error?: string } | null;

const str = (form: FormData, k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
/** "$1,234.50" → 123450; blank → null. */
const cents = (v: FormDataEntryValue | null) => {
  const raw = String(v ?? "").replace(/[$,\s]/g, "");
  if (!raw) return null;
  const n = Math.round(Number(raw) * 100);
  return Number.isSafeInteger(n) && n >= 0 ? n : NaN;
};
const uuid = (v: string) => (/^[0-9a-f-]{36}$/i.test(v) ? v : null);

// ---------- suppliers ----------

export async function saveSupplier(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = uuid(str(form, "id"));
  const name = str(form, "name", 120);
  const orderEmail = str(form, "orderEmail").toLowerCase();
  if (name.length < 2) return { error: "Enter the supplier's name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderEmail)) return { error: "Enter the email address purchase orders go to." };
  const lead = Number(str(form, "leadTimeDays"));
  const values = {
    name,
    orderEmail,
    kind: ["dropship", "printer", "factory", "parts"].includes(str(form, "kind")) ? str(form, "kind") : "dropship",
    contactName: str(form, "contactName", 120),
    phone: str(form, "phone", 40),
    website: str(form, "website", 300),
    blindShip: form.get("blindShip") === "on",
    leadTimeDays: Number.isInteger(lead) && lead > 0 && lead <= 365 ? lead : null,
    notes: str(form, "notes", 4000),
    active: form.get("active") !== "off",
    updatedAt: new Date(),
  };
  if (id) await db.update(suppliers).set(values).where(eq(suppliers.id, id));
  else await db.insert(suppliers).values(values);
  revalidatePath("/admin/suppliers");
  return { ok: id ? "Supplier saved." : "Supplier added." };
}

export async function setSupplierActive(id: string, active: boolean) {
  await requireAdmin();
  await db.update(suppliers).set({ active, updatedAt: new Date() }).where(eq(suppliers.id, id));
  revalidatePath("/admin/suppliers");
}

// ---------- purchase orders ----------

export async function createAndSendPos(orderId: string): Promise<ActionState> {
  await requireAdmin();
  try {
    const { unassigned } = await createPurchaseOrders(orderId);
    const pending = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.orderId, orderId), eq(purchaseOrders.status, "pending")));
    for (const po of pending) await sendPurchaseOrder(po.id);
    revalidatePath(`/admin/orders/${orderId}`);
    return {
      ok: `${pending.length ? `Emailed ${pending.length} purchase order${pending.length > 1 ? "s" : ""}.` : "No new purchase orders to send."}${unassigned.length ? ` Still needs a supplier: ${unassigned.join("; ")}` : ""}`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't send purchase orders." };
  }
}

export async function resendPo(poId: string): Promise<ActionState> {
  await requireAdmin();
  try {
    await sendPurchaseOrder(poId);
    const [po] = await db.select({ orderId: purchaseOrders.orderId }).from(purchaseOrders).where(eq(purchaseOrders.id, poId));
    if (po) revalidatePath(`/admin/orders/${po.orderId}`);
    return { ok: "Purchase order emailed." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't email it." };
  }
}

export async function markPoSentManually(poId: string) {
  await requireAdmin();
  const [po] = await db
    .update(purchaseOrders)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.status, "pending")))
    .returning();
  if (po) revalidatePath(`/admin/orders/${po.orderId}`);
}

export async function cancelPo(poId: string) {
  await requireAdmin();
  const [po] = await db
    .update(purchaseOrders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(purchaseOrders.id, poId), inArray(purchaseOrders.status, ["pending", "sent", "confirmed"])))
    .returning();
  if (po) revalidatePath(`/admin/orders/${po.orderId}`);
}

// ---------- custom jobs ----------

export async function quoteJob(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const price = cents(form.get("price"));
  const shipping = cents(form.get("shipping")) ?? 0;
  const cost = cents(form.get("cost"));
  if (price == null || Number.isNaN(price)) return { error: "Enter the final price for the whole job." };
  if (Number.isNaN(shipping) || Number.isNaN(cost)) return { error: "Prices must be dollar amounts." };
  let proofs: { url: string; name: string }[] = [];
  try {
    proofs = JSON.parse(String(form.get("proofs") ?? "[]"));
  } catch {
    return { error: "Proof files couldn't be read. Re-attach them." };
  }
  proofs = proofs
    .map((p) => ({ url: String(p.url), name: String(p.name).slice(0, 120) }))
    .filter((p) => p.url.startsWith("https://"));
  try {
    const { emailed } = await sendQuote(id, {
      priceCents: price,
      shippingCents: shipping,
      costCents: cost,
      supplierId: uuid(str(form, "supplierId")),
      ownerNote: str(form, "ownerNote", 2000),
      proofs,
    });
    revalidatePath(`/admin/custom/${id}`);
    return { ok: emailed ? "Proof and price sent to the customer." : "Saved, but email isn't configured. Send the customer their link yourself." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't send the quote." };
  }
}

export async function setJobSupplier(id: string, form: FormData) {
  await requireAdmin();
  const supplierId = uuid(String(form.get("supplierId") ?? ""));
  const cost = cents(form.get("cost"));
  await db
    .update(customJobs)
    .set({ supplierId, ...(cost != null && !Number.isNaN(cost) ? { costCents: cost } : {}), updatedAt: new Date() })
    .where(eq(customJobs.id, id));
  revalidatePath(`/admin/custom/${id}`);
}

export async function setJobStatus(id: string, status: "in_production" | "shipped" | "declined" | "cancelled") {
  await requireAdmin();
  const allowedFrom: Record<typeof status, string[]> = {
    in_production: ["paid"],
    shipped: ["paid", "in_production"],
    declined: ["requested", "quoted"],
    cancelled: ["requested", "quoted", "checkout"],
  };
  await db
    .update(customJobs)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(customJobs.id, id), inArray(customJobs.status, allowedFrom[status] as never[])));
  revalidatePath(`/admin/custom/${id}`);
  revalidatePath("/admin/custom");
}

export async function deleteAbandonedCheckouts() {
  await requireAdmin();
  const cutoff = new Date(Date.now() - 2 * 86_400_000);
  const stale = await db.select({ id: customJobs.id, createdAt: customJobs.createdAt }).from(customJobs).where(eq(customJobs.status, "checkout"));
  const ids = stale.filter((j) => j.createdAt < cutoff).map((j) => j.id);
  if (ids.length) await db.update(customJobs).set({ status: "cancelled", updatedAt: new Date() }).where(inArray(customJobs.id, ids));
  revalidatePath("/admin/custom");
  redirect("/admin/custom");
}

// ---------- pricing ----------

export async function savePricingAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const current = await getPricing();
  const next: Pricing = structuredClone(current);
  const read = (k: string) => {
    const v = cents(form.get(k));
    if (v == null || Number.isNaN(v)) throw new Error(`"${k}" must be a dollar amount.`);
    return v;
  };
  try {
    for (const size of ["10x10", "10x15", "10x20"] as CanopySize[]) {
      next.canopy.top[size] = read(`top_${size}`);
      next.canopy.aluminumFrame[size] = read(`alu_${size}`);
      next.canopy.backWall[size] = read(`back_${size}`);
    }
    next.canopy.sideWall = read("sideWall");
    next.canopy.halfWall = read("halfWall");
    const tiers: [number, number][] = [];
    for (const n of [1, 2, 3]) {
      const min = Number(str(form, `tierMin${n}`));
      const pct = Number(str(form, `tierPct${n}`));
      if (min > 1 && pct > 0) tiers.push([Math.round(min), Math.min(59, pct)]);
    }
    next.canopy.quantityTiers = tiers;
    for (const k of ["perPole", "perSection", "heavyTubePerSection", "prebentPerSection", "hub"] as const) next.poles[k] = read(k);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Check the prices." };
  }
  await savePricing(next);
  revalidatePath("/admin/custom/pricing");
  revalidatePath("/custom/canopy-tents");
  revalidatePath("/custom/tent-poles");
  return { ok: "Prices saved. The builders use them right away." };
}
