CREATE TYPE "public"."channel" AS ENUM('ebay', 'facebook', 'google', 'poshmark', 'mercari', 'depop', 'geartrade');--> statement-breakpoint
CREATE TYPE "public"."channel_status" AS ENUM('pending', 'listed', 'needs_delist', 'delisted', 'error');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('paid', 'needs_attention', 'label_created', 'shipped', 'delivered', 'refunded', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'sold_out', 'archived');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'waiting', 'closed');--> statement-breakpoint
CREATE TABLE "channel_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"channel" "channel" NOT NULL,
	"status" "channel_status" DEFAULT 'pending' NOT NULL,
	"external_id" text,
	"offer_id" text,
	"url" text,
	"error" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"source" text DEFAULT 'site' NOT NULL,
	"external_id" text,
	"status" "order_status" DEFAULT 'paid' NOT NULL,
	"email" text NOT NULL,
	"customer_name" text DEFAULT '' NOT NULL,
	"items" jsonb NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"shipping_method" text DEFAULT 'standard' NOT NULL,
	"shipping_address" jsonb,
	"package_preset" text,
	"carrier" text,
	"service" text,
	"tracking_number" text,
	"tracking_url" text,
	"label_url" text,
	"label_cost_cents" integer,
	"shippo_transaction_id" text,
	"attention_reason" text,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"shipped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"slug" text NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"brand" text NOT NULL,
	"brand_slug" text NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"product_type" text DEFAULT '' NOT NULL,
	"gender" text DEFAULT '' NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"material" text DEFAULT '' NOT NULL,
	"condition" text DEFAULT 'new_with_tags' NOT NULL,
	"condition_notes" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_description" text DEFAULT '' NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hashtags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"msrp_cents" integer,
	"cost_cents" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"weight_oz" integer,
	"package_preset" text DEFAULT 'medium-box' NOT NULL,
	"fitment" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pole_spec" jsonb,
	"ebay_category_id" text,
	"ebay_aspects" jsonb,
	"pricing_basis" text DEFAULT '' NOT NULL,
	"ai_raw" jsonb,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"email" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"order_number" text,
	"topic" text NOT NULL,
	"summary" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"reply" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_listings" ADD CONSTRAINT "channel_listings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_conversation_id_support_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."support_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "channel_product_idx" ON "channel_listings" USING btree ("product_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number_idx" ON "orders" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_stripe_session_idx" ON "orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_external_idx" ON "orders" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_email_idx" ON "orders" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_status_cat_idx" ON "products" USING btree ("status","category");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand_slug");--> statement-breakpoint
CREATE INDEX "support_conv_ip_idx" ON "support_conversations" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");