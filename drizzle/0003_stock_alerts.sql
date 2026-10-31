CREATE TABLE "stock_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"criteria" jsonb NOT NULL,
	"label" text NOT NULL,
	"token" text NOT NULL,
	"ip" text,
	"notified_at" timestamp with time zone,
	"matched_product_id" uuid,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "stock_alerts_token_idx" ON "stock_alerts" USING btree ("token");--> statement-breakpoint
CREATE INDEX "stock_alerts_open_idx" ON "stock_alerts" USING btree ("notified_at","unsubscribed_at");--> statement-breakpoint
CREATE INDEX "stock_alerts_email_idx" ON "stock_alerts" USING btree ("email");