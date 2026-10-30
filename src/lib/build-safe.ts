import "server-only";

/**
 * During `next build` without a database (first deploy, before Neon is attached),
 * static pages render with empty data and refresh on their revalidate timer.
 * At runtime, or when DATABASE_URL is present at build, the real query always runs.
 */
export async function buildSafe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (process.env.NEXT_PHASE === "phase-production-build" && !process.env.DATABASE_URL) return fallback;
  return fn();
}
