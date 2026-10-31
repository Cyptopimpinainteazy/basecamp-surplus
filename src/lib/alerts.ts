import "server-only";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { mentionsModel } from "./articles";
import { site } from "./config";
import { db } from "./db";
import { products, stockAlerts, type AlertCriteria, type Product } from "./db/schema";
import { sendEmail } from "./email/send";
import { stockAlertEmail } from "./email/templates";

const MAX_PER_IP_PER_HOUR = 10;
const MAX_OPEN_PER_EMAIL = 25;

export function alertLabel(c: AlertCriteria) {
  if (c.kind === "model") return `Poles or parts for the ${c.model.replace(/^the\s+/i, "")}`;
  if (c.kind === "product") return c.title;
  const bits = [
    c.shape === "hub" ? `hub assembly${c.hubArms ? `, ${c.hubArms} legs` : ""}` : c.shape === "prebent" ? "pre-bent pole" : "tent pole",
    `${c.lengthIn} in`,
    c.sections ? `${c.sections} sections` : "",
    c.diameterMm ? `${c.diameterMm} mm` : "",
  ].filter(Boolean);
  return bits.join(", ").replace(/^\w/, (x) => x.toUpperCase());
}

export async function createAlert(email: string, criteria: AlertCriteria, ip: string) {
  const normalized = email.trim().toLowerCase();
  const [{ n: recent }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(stockAlerts)
    .where(and(eq(stockAlerts.ip, ip), gt(stockAlerts.createdAt, new Date(Date.now() - 3600_000))));
  if (recent >= MAX_PER_IP_PER_HOUR) throw new Error("Too many alerts from this connection in the last hour. Try again later.");
  const [{ n: open }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(stockAlerts)
    .where(and(eq(stockAlerts.email, normalized), isNull(stockAlerts.notifiedAt), isNull(stockAlerts.unsubscribedAt)));
  if (open >= MAX_OPEN_PER_EMAIL) throw new Error("That email already has the maximum number of open alerts.");

  const label = alertLabel(criteria);
  // One open alert per email and label is enough.
  const [dupe] = await db
    .select({ id: stockAlerts.id })
    .from(stockAlerts)
    .where(and(eq(stockAlerts.email, normalized), eq(stockAlerts.label, label), isNull(stockAlerts.notifiedAt), isNull(stockAlerts.unsubscribedAt)));
  if (dupe) return { label, existing: true };

  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString("base64url");
  await db.insert(stockAlerts).values({ email: normalized, criteria, label, token, ip });
  return { label, existing: false };
}

function matches(c: AlertCriteria, p: Product) {
  if (c.kind === "product") return c.productId === p.id;
  if (c.kind === "model") {
    const text = `${p.title} ${p.model} ${p.fitment.join(" ")}`;
    const short = c.model.replace(/^the north face\s+/i, "");
    return mentionsModel(text, short);
  }
  if (p.category !== "poles") return false;
  const s = p.poleSpec ?? {};
  if (!s.lengthIn || Math.abs(s.lengthIn - c.lengthIn) > 1) return false;
  if (c.sections && s.sections && c.sections !== s.sections) return false;
  if (c.diameterMm && s.diameterMm && Math.abs(c.diameterMm - s.diameterMm) > 0.3) return false;
  const theirs = s.shape ?? "straight";
  if (c.shape && (c.shape === "hub") !== (theirs === "hub")) return false;
  if (c.shape === "hub" && c.hubArms && s.hubArms && c.hubArms !== s.hubArms) return false;
  return true;
}

/**
 * Emails everyone waiting for something these products satisfy. Call after a
 * product goes live or its stock goes up. Each alert fires once.
 */
export async function notifyStockAlerts(productIds: string[]) {
  if (!productIds.length) return 0;
  const live = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, productIds), eq(products.status, "active"), gt(products.quantity, 0)));
  if (!live.length) return 0;
  const open = await db
    .select()
    .from(stockAlerts)
    .where(and(isNull(stockAlerts.notifiedAt), isNull(stockAlerts.unsubscribedAt)));

  let sent = 0;
  for (const alert of open) {
    const hit = live.find((p) => matches(alert.criteria, p));
    if (!hit) continue;
    // Claim the alert first so concurrent saves never double-send.
    const [claimed] = await db
      .update(stockAlerts)
      .set({ notifiedAt: new Date(), matchedProductId: hit.id })
      .where(and(eq(stockAlerts.id, alert.id), isNull(stockAlerts.notifiedAt)))
      .returning({ id: stockAlerts.id });
    if (!claimed) continue;
    try {
      await sendEmail({
        to: alert.email,
        ...stockAlertEmail({
          label: alert.label,
          productTitle: hit.title,
          productUrl: `${site.url}/p/${hit.slug}`,
          priceCents: hit.priceCents,
          unsubscribeUrl: `${site.url}/alerts/unsubscribe?token=${alert.token}`,
        }),
      });
      sent++;
    } catch (e) {
      // Leave it claimed; the owner can see failed sends in logs rather than spamming retries.
      console.error("[stock alert]", alert.id, e);
    }
  }
  return sent;
}

export async function unsubscribeAlert(token: string) {
  const [row] = await db
    .update(stockAlerts)
    .set({ unsubscribedAt: new Date() })
    .where(and(eq(stockAlerts.token, token), isNull(stockAlerts.unsubscribedAt)))
    .returning({ label: stockAlerts.label });
  return row ?? null;
}

/** What customers are waiting for, most-wanted first. Tells you what to sort and list next. */
export async function alertDemand(limit = 12) {
  return db
    .select({ label: stockAlerts.label, waiting: sql<number>`count(*)::int`, latest: sql<Date>`max(${stockAlerts.createdAt})` })
    .from(stockAlerts)
    .where(and(isNull(stockAlerts.notifiedAt), isNull(stockAlerts.unsubscribedAt)))
    .groupBy(stockAlerts.label)
    .orderBy(desc(sql`count(*)`), desc(sql`max(${stockAlerts.createdAt})`))
    .limit(limit);
}
