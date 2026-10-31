import { NextResponse } from "next/server";
import { publishedArticles } from "@/lib/articles";
import { allComparisons } from "@/lib/compare";
import { allModels } from "@/lib/models";
import { listProducts } from "@/lib/products";

// Instant results for the header search box: products, tent parts pages,
// reviews and comparisons. Small payload, cached briefly at the edge.

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (q.length < 2) return NextResponse.json({ products: [], models: [], reads: [] });
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (text: string) => {
    const t = text.toLowerCase();
    return words.every((w) => t.includes(w));
  };

  const [items, models, reviews, versus] = await Promise.all([
    listProducts({ q, limit: 6 }),
    allModels(),
    publishedArticles(200),
    allComparisons(),
  ]);

  const body = {
    products: items.map((p) => ({
      href: `/p/${p.slug}`,
      title: p.title,
      brand: p.brand,
      priceCents: p.priceCents,
      image: p.images[0]?.url ?? null,
      condition: p.condition,
    })),
    models: models
      .filter((m) => hit(m.display))
      .slice(0, 4)
      .map((m) => ({ href: `/parts/${m.slug}`, title: `${m.display} poles & parts` })),
    reads: [
      ...reviews.filter((a) => hit(`${a.subject} ${a.title}`)).map((a) => ({ href: `/reviews/${a.slug}`, title: a.title, kind: "Review" })),
      ...versus.filter((c) => hit(`${c.a} ${c.b} vs`)).map((c) => ({ href: `/compare/${c.slug}`, title: `${c.A.short} vs ${c.B.short}`, kind: "Compare" })),
    ].slice(0, 4),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
