CREATE TABLE "pole_photo_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" text NOT NULL,
	"photo_count" integer NOT NULL,
	"input" jsonb NOT NULL,
	"read" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "pole_photo_checks_ip_idx" ON "pole_photo_checks" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX "pole_photo_checks_created_idx" ON "pole_photo_checks" USING btree ("created_at");