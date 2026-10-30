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

export async function getArticleById(id: string) {
  const [a] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  return a ?? null;
}

/** Published review whose stock query matches a product, for "Read our review" links. */
export async function reviewForProduct(text: string) {
  const rows = await db.select().from(articles).where(and(eq(articles.status, "published")));
  const hay = text.toLowerCase();
  return rows.find((a) => a.stockQuery && hay.includes(a.stockQuery.toLowerCase())) ?? null;
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
