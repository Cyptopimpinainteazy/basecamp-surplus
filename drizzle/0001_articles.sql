CREATE TYPE "public"."article_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"dek" text DEFAULT '' NOT NULL,
	"subject" text NOT NULL,
	"stock_query" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'tents' NOT NULL,
	"verdict" text DEFAULT '' NOT NULL,
	"best_for" text DEFAULT '' NOT NULL,
	"not_for" text DEFAULT '' NOT NULL,
	"pros" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"hero_image" text,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_description" text DEFAULT '' NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status","published_at");