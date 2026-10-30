import Link from "next/link";
import { countProducts, listProducts, sizesInCategory, type ProductQuery } from "@/lib/products";
import { ProductGrid } from "./product-card";

const PAGE = 24;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseQuery(sp: SP, base: Partial<ProductQuery> = {}): ProductQuery & { page: number } {
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const sort = one(sp.sort);
  const condition = one(sp.condition);
  return {
    ...base,
    q: one(sp.q)?.slice(0, 100),
    size: one(sp.size),
    condition: condition === "new" || condition === "used" ? condition : undefined,
    sort: sort === "price_asc" || sort === "price_desc" || sort === "savings" ? sort : "new",
    limit: PAGE,
    offset: (page - 1) * PAGE,
    page,
  };
}

function hrefWith(path: string, sp: SP, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const s = one(v);
    if (s && k !== "page") params.set(k, s);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") params.delete(k);
    else params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function Catalog({ path, sp, base, sizeCategory }: { path: string; sp: SP; base?: Partial<ProductQuery>; sizeCategory?: string }) {
  const q = parseQuery(sp, base);
  const [items, total, sizes] = await Promise.all([
    listProducts(q),
    countProducts(q),
    sizeCategory ? sizesInCategory(sizeCategory) : Promise.resolve([] as string[]),
  ]);
  const pages = Math.ceil(total / PAGE);
  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium border-[1.5px] ${active ? "border-spruce bg-spruce text-glacier" : "border-ice bg-snow hover:border-spruce"}`;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" aria-label="Filter by condition">
          <Link href={hrefWith(path, sp, { condition: undefined })} className={chip(!q.condition)}>All</Link>
          <Link href={hrefWith(path, sp, { condition: "new" })} className={chip(q.condition === "new")}>New</Link>
          <Link href={hrefWith(path, sp, { condition: "used" })} className={chip(q.condition === "used")}>Pre-owned</Link>
          {sizes.length > 0 && <span className="mx-1 w-px self-stretch bg-ice" aria-hidden />}
          {sizes.map((s) => (
            <Link key={s} href={hrefWith(path, sp, { size: q.size === s ? undefined : s })} className={chip(q.size === s)}>
              {s}
            </Link>
          ))}
        </div>
        <form className="flex items-center gap-2" action={path}>
          {Object.entries(sp).map(([k, v]) =>
            k !== "sort" && k !== "page" && one(v) ? <input key={k} type="hidden" name={k} value={one(v)} /> : null,
          )}
          <label htmlFor="sort" className="text-sm text-granite">Sort</label>
          <select id="sort" name="sort" defaultValue={q.sort} className="field h-10 min-h-0 w-auto py-0">
            <option value="new">Newest</option>
            <option value="savings">Biggest savings</option>
            <option value="price_asc">Price, low to high</option>
            <option value="price_desc">Price, high to low</option>
          </select>
          <button className="btn btn-line h-10 min-h-0 px-3 text-sm">Apply</button>
        </form>
      </div>
      <p className="mb-4 text-granite" aria-live="polite">
        {total} {total === 1 ? "item" : "items"}
        {q.q ? ` matching “${q.q}”` : ""}
      </p>
      {items.length > 0 ? (
        <ProductGrid items={items} />
      ) : (
        <div className="rounded-[var(--radius-tag)] bg-snow p-8">
          <p className="text-lg font-semibold">Nothing matches those filters right now.</p>
          <p className="mt-1 text-granite">Clear a filter, or ask the Help chat. We may have it in the back room.</p>
          <Link href={path} className="btn btn-spruce mt-4">Clear filters</Link>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-10 flex flex-wrap gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={hrefWith(path, sp, { page: n === 1 ? undefined : String(n) })}
              aria-current={n === q.page ? "page" : undefined}
              className={`grid h-10 min-w-10 place-items-center rounded-md px-3 ${n === q.page ? "bg-spruce text-glacier" : "bg-snow hover:bg-ice"}`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
