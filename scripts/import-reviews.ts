// Loads review articles from content/reviews/*.json into the database.
// New slugs are inserted as published; existing slugs are left alone so edits
// made in the admin are never overwritten. Runs after migrations on every deploy.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
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
for (const f of files) {
  const a = JSON.parse(await readFile(path.join(dir, f), "utf8"));
  const rows = await db
    .insert(articles)
    .values({ ...a, status: "published", publishedAt: new Date() })
    .onConflictDoNothing({ target: articles.slug })
    .returning({ id: articles.id });
  added += rows.length;
}
await client.end();
console.log(`[reviews] ${files.length} review files, ${added} new.`);
