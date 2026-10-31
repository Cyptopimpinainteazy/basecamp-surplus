import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type StoreDatabase = PostgresJsDatabase<typeof schema>;
type DB = StoreDatabase;
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres>; db?: DB };

// Connect lazily so importing this module (e.g. during `next build`) never needs the database.
function getDb(): DB {
  if (globalForDb.db) return globalForDb.db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add your Postgres (Neon) connection string.");
  globalForDb.pg ??= postgres(url, {
    prepare: false, // required for PgBouncer / Neon pooled connections
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    idle_timeout: 20,
  });
  globalForDb.db = drizzle(globalForDb.pg, { schema });
  return globalForDb.db;
}

export const db = new Proxy({} as DB, {
  get(_, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
export { schema };
