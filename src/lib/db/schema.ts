import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const productStatus = pgEnum("product_status", ["draft", "active", "sold_out", "archived"]);
export const orderStatus = pgEnum("order_status", [
  "paid",
  "needs_attention",
  "label_created",
  "shipped",
  "delivered",
  "refunded",
  "canceled",
]);
export const channelEnum = pgEnum("channel", [
  "ebay",
  "facebook",
  "google",
  "poshmark",
  "mercari",
  "depop",
  "geartrade",
]);
export const channelStatus = pgEnum("channel_status", [
  "pending",
  "listed",
  "needs_delist",
  "delisted",
  "error",
]);
export const ticketStatus = pgEnum("ticket_status", ["open", "waiting", "closed"]);

export type ProductImage = { url: string; alt: string; width?: number; height?: number };
export type Spec = { label: string; value: string };
export type PoleSpec = {
  /** One sale unit: a loose section, a complete assembly, or a full tent set. */
  saleUnit?: "section" | "assembly" | "set";
  assembliesIncluded?: number;
  sections?: number;
  /** Assembled length, tip to tip, measured straight. */
  lengthIn?: number;
  /** Length of one folded section (the packed length). */
  packedLengthIn?: number;
  /** Set when the length was tape-measured from stock rather than read from a label. */
  measured?: boolean;
  /** straight = flexes into shape; prebent = sections have factory bends; hub = several legs joined at an aluminum hub. */
  shape?: "straight" | "prebent" | "hub";
  /** Hub assemblies: number of legs coming off the hub. lengthIn is then the longest leg, hub center to tip. */
  hubArms?: number;
  diameterMm?: number;
  material?: string;
  colorCode?: string;
  role?: string; // e.g. "main hub pole", "brow pole", "fly pole"
};

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull(),
    slug: text("slug").notNull(),
    status: productStatus("status").notNull().default("draft"),
    title: text("title").notNull(),
    brand: text("brand").notNull(),
    brandSlug: text("brand_slug").notNull(),
    model: text("model").notNull().default(""),
    category: text("category").notNull(),
    productType: text("product_type").notNull().default(""),
    gender: text("gender").notNull().default(""),
    size: text("size").notNull().default(""),
    color: text("color").notNull().default(""),
    material: text("material").notNull().default(""),
    condition: text("condition").notNull().default("new_with_tags"),
    conditionNotes: text("condition_notes").notNull().default(""),
    description: text("description").notNull().default(""),
    highlights: jsonb("highlights").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    specs: jsonb("specs").$type<Spec[]>().notNull().default(sql`'[]'::jsonb`),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    keywords: jsonb("keywords").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    hashtags: jsonb("hashtags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    images: jsonb("images").$type<ProductImage[]>().notNull().default(sql`'[]'::jsonb`),
    priceCents: integer("price_cents").notNull().default(0),
    msrpCents: integer("msrp_cents"),
    costCents: integer("cost_cents"),
    quantity: integer("quantity").notNull().default(1),
    weightOz: integer("weight_oz"),
    packagePreset: text("package_preset").notNull().default("medium-box"),
    fitment: jsonb("fitment").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    poleSpec: jsonb("pole_spec").$type<PoleSpec>(),
    ebayCategoryId: text("ebay_category_id"),
    ebayAspects: jsonb("ebay_aspects").$type<Record<string, string[]>>(),
    pricingBasis: text("pricing_basis").notNull().default(""),
    aiRaw: jsonb("ai_raw"),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("products_sku_idx").on(t.sku),
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_status_cat_idx").on(t.status, t.category),
    index("products_brand_idx").on(t.brandSlug),
  ],
);

export const channelListings = pgTable(
  "channel_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    channel: channelEnum("channel").notNull(),
    status: channelStatus("status").notNull().default("pending"),
    externalId: text("external_id"),
    offerId: text("offer_id"),
    url: text("url"),
    error: text("error"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("channel_product_idx").on(t.productId, t.channel)],
);

export type OrderItem = {
  productId: string;
  sku: string;
  title: string;
  quantity: number;
  unitCents: number;
  saleUnitLabel?: string;
  image?: string;
};
export type Address = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
};

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull(),
    source: text("source").notNull().default("site"), // site | ebay
    externalId: text("external_id"),
    status: orderStatus("status").notNull().default("paid"),
    email: text("email").notNull(),
    customerName: text("customer_name").notNull().default(""),
    items: jsonb("items").$type<OrderItem[]>().notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    shippingMethod: text("shipping_method").notNull().default("standard"),
    shippingAddress: jsonb("shipping_address").$type<Address>(),
    packagePreset: text("package_preset"),
    carrier: text("carrier"),
    service: text("service"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    labelUrl: text("label_url"),
    labelCostCents: integer("label_cost_cents"),
    shippoTransactionId: text("shippo_transaction_id"),
    attentionReason: text("attention_reason"),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_number_idx").on(t.number),
    uniqueIndex("orders_stripe_session_idx").on(t.stripeSessionId),
    uniqueIndex("orders_external_idx").on(t.source, t.externalId),
    index("orders_status_idx").on(t.status),
    index("orders_email_idx").on(t.email),
  ],
);

export type ChatMessage = { role: "user" | "assistant"; content: string; at: string };

export const supportConversations = pgTable(
  "support_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messages: jsonb("messages").$type<ChatMessage[]>().notNull().default(sql`'[]'::jsonb`),
    email: text("email"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("support_conv_ip_idx").on(t.ip, t.createdAt)],
);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").references(() => supportConversations.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull().default(""),
    email: text("email").notNull(),
    orderNumber: text("order_number"),
    topic: text("topic").notNull(),
    summary: text("summary").notNull(),
    status: ticketStatus("status").notNull().default("open"),
    reply: text("reply"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("support_tickets_status_idx").on(t.status)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ChannelListing = typeof channelListings.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type Channel = (typeof channelEnum.enumValues)[number];

// ---------- Reviews (long-form gear articles) ----------

export const articleStatus = pgEnum("article_status", ["draft", "published"]);
export type ArticleSource = { title: string; url: string };

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    status: articleStatus("status").notNull().default("draft"),
    title: text("title").notNull(),
    dek: text("dek").notNull().default(""),
    /** Product family the review covers, e.g. "The North Face Wawona 4". Drives the in-stock box. */
    subject: text("subject").notNull(),
    /** Search terms that find matching stock, e.g. "Wawona 4". */
    stockQuery: text("stock_query").notNull().default(""),
    category: text("category").notNull().default("tents"),
    verdict: text("verdict").notNull().default(""),
    bestFor: text("best_for").notNull().default(""),
    notFor: text("not_for").notNull().default(""),
    pros: jsonb("pros").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    cons: jsonb("cons").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    specs: jsonb("specs").$type<Spec[]>().notNull().default(sql`'[]'::jsonb`),
    body: text("body").notNull().default(""),
    heroImage: text("hero_image"),
    sources: jsonb("sources").$type<ArticleSource[]>().notNull().default(sql`'[]'::jsonb`),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    keywords: jsonb("keywords").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("articles_slug_idx").on(t.slug), index("articles_status_idx").on(t.status, t.publishedAt)],
);

export type Article = typeof articles.$inferSelect;

/** Manual stock counts made in the dedicated stock workspace (not a sales ledger). */
export const stockAdjustments = pgTable("stock_adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id),
  previousQuantity: integer("previous_quantity").notNull(),
  quantity: integer("quantity").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("stock_adjustments_product_idx").on(t.productId, t.createdAt)]);
