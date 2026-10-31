import Link from "next/link";
import { PoleSizeForm } from "@/components/pole-size-form";
import { money } from "@/lib/format";
import { cmToIn, matchLabel, matchPoles } from "@/lib/pole-match";
import { AddLoose, UnmatchedForm } from "./controls";
import { TentCandidates } from "@/components/tent-candidates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Match a loose pole" };

type SP = { shape?: string; arms?: string; length?: string; unit?: string; sections?: string; diameter?: string; color?: string };
const shapeOf = (v?: string) => (v === "hub" || v === "prebent" || v === "straight" ? v : undefined);
const num = (v?: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export default async function MatchLoosePole({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const raw = num(sp.length);
  const lengthIn = raw ? (sp.unit === "cm" ? cmToIn(raw) : raw) : undefined;
  const matches = lengthIn
    ? await matchPoles(
        { lengthIn, shape: shapeOf(sp.shape), hubArms: num(sp.arms), sections: num(sp.sections), diameterMm: num(sp.diameter), colorCode: sp.color, toleranceIn: 1.5 },
        { includeUnlisted: true, limit: 12 },
      )
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-6xl">Match a loose pole</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Measure a pole from the barrel. If it matches a pole you&apos;ve already listed, add it to that listing&apos;s stock. If
          nothing matches, list it by size. Do a whole pile at once: measure one, then set how many are in the pile.
        </p>
      </div>
      <section className="rounded-[var(--radius-tag)] bg-card p-5">
        <PoleSizeForm action="/admin/poles/match" values={sp} showColor submitLabel="Match" />
      </section>

      {matches && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section className="rounded-[var(--radius-tag)] bg-card p-5" aria-labelledby="m">
            <h2 id="m" className="display text-3xl">{matches.length ? `${matches.length} ${matches.length === 1 ? "candidate" : "candidates"}` : "No match on file"}</h2>
            {matches.length === 0 ? (
              <p className="mt-2 text-muted">
                No listed pole is within 1.5 in with the same diameter. List it by size, and it&apos;ll still show up in the
                customer &quot;Find by size&quot; search.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {matches.map((m) => {
                  const s = m.product.poleSpec ?? {};
                  return (
                    <li key={m.product.id} className="flex flex-wrap items-center gap-3 py-3">
                      {m.product.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.product.images[0].url} alt="" className="h-14 w-12 shrink-0 rounded object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${matchLabel(m) === "Exact match" ? "text-accent" : "text-muted"}`}>
                          {matchLabel(m)}
                        </p>
                        <Link href={`/admin/products/${m.product.id}`} className="font-semibold hover:underline">{m.product.title}</Link>
                        <p className="text-sm text-muted [font-variant-numeric:tabular-nums]">
                          {s.lengthIn ? `${s.lengthIn} in` : "length not recorded"}
                          {m.lengthDiff ? ` (${m.lengthDiff > 0 ? "+" : ""}${m.lengthDiff})` : ""}
                          {s.sections ? ` · ${s.sections} sections${m.sectionsMatch === false ? " (differs)" : ""}` : ""}
                          {s.diameterMm ? ` · ${s.diameterMm} mm` : ""}
                          {s.colorCode ? ` · ${s.colorCode}` : ""}
                          {` · ${m.product.quantity} in stock · ${money(m.product.priceCents)} · ${m.product.status.replace("_", " ")}`}
                        </p>
                      </div>
                      <AddLoose productId={m.product.id} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <div className="space-y-6">
            <TentCandidates diameterMm={num(sp.diameter)} shape={sp.shape} linkBase="/admin/products?q=" />
            <UnmatchedForm values={sp} />
          </div>
        </div>
      )}
    </div>
  );
}
