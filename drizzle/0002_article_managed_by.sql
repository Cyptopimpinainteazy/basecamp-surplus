ALTER TABLE "articles" ADD COLUMN "managed_by" text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
-- Reviews imported from files before this column existed and never edited in admin stay file-managed.
UPDATE "articles" SET "managed_by" = 'file' WHERE "updated_at" - "created_at" < interval '5 seconds';
