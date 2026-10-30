"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { brandSlug, categorySlugs, conditionValues, getPackagePreset } from "@/lib/config";
import { db } from "@/lib/db";
import { channelListings, orders, products, supportTickets, type Channel } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { ticketReplyEmail } from "@/lib/email/templates";
import { buyLabel, getRate, getRates } from "@/lib/shipping";
import { markOrderShipped } from "@/lib/orders";
import { requireAdmin } from "@/lib/require-admin";
import { pushToEbay, syncStock, upsertListing } from "@/lib/channels/sync";
import { slugify } from "@/lib/format";
import { importEbayOrders } from "@/lib/orders";

// ---------- auth ----------

export async function login(_: unknown, form: FormData) {
  const pw = String(form.get("password") ?? "");
  // Fixed delay blunts online guessing without needing a rate-limit store.
  await new Promise((r) => setTimeout(r, 400));
  if (!(await checkPassword(pw))) return { error: "That password isn't right." };
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// ---------- products ----------

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
const commaList = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
const dollars = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

function revalidateProduct(slug: string) {
  revalidatePath("/", "layout");
  revalidatePath(`/p/${slug}`);
}

export async function saveProduct(_: unknown, form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const [current] = await db.select().from(products).where(eq(products.id, id));
  if (!current) return { error: "Product not found." };

  const category = String(form.get("category"));
  const condition = String(form.get("condition"));
  if (!categorySlugs.includes(category as never)) return { error: "Pick a category." };
  if (!conditionValues.includes(condition as never)) return { error: "Pick a condition." };
  const title = String(form.get("title") ?? "").trim();
  if (title.length < 5) return { error: "Add a title." };
  const priceCents = dollars(form.get("price"));
  if (!priceCents) return { error: "Set a price." };
  const brand = String(form.get("brand") ?? "").trim();
  if (!brand) return { error: "Add the brand." };

  const specs = lines(form.get("specs")).map((l) => {
    const [label, ...rest] = l.split(":");
    return { label: label.trim(), value: rest.join(":").trim() };
  }).filter((s) => s.label && s.value);

  const imageOrder = lines(form.get("images"));
  const images = imageOrder
    .map((url) => current.images.find((i) => i.url === url))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  const requestedSlug = slugify(String(form.get("slug") ?? "")) || current.slug;
  const quantity = Math.max(0, Math.floor(Number(form.get("quantity") ?? 1)));
  const status = String(form.get("intent")) === "publish" ? "active" : current.status === "sold_out" && quantity > 0 ? "active" : current.status;

  const [updated] = await db
    .update(products)
    .set({
      title,
      slug: requestedSlug,
      brand,
      brandSlug: brandSlug(brand),
      model: String(form.get("model") ?? "").trim(),
      category,
      productType: String(form.get("productType") ?? "").trim(),
      gender: String(form.get("gender") ?? ""),
      size: String(form.get("size") ?? "").trim(),
      color: String(form.get("color") ?? "").trim(),
      material: String(form.get("material") ?? "").trim(),
      condition,
      conditionNotes: String(form.get("conditionNotes") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      highlights: lines(form.get("highlights")),
      specs,
      seoTitle: String(form.get("seoTitle") ?? "").trim().slice(0, 70),
      seoDescription: String(form.get("seoDescription") ?? "").trim().slice(0, 170),
      keywords: commaList(form.get("keywords")),
      hashtags: commaList(form.get("hashtags")).map((h) => h.replace(/^#/, "")),
      fitment: lines(form.get("fitment")),
      priceCents,
      msrpCents: dollars(form.get("msrp")),
      costCents: dollars(form.get("cost")),
      quantity,
      weightOz: Number(form.get("weightOz")) || null,
      packagePreset: getPackagePreset(String(form.get("packagePreset"))).id,
      ebayCategoryId: String(form.get("ebayCategoryId") ?? "").trim() || null,
      images: images.length ? images : current.images,
      featured: form.get("featured") === "on",
      status: quantity === 0 && status === "active" ? "sold_out" : status,
      publishedAt: status === "active" && !current.publishedAt ? new Date() : current.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  if (current.quantity !== updated.quantity || current.status !== updated.status) await syncStock([id]);
  revalidateProduct(updated.slug);
  if (current.slug !== updated.slug) revalidatePath(`/p/${current.slug}`);
  return { ok: updated.status === "active" && current.status !== "active" ? "Published. It's live on the site and in the feeds." : "Saved." };
}

export async function setProductStatus(id: string, status: "active" | "archived" | "draft") {
  await requireAdmin();
  const [p] = await db
    .update(products)
    .set({ status, updatedAt: new Date(), ...(status === "active" ? { publishedAt: new Date() } : {}) })
    .where(eq(products.id, id))
    .returning();
  await syncStock([id]);
  revalidateProduct(p.slug);
}

export async function deleteProductImage(id: string, url: string) {
  await requireAdmin();
  const [p] = await db.select().from(products).where(eq(products.id, id));
  if (!p) return;
  await db.update(products).set({ images: p.images.filter((i) => i.url !== url), updatedAt: new Date() }).where(eq(products.id, id));
  revalidateProduct(p.slug);
}

// ---------- channels ----------

export async function listOnEbay(id: string) {
  await requireAdmin();
  const [p] = await db.select().from(products).where(eq(products.id, id));
  if (!p) return { error: "Product not found." };
  if (p.status !== "active") return { error: "Publish the product on your site first." };
  const r = await pushToEbay(p);
  revalidatePath(`/admin/products/${id}`);
  return r.ok ? { ok: "Live on eBay.", url: r.url } : { error: r.error };
}

export async function markManualListing(id: string, channel: Channel, status: "listed" | "delisted", url?: string) {
  await requireAdmin();
  await upsertListing(id, channel, { status, url: url?.trim() || null, lastSyncedAt: new Date(), error: null });
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin");
}

export async function syncEbayOrdersNow() {
  await requireAdmin();
  try {
    const r = await importEbayOrders();
    revalidatePath("/admin/orders");
    return { ok: `Checked ${r.checked} eBay orders, imported ${r.imported}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "eBay sync failed." };
  }
}

// ---------- shipping ----------

export async function fetchRates(orderId: string, presetId: string, weightOz: number) {
  await requireAdmin();
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o?.shippingAddress) return { error: "This order has no shipping address." };
  try {
    const r = await getRates(o.shippingAddress, presetId, weightOz);
    return {
      rates: r.rates.map((x) => ({
        id: x.object_id,
        carrier: x.provider,
        service: x.servicelevel.name,
        amount: x.amount,
        days: x.estimated_days,
      })),
      messages: r.messages,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't get rates." };
  }
}

export async function purchaseLabel(orderId: string, rateId: string, presetId: string) {
  await requireAdmin();
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o) return { error: "Order not found." };
  if (o.labelUrl) return { error: "A label was already bought for this order." };
  try {
    const rate = await getRate(rateId);
    const tx = await buyLabel(rateId);
    await markOrderShipped(o, {
      carrier: rate.provider,
      service: rate.servicelevel.name,
      trackingNumber: tx.tracking_number,
      trackingUrl: tx.tracking_url_provider,
      labelUrl: tx.label_url,
      labelCostCents: Math.round(Number(rate.amount) * 100),
      transactionId: tx.object_id,
      packagePreset: presetId,
    });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: "Label bought. Tracking sent to the customer.", labelUrl: tx.label_url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Label purchase failed." };
  }
}

export async function setOrderStatus(orderId: string, status: "shipped" | "delivered" | "refunded" | "canceled" | "paid") {
  await requireAdmin();
  await db.update(orders).set({ status, updatedAt: new Date(), attentionReason: status === "paid" ? null : undefined }).where(eq(orders.id, orderId));
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

// ---------- support ----------

export async function replyToTicket(_: unknown, form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const reply = String(form.get("reply") ?? "").trim();
  const close = form.get("close") === "on";
  if (reply.length < 2) return { error: "Write a reply first." };
  const [t] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
  if (!t) return { error: "Ticket not found." };
  try {
    await sendEmail({ to: t.email, ...ticketReplyEmail(t.name, t.topic, reply) });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Email failed to send." };
  }
  await db
    .update(supportTickets)
    .set({ reply: [t.reply, reply].filter(Boolean).join("\n\n---\n\n"), status: close ? "closed" : "waiting", updatedAt: new Date() })
    .where(eq(supportTickets.id, id));
  revalidatePath("/admin/support");
  return { ok: `Reply sent to ${t.email}.` };
}

export async function setTicketStatus(id: string, status: "open" | "waiting" | "closed") {
  await requireAdmin();
  await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, id));
  revalidatePath("/admin/support");
}

export async function clearNeedsDelist(productId: string, channel: Channel) {
  await requireAdmin();
  await db
    .update(channelListings)
    .set({ status: "delisted" })
    .where(and(eq(channelListings.productId, productId), eq(channelListings.channel, channel)));
  revalidatePath("/admin");
}
