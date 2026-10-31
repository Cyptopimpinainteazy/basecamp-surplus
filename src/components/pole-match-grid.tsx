import { ProductCard } from "@/components/product-card";
import { matchLabel, type PoleMatch } from "@/lib/pole-match";

/** Ranked pole matches with a fit label above each card. */
export function PoleMatchGrid({ matches }: { matches: PoleMatch[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {matches.map((m) => (
        <li key={m.product.id} className="flex flex-col">
          <p className={`mb-1.5 text-sm font-semibold ${matchLabel(m) === "Exact match" ? "text-spruce" : "text-granite"}`}>
            {matchLabel(m)}
            {m.lengthDiff !== null && m.lengthDiff !== 0 && (
              <span className="font-normal"> · {m.lengthDiff > 0 ? "+" : ""}{m.lengthDiff} in</span>
            )}
          </p>
          <ProductCard p={m.product} />
        </li>
      ))}
    </ul>
  );
}
