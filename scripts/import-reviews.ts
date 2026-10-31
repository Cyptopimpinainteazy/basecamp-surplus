// Syncs review articles from content/reviews/*.json into the database on every deploy.
// New slugs are inserted as published. Existing reviews that came from a file are
// updated to match it, unless someone has edited that review in the admin, in which
// case the admin version wins and is left alone.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { articles } from "../src/lib/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[reviews] DATABASE_URL not set; skipping review import.");
  process.exit(0);
}
const dir = path.join(process.cwd(), "content", "reviews");
const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client);

const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json"));
let added = 0;
let updated = 0;
for (const f of files) {
  const a = JSON.parse(await readFile(path.join(dir, f), "utf8"));
  const inserted = await db
    .insert(articles)
    .values({ ...a, status: "published", managedBy: "file", publishedAt: new Date() })
    .onConflictDoNothing({ target: articles.slug })
    .returning({ id: articles.id });
  if (inserted.length) {
    added++;
    continue;
  }
  const { slug, ...fields } = a;
  const changed = await db
    .update(articles)
    .set({ ...fields, updatedAt: new Date() })
    .where(and(eq(articles.slug, slug), eq(articles.managedBy, "file")))
    .returning({ id: articles.id });
  updated += changed.length;
}
await client.end();
console.log(`[reviews] ${files.length} review files: ${added} new, ${updated} synced.`);
