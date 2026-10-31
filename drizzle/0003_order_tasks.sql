CREATE TABLE "order_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id"),
  "kind" text NOT NULL CHECK ("kind" IN ('stock_sync','confirmation','owner_alert')),
  "attempts" integer DEFAULT 0 NOT NULL,
  "lease_token" uuid,
  "locked_until" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "order_tasks_order_kind_idx" ON "order_tasks" ("order_id", "kind");
--> statement-breakpoint
CREATE INDEX "order_tasks_pending_idx" ON "order_tasks" ("completed_at", "locked_until");
