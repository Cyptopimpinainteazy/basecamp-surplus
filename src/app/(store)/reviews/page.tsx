import type { Metadata } from "next";
import Link from "next/link";
import { GearImage } from "@/components/gear-image";
import { getCategory } from "@/lib/config";
import { publishedArticles, readingMinutes } from "@/lib/articles";
import { buildSafe } from "@/lib/build-safe";
import { listProducts } from "@/lib/products";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Gear reviews: tents, jackets & camp gear",
  description:
    "In-depth reviews of The North Face tents, snow jackets and camp gear: real sizing, weather performance, durability and which version to buy.",
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsIndex() {
  const items = await buildSafe(() => publishedArticles(), []);
  const images = await buildSafe(
    () => Promise.all(items.map(async (a) => a.heroImage ?? (await listProducts({ q: a.stockQuery, limit: 1 }))[0]?.images[0]?.url ?? null)),
    [] as (string | null)[],
  );
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h1 className="display text-6xl sm:text-7xl">Gear reviews</h1>
      <p className="mt-3 max-w-2xl text-lg text-granite">
        What each piece is good at, who it fits, and where it falls short. Researched from manufacturer specs, retailer data and
        independent testing.
      </p>
      {items.length === 0 ? (
        <p className="mt-10 text-lg">The first reviews are being written now.</p>
      ) : (
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a, i) => (
            <li key={a.id}>
              <Link href={`/reviews/${a.slug}`} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-tag)] bg-ice">
                  {images[i] && <GearImage src={images[i]!} alt="" sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transform-none" />}
                </div>
                <p className="mt-3 flex gap-4 text-sm text-granite">
                  <span>{getCategory(a.category)?.name ?? a.category}</span>
                  <span>{readingMinutes(a.body)} min read</span>
                </p>
                <h2 className="display mt-1 text-3xl group-hover:text-spruce-2">{a.title}</h2>
                <p className="mt-2 line-clamp-3 text-granite">{a.dek}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
