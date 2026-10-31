import { confidenceLabel, hubTents, tentsForDiameter } from "@/lib/tent-reference";

/** "Which tents used a pole like this?" panel, driven by the published reference table. */
export function TentCandidates({ diameterMm, shape, linkBase }: { diameterMm?: number; shape?: string; linkBase: string }) {
  const isHub = shape === "hub";
  const list = diameterMm ? tentsForDiameter(diameterMm, { hub: isHub ? true : undefined }) : isHub ? hubTents() : [];
  if (!diameterMm && !isHub) return null;
  return (
    <section className="rounded-[var(--radius-tag)] bg-snow p-5" aria-labelledby="tc">
      <h2 id="tc" className="display text-3xl">Tents that used a pole like this</h2>
      <p className="mt-1 text-sm text-granite">
        From published North Face specs{diameterMm ? `, matching ${diameterMm} mm within 0.2 mm` : ", hub-pole tents"}. Diameter narrows it
        down; length and sections confirm it.
      </p>
      {list.length === 0 ? (
        <p className="mt-3 text-granite">No tent in the reference table lists that diameter yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-ice">
          {list.map((t) => (
            <li key={t.model} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
              <span>
                <a href={`${linkBase}${encodeURIComponent(t.model)}`} className="font-semibold hover:underline">{t.model}</a>
                <span className="block text-sm text-granite">
                  {[t.poleCount ? `${t.poleCount} poles` : "", t.diametersMm.length ? `${t.diametersMm.join(" / ")} mm` : "", t.poleSystem, t.hub ? "hub" : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <a href={t.source.url} target="_blank" rel="noopener nofollow" className="text-xs text-granite underline">
                {confidenceLabel[t.confidence]}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
