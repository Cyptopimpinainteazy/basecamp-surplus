import "server-only";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { rateEvents } from "./db/schema";

export class RateLimitError extends Error {}

/**
 * Records one event for (bucket, key) and throws once `max` events happen
 * inside `windowMs`. Old rows are trimmed opportunistically.
 */
export async function rateLimit(bucket: string, key: string, max: number, windowMs: number, message: string) {
  const since = new Date(Date.now() - windowMs);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rateEvents)
    .where(and(eq(rateEvents.bucket, bucket), eq(rateEvents.key, key), gt(rateEvents.createdAt, since)));
  if (n >= max) throw new RateLimitError(message);
  await db.insert(rateEvents).values({ bucket, key });
  if (Math.random() < 0.02) await db.delete(rateEvents).where(lt(rateEvents.createdAt, new Date(Date.now() - 7 * 86_400_000)));
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
