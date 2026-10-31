import Link from "next/link";
import { getCondition, isNewCondition } from "@/lib/config";
import type { Product } from "@/lib/db/schema";
import { money, savingsPercent } from "@/lib/format";
import { GearImage } from "./gear-image";

export function ConditionMark({ condition }: { condition: string }) {
  const c = getCondition(condition);
  const fresh = isNewCondition(condition);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold ${
        fresh ? "bg-blaze/15 text-blaze-deep" : "bg-lichen/60 text-accent"
      }`}
    >
      {fresh ? (condition === "new_with_tags" ? "New with tags" : c.label) : c.label}
    </span>
  );
}

export function ProductCard({ p, priority }: { p: Product; priority?: boolean }) {
  const save = savingsPercent(p.priceCents, p.msrpCents);
  const img = p.images[0];
  const alt = p.images[1];
  return (
    <Link
      href={`/p/${p.slug}`}
      className="tag-card group block overflow-hidden shadow-[0_1px_0_rgba(19,32,28,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_40px_-24px_rgba(19,32,28,.55)] focus-visible:outline-offset-4 motion-reduce:transform-none"
    >
      <span className="tag-hole" aria-hidden />
      <div className="relative aspect-[4/5] overflow-hidden bg-line">
        {save >= 15 && (
          <span className="display absolute right-2.5 top-2.5 z-[2] rotate-3 rounded bg-blaze px-2 py-0.5 text-xl leading-tight text-ink">
            {save}% off
          </span>
        )}
        {img && (
          <GearImage
            src={img.url}
            alt={img.alt || p.title}
            sizes="(min-width:1280px) 300px, (min-width:768px) 33vw, 50vw"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        {/* Hover preview: second photo (back, label, detail) fades in on hover. */}
        {alt && (
          <GearImage
            src={alt.url}
            alt=""
            sizes="(min-width:1280px) 300px, (min-width:768px) 33vw, 50vw"
            className="alt-photo object-cover"
          />
        )}
      </div>
      <div className="space-y-1.5 p-3.5 sm:p-4">
        <p className="text-sm text-muted">{p.brand}</p>
        <h3 className="line-clamp-2 min-h-[2.6em] font-semibold leading-snug">{p.title}</h3>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="display text-[2rem] leading-none transition-colors group-hover:text-blaze-deep">{money(p.priceCents)}</span>
          {save > 0 && (
            <span className="text-sm text-muted">
              <s>{money(p.msrpCents)}</s> retail
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <ConditionMark condition={p.condition} />
          {p.size && <span className="text-sm text-muted">Size {p.size}</span>}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ items }: { items: Product[] }) {
  return (
    <ul className="reveal-stagger grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {items.map((p, i) => (
        <li key={p.id}>
          <ProductCard p={p} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
