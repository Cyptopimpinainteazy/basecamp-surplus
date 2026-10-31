"use server";

import { and, eq, sql } from "drizzle-orm";
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
import { parsePoleSale } from "@/lib/pole-sale";
import { parseStockCount } from "@/lib/stock-rules";
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

  const num = (k: string) => {
    const n = Number(String(form.get(k) ?? "").trim());
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const txt = (k: string) => String(form.get(k) ?? "").trim() || undefined;
  const poleSale = parsePoleSale(form.get("poleSaleUnit"), form.get("poleAssemblies"));
  const publishing = String(form.get("intent")) === "publish" || current.status === "active";
  if (category === "poles" && publishing && !poleSale) return { error: "Confirm whether this listing sells a loose section, one assembly or a full set. Full sets need an assembly count (1–100)." };
  const poleSpec =
    category === "poles"
      ? {
          saleUnit: poleSale?.saleUnit,
          assembliesIncluded: poleSale?.assembliesIncluded,
          lengthIn: num("poleLengthIn"),
          sections: num("poleSections"),
          packedLengthIn: num("polePackedIn"),
          diameterMm: num("poleDiameterMm"),
          role: txt("poleRole"),
          colorCode: txt("poleColor"),
          material: txt("poleMaterial"),
          measured: form.get("poleMeasured") === "on",
          shape: (["straight", "prebent", "hub"].includes(String(form.get("poleShape"))) ? String(form.get("poleShape")) : "straight") as "straight" | "prebent" | "hub",
          hubArms: String(form.get("poleShape")) === "hub" ? num("poleHubArms") : undefined,
        }
      : current.poleSpec;

  const imageOrder = lines(form.get("images"));
  const images = imageOrder
    .map((url) => current.images.find((i) => i.url === url))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  const requestedSlug = slugify(String(form.get("slug") ?? "")) || current.slug;
  const quantity = parseStockCount(form.get("quantity"));
  const originalQuantity = parseStockCount(form.get("originalQuantity"));
  if (quantity === null) return { error: "Quantity must be a whole number from 0 to 2 billion." };
  if (originalQuantity === null || current.quantity !== originalQuantity) return { error: "Stock changed since you opened this item. Refresh before saving." };
  const status = String(form.get("intent")) === "publish" ? "active" : current.status;

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
      poleSpec,
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
    .where(and(eq(products.id, id), eq(products.quantity, current.quantity), sql`date_trunc('milliseconds', ${products.updatedAt}) = ${current.updatedAt.toISOString()}::timestamptz`))
    .returning();

  if (!updated) return { error: "This item changed while saving. Refresh and try again." };
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

// ---------- reviews ----------

export async function saveArticle(_: unknown, form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const { articles } = await import("@/lib/db/schema");
  const [current] = await db.select().from(articles).where(eq(articles.id, id));
  if (!current) return { error: "Review not found." };
  const title = String(form.get("title") ?? "").trim();
  if (title.length < 10) return { error: "Add a headline." };
  const body = String(form.get("body") ?? "").trim();
  if (body.length < 200) return { error: "The article body is too short to publish." };
  const sources = lines(form.get("sources"))
    .map((l) => {
      const m = l.match(/^(.*?)\s*\|\s*(https?:\/\/\S+)$/);
      return m ? { title: m[1].trim(), url: m[2] } : null;
    })
    .filter((s): s is { title: string; url: string } => Boolean(s));
  const specs = lines(form.get("specs"))
    .map((l) => {
      const [label, ...rest] = l.split(":");
      return { label: label.trim(), value: rest.join(":").trim() };
    })
    .filter((s) => s.label && s.value);
  const publish = String(form.get("intent")) === "publish";
  const slug = slugify(String(form.get("slug") ?? "")) || current.slug;

  const [updated] = await db
    .update(articles)
    .set({
      title,
      slug,
      dek: String(form.get("dek") ?? "").trim(),
      subject: String(form.get("subject") ?? "").trim() || current.subject,
      stockQuery: String(form.get("stockQuery") ?? "").trim(),
      category: String(form.get("category") ?? current.category),
      verdict: String(form.get("verdict") ?? "").trim(),
      bestFor: String(form.get("bestFor") ?? "").trim(),
      notFor: String(form.get("notFor") ?? "").trim(),
      pros: lines(form.get("pros")),
      cons: lines(form.get("cons")),
      specs,
      body,
      heroImage: String(form.get("heroImage") ?? "").trim() || null,
      sources,
      seoTitle: String(form.get("seoTitle") ?? "").trim().slice(0, 70),
      seoDescription: String(form.get("seoDescription") ?? "").trim().slice(0, 170),
      keywords: commaList(form.get("keywords")),
      status: publish ? "published" : current.status,
      publishedAt: publish && !current.publishedAt ? new Date() : current.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, id))
    .returning();
  revalidatePath("/reviews");
  revalidatePath(`/reviews/${updated.slug}`);
  if (current.slug !== updated.slug) revalidatePath(`/reviews/${current.slug}`);
  revalidatePath("/", "layout");
  return { ok: publish && current.status !== "published" ? "Published. It's live under Reviews." : "Saved." };
}

export async function setArticleStatus(id: string, status: "draft" | "published") {
  await requireAdmin();
  const { articles } = await import("@/lib/db/schema");
  const [a] = await db
    .update(articles)
    .set({ status, updatedAt: new Date(), ...(status === "published" ? { publishedAt: new Date() } : {}) })
    .where(eq(articles.id, id))
    .returning();
  revalidatePath("/reviews");
  revalidatePath(`/reviews/${a.slug}`);
  revalidatePath(`/admin/reviews/${id}`);
}

// ---------- loose pole sorting ----------

/** Adds loose poles from the barrel to an existing pole listing's stock. */
export async function addLoosePoles(productId: string, count: number) {
  await requireAdmin();
  const n = Math.max(1, Math.min(500, Math.floor(count)));
  const [p] = await db
    .update(products)
    .set({
      quantity: sql`${products.quantity} + ${n}`,
      status: sql`case when ${products.status} = 'sold_out' then 'active'::product_status else ${products.status} end`,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId))
    .returning();
  if (!p) return { error: "Pole listing not found." };
  await syncStock([p.id]);
  revalidatePath("/", "layout");
  return { ok: `Added ${n}. ${p.title} now has ${p.quantity} in stock.` };
}

/** Creates a draft listing for poles that don't match any known tent yet. */
export async function listUnmatchedPole(_: unknown, form: FormData) {
  await requireAdmin();
  const n = (k: string) => {
    const v = Number(String(form.get(k) ?? ""));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  const unit = String(form.get("unit") ?? "in");
  const raw = n("length");
  if (!raw) return { error: "Enter the assembled length." };
  const lengthIn = unit === "cm" ? Math.round((raw / 2.54) * 10) / 10 : raw;
  const sections = n("sections");
  const diameterMm = n("diameter");
  const colorCode = String(form.get("color") ?? "").trim();
  const material = String(form.get("material") ?? "Aluminum").trim() || "Aluminum";
  const shape = (["straight", "prebent", "hub"].includes(String(form.get("shape"))) ? String(form.get("shape")) : "straight") as "straight" | "prebent" | "hub";
  const hubArms = shape === "hub" ? n("arms") : undefined;
  const quantity = Math.max(1, Math.floor(n("quantity") ?? 1));
  const priceCents = Math.round((n("price") ?? 24.99) * 100);

  const bits = [
    shape === "hub" ? `${material} Tent Pole Hub Assembly${hubArms ? ` (${hubArms} Legs)` : ""}` : `${shape === "prebent" ? "Pre-Bent " : ""}${material} Tent Pole`,
    `${Number.isInteger(lengthIn) ? lengthIn : lengthIn.toFixed(1)} in`,
    sections ? `${sections} Sections` : "",
    diameterMm ? `${diameterMm} mm` : "",
    colorCode ? colorCode.replace(/^\w/, (c) => c.toUpperCase()) : "",
  ].filter(Boolean);
  const title = `Replacement ${bits.join(", ")}`.slice(0, 80);
  const { skuFor } = await import("@/lib/format");
  const sku = skuFor("poles", "unmatched");

  const [row] = await db
    .insert(products)
    .values({
      sku,
      slug: `${slugify(title)}-${sku.slice(-5).toLowerCase()}`,
      status: "draft",
      title,
      brand: String(form.get("brand") ?? "").trim() || "Unbranded",
      brandSlug: brandSlug(String(form.get("brand") ?? "").trim() || "unbranded"),
      model: "Tent pole",
      category: "poles",
      productType: "Tent pole",
      condition: String(form.get("condition") ?? "used_good"),
      description: `${shape === "hub" ? `Shock-corded ${material.toLowerCase()} tent pole hub assembly${hubArms ? ` with ${hubArms} legs` : ""}, longest leg ${lengthIn} inches from hub to tip` : `Shock-corded ${shape === "prebent" ? "pre-bent " : ""}${material.toLowerCase()} tent pole, ${lengthIn} inches assembled`}${sections ? ` in ${sections} sections` : ""}${diameterMm ? `, ${diameterMm} mm diameter` : ""}. Measure your broken pole and compare: a match within half an inch with the same sections and diameter will usually fit. Not matched to a specific tent model yet.`,
      specs: [
        { label: "Assembled length", value: `${lengthIn} in (${Math.round(lengthIn * 2.54)} cm)` },
        ...(sections ? [{ label: "Sections", value: String(sections) }] : []),
        ...(diameterMm ? [{ label: "Diameter", value: `${diameterMm} mm` }] : []),
        ...(colorCode ? [{ label: "Color", value: colorCode }] : []),
        { label: "Material", value: material },
        { label: "Type", value: shape === "hub" ? `Hub assembly${hubArms ? `, ${hubArms} legs` : ""}` : shape === "prebent" ? "Pre-bent" : "Straight" },
      ],
      seoTitle: `${lengthIn} in ${material} Tent Pole${sections ? `, ${sections} Sections` : ""}`.slice(0, 60),
      seoDescription: `Replacement ${material.toLowerCase()} tent pole, ${lengthIn} in assembled${sections ? `, ${sections} sections` : ""}${diameterMm ? `, ${diameterMm} mm` : ""}. Find your pole by size. Ships from Denver.`.slice(0, 160),
      keywords: [`${lengthIn} inch tent pole`, `${material.toLowerCase()} tent pole replacement`, ...(sections ? [`${sections} section tent pole`] : [])],
      priceCents,
      quantity,
      packagePreset: "pole-tube",
      fitment: [],
      poleSpec: { lengthIn, sections, diameterMm, colorCode: colorCode || undefined, material, measured: true, shape, hubArms },
    })
    .returning({ id: products.id });
  revalidatePath("/admin/products");
  return { ok: "Draft created. Add a photo and publish it.", id: row.id };
}


/** Attach admin-uploaded Blob photos to existing drafts without AI intake. */
export async function attachProductPhotos(id: string, urls: string[]) {
  await requireAdmin();
  if (!Array.isArray(urls) || urls.length < 1 || urls.length > 12 || !urls.every(url => {
    try { const u = new URL(url); return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com") && !u.username && !u.password; } catch { return false; }
  })) return { error: "Use photos uploaded to the configured public Blob store." };
  const result = await db.transaction(async tx => {
    const [p] = await tx.select().from(products).where(eq(products.id, id)).for("update");
    if (!p) return { error: "Product not found." };
    const images = [...p.images, ...urls.filter(url => !p.images.some(i => i.url === url)).map(url => ({ url, alt: p.title }))];
    if (images.length > 24) return { error: "Keep at most 24 photos per listing." };
    await tx.update(products).set({ images, updatedAt: new Date() }).where(eq(products.id, id));
    return { images, slug: p.slug };
  });
  if (result.error) return { error: result.error };
  revalidateProduct(result.slug!);
  return { images: result.images };
}
