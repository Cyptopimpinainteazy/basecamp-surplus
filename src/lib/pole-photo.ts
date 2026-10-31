import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { readPolePhotos, type PhotoImage } from "./ai/pole-photo";
import { db } from "./db";
import { polePhotoChecks, type PolePhotoCheck, type PolePhotoInput, type PolePhotoRead } from "./db/schema";

const PER_IP_PER_HOUR = 5;
const PER_IP_PER_DAY = 15;
/** Caps AI spend if the page is ever hammered. Override with POLE_PHOTO_DAILY_LIMIT. */
const DAILY_LIMIT = Number(process.env.POLE_PHOTO_DAILY_LIMIT) || 300;

export class PhotoLimitError extends Error {}

async function countSince(since: Date, ip?: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(polePhotoChecks)
    .where(ip ? and(eq(polePhotoChecks.ip, ip), gt(polePhotoChecks.createdAt, since)) : gt(polePhotoChecks.createdAt, since));
  return n;
}

async function checkLimits(ip: string) {
  const hourAgo = new Date(Date.now() - 3600_000);
  const dayAgo = new Date(Date.now() - 86_400_000);
  const [hour, day, all] = await Promise.all([countSince(hourAgo, ip), countSince(dayAgo, ip), countSince(dayAgo)]);
  if (hour >= PER_IP_PER_HOUR || day >= PER_IP_PER_DAY) {
    throw new PhotoLimitError("You've used the photo matcher a lot today. Search by size instead, or open the Help chat.");
  }
  if (all >= DAILY_LIMIT) {
    throw new PhotoLimitError("The photo matcher is busy right now. Search by size instead, or open the Help chat.");
  }
}

/** Reads the photos and records the result. Returns the check id for the results page. */
export async function runPhotoCheck(ip: string, images: PhotoImage[], input: PolePhotoInput) {
  await checkLimits(ip);
  // Record the attempt before calling the AI, so failed or slow calls still count toward the limit.
  const [row] = await db.insert(polePhotoChecks).values({ ip, photoCount: images.length, input }).returning({ id: polePhotoChecks.id });
  try {
    const read = await readPolePhotos(images, input.tent);
    await db.update(polePhotoChecks).set({ read }).where(eq(polePhotoChecks.id, row.id));
    return row.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Couldn't read the photos.";
    await db.update(polePhotoChecks).set({ error: msg.slice(0, 500) }).where(eq(polePhotoChecks.id, row.id));
    throw e;
  }
}

export async function getPhotoCheck(id: string): Promise<PolePhotoCheck | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select().from(polePhotoChecks).where(eq(polePhotoChecks.id, id));
  return row ?? null;
}

export type ResolvedPole = {
  tent: string | null;
  lengthIn?: number;
  sections?: number;
  diameterMm?: number;
  shape?: "straight" | "prebent" | "hub";
  hubArms?: number;
  colorCode?: string;
  /** Where each value came from, for the "what we read" panel. */
  from: Partial<Record<"tent" | "lengthIn" | "sections" | "diameterMm" | "shape" | "hubArms", "you" | "photo">>;
};

/** Combines the customer's measurements with the photo reading. The customer's numbers always win. */
export function resolvePole(input: PolePhotoInput, read: PolePhotoRead | null): ResolvedPole {
  const from: ResolvedPole["from"] = {};
  const pick = <K extends keyof ResolvedPole["from"], V>(key: K, mine: V | undefined, theirs: V | null | undefined) => {
    if (mine !== undefined && mine !== null && mine !== "") {
      from[key] = "you";
      return mine;
    }
    if (theirs !== undefined && theirs !== null && theirs !== "") {
      from[key] = "photo";
      return theirs;
    }
    return undefined;
  };
  const photoTent = read?.tentModel ? [read.brand && !/^(dac|easton)\b/i.test(read.brand) ? read.brand : "", read.tentModel].filter(Boolean).join(" ") : null;
  const shape = pick("shape", input.shape, read?.shape);
  return {
    tent: pick("tent", input.tent?.trim() || undefined, photoTent) ?? null,
    lengthIn: pick("lengthIn", input.lengthIn, read?.lengthIn),
    sections: pick("sections", input.sections, read?.sections),
    diameterMm: pick("diameterMm", input.diameterMm, read?.diameterMm),
    shape,
    hubArms: shape === "hub" ? pick("hubArms", input.hubArms, read?.hubArms) : undefined,
    colorCode: read?.colorCode ?? undefined,
    from,
  };
}
