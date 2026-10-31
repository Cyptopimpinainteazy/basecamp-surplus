// Applies pending migrations from ./drizzle. Runs before every Vercel build.
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Drizzle only applies a migration whose timestamp is newer than the last one
// applied, so an out-of-order journal silently skips migrations. Fail loudly.
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: { tag: string; when: number }[] };
journal.entries.forEach((e, i) => {
  const prev = journal.entries[i - 1];
  if (prev && e.when <= prev.when) {
    console.error(`[migrate] ${e.tag} is dated before ${prev.tag}; it would be skipped. Raise its "when" in drizzle/meta/_journal.json.`);
    process.exit(1);
  }
});

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set; skipping migrations.");
  process.exit(0);
}
const client = postgres(url, { prepare: false, max: 1 });
await migrate(drizzle(client), { migrationsFolder: "drizzle" });
await client.end();
console.log("[migrate] database is up to date.");
