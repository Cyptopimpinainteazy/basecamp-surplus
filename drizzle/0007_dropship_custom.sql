CREATE TABLE "custom_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"company" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"config" jsonb NOT NULL,
	"summary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"artwork" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proofs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"estimate_cents" integer,
	"price_cents" integer,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"cost_cents" integer,
	"supplier_id" uuid,
	"needed_by" text DEFAULT '' NOT NULL,
	"customer_note" text DEFAULT '' NOT NULL,
	"owner_note" text DEFAULT '' NOT NULL,
	"token" text NOT NULL,
	"ip" text,
	"stripe_session_id" text,
	"order_id" uuid,
	"quoted_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"order_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"items" jsonb NOT NULL,
	"ship_to" jsonb,
	"cost_cents" integer,
	"token" text NOT NULL,
	"carrier" text,
	"tracking_number" text,
	"tracking_url" text,
	"supplier_note" text DEFAULT '' NOT NULL,
	"sent_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'dropship' NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"order_email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"blind_ship" boolean DEFAULT false NOT NULL,
	"lead_time_days" integer,
	"notes" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fulfillment" text DEFAULT 'stock' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "supplier_sku" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "lead_time_days" integer;--> statement-breakpoint
ALTER TABLE "custom_jobs" ADD CONSTRAINT "custom_jobs_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_jobs" ADD CONSTRAINT "custom_jobs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "custom_jobs_number_idx" ON "custom_jobs" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_jobs_token_idx" ON "custom_jobs" USING btree ("token");--> statement-breakpoint
CREATE INDEX "custom_jobs_status_idx" ON "custom_jobs" USING btree ("status","kind");--> statement-breakpoint
CREATE INDEX "custom_jobs_ip_idx" ON "custom_jobs" USING btree ("ip","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_number_idx" ON "purchase_orders" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_token_idx" ON "purchase_orders" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_order_supplier_idx" ON "purchase_orders" USING btree ("order_id","supplier_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_fulfillment_check" CHECK ("fulfillment" IN ('stock','dropship','made_to_order'));--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_status_check" CHECK ("status" IN ('pending','sent','confirmed','shipped','cancelled'));--> statement-breakpoint
ALTER TABLE "custom_jobs" ADD CONSTRAINT "custom_jobs_kind_check" CHECK ("kind" IN ('canopy','poles','private_label'));--> statement-breakpoint
ALTER TABLE "custom_jobs" ADD CONSTRAINT "custom_jobs_status_check" CHECK ("status" IN ('requested','quoted','checkout','paid','in_production','shipped','declined','cancelled'));--> statement-breakpoint
CREATE UNIQUE INDEX "custom_jobs_stripe_session_idx" ON "custom_jobs" USING btree ("stripe_session_id");--> statement-breakpoint
ALTER TABLE "order_tasks" DROP CONSTRAINT IF EXISTS "order_tasks_kind_check";--> statement-breakpoint
ALTER TABLE "order_tasks" ADD CONSTRAINT "order_tasks_kind_check" CHECK ("kind" IN ('stock_sync','confirmation','owner_alert','supplier_po'));
--> statement-breakpoint
CREATE TABLE "rate_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket" text NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_events_lookup_idx" ON "rate_events" USING btree ("bucket","key","created_at");