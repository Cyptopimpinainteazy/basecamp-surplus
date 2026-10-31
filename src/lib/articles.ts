import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { marked } from "marked";
import { db } from "./db";
import { articles } from "./db/schema";

export async function publishedArticles(limit = 100) {
  return db
    .select()
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

export async function getArticle(slug: string) {
  const [a] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  return a ?? null;
}

/**
 * Finds the review for a tent model name ("The North Face Madraque 33"): an exact
 * subject match first, otherwise a review whose stock query names the model
 * (the "Madraque" pole guide covers the Madraque 23 and 33).
 */
export async function reviewLinker() {
  const rows = await db
    .select({ subject: articles.subject, slug: articles.slug, stockQuery: articles.stockQuery })
    .from(articles)
    .where(eq(articles.status, "published"));
  const bySubject = new Map(rows.map((r) => [r.subject.toLowerCase(), r.slug]));
  const byQuery = rows.filter((r) => r.stockQuery).sort((a, b) => b.stockQuery.length - a.stockQuery.length);
  return (model: string) => bySubject.get(model.toLowerCase()) ?? byQuery.find((r) => mentionsModel(model, r.stockQuery))?.slug ?? null;
}

/** Other published reviews, closest first: same category, then nearest capacity. */
export async function relatedArticles(a: { id: string; category: string; specs: { label: string; value: string }[] }, limit = 4) {
  const cap = (specs: { label: string; value: string }[]) => Number(specs.find((s) => s.label === "Capacity")?.value.match(/\d+/)?.[0] ?? 0);
  const mine = cap(a.specs);
  const rows = await publishedArticles(200);
  return rows
    .filter((r) => r.id !== a.id)
    .map((r) => ({ r, score: (r.category === a.category ? 100 : 0) - Math.abs(cap(r.specs) - mine) * 10 }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.r);
}

export async function getArticleById(id: string) {
  const [a] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  return a ?? null;
}

/**
 * True when text mentions the model as a whole token, so "Tadpole 2" does not
 * match "Tadpole 23" and "Rock 22" does not match "Rock 220".
 */
export function mentionsModel(text: string, model: string) {
  if (!model.trim()) return false;
  const esc = model.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  // Allow a trailing "P" (Wawona 4P = Wawona 4).
  return new RegExp(`(^|[^a-z0-9])${esc}p?($|[^a-z0-9])`, "i").test(text);
}

/** Published review whose stock query matches a product, for "Read our review" links. */
export async function reviewForProduct(text: string) {
  const rows = await db.select().from(articles).where(and(eq(articles.status, "published")));
  // Longest query first, so "Wawona 4" wins over a hypothetical "Wawona".
  return rows.sort((a, b) => b.stockQuery.length - a.stockQuery.length).find((a) => mentionsModel(text, a.stockQuery)) ?? null;
}

export type TocItem = { id: string; text: string };

const slugId = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Renders review markdown. Raw HTML in the source is escaped, h2s get stable ids
 * for the table of contents, and outbound links open in a new tab.
 */
export function renderArticle(md: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const renderer = new marked.Renderer();
  renderer.html = ({ text }) => esc(text);
  renderer.heading = function ({ tokens, depth }) {
    const inner = this.parser.parseInline(tokens);
    const plain = inner.replace(/<[^>]+>/g, "");
    if (depth === 2) {
      const id = slugId(plain);
      toc.push({ id, text: plain });
      return `<h2 id="${id}">${inner}</h2>`;
    }
    return `<h${depth}>${inner}</h${depth}>`;
  };
  renderer.link = function ({ href, tokens }) {
    const inner = this.parser.parseInline(tokens);
    const safe = /^(https?:\/\/|\/|#)/.test(href) ? href : "#";
    const ext = /^https?:\/\//.test(safe);
    return `<a href="${esc(safe)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${inner}</a>`;
  };
  const html = marked.parse(md, { renderer, async: false, gfm: true }) as string;
  return { html, toc };
}

export function readingMinutes(md: string) {
  return Math.max(1, Math.round(md.split(/\s+/).length / 230));
}
