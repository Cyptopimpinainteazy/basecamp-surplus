CREATE TABLE "stock_adjustments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id"),
  "previous_quantity" integer NOT NULL,
  "quantity" integer NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "stock_adjustment_previous_nonnegative" CHECK ("previous_quantity" >= 0),
  CONSTRAINT "stock_adjustment_quantity_nonnegative" CHECK ("quantity" >= 0)
);
--> statement-breakpoint
CREATE INDEX "stock_adjustments_product_idx" ON "stock_adjustments" ("product_id", "created_at");
