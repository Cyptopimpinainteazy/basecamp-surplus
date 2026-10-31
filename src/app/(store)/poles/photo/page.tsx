import type { Metadata } from "next";
import Link from "next/link";
import { PoleMatchGrid } from "@/components/pole-match-grid";
import { PolePhotoForm } from "@/components/pole-photo-form";
import { PolesTabs } from "@/components/poles-tabs";
import { StockAlert } from "@/components/stock-alert";
import { TentCandidates } from "@/components/tent-candidates";
import type { AlertCriteria } from "@/lib/db/schema";
import { modelForQuery, type TentModel } from "@/lib/models";
import { getPhotoCheck, resolvePole, type ResolvedPole } from "@/lib/pole-photo";
import { matchPoles, type PoleMatch } from "@/lib/pole-match";

type Props = { searchParams: Promise<{ id?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { id } = await searchParams;
  return {
    title: "Match a tent pole from a photo",
    description:
      "Upload a photo of your broken tent pole and we'll read the label, color, sections and shape, then show replacement poles in stock that fit. Free, no account.",
    alternates: { canonical: "/poles/photo" },
    robots: id ? { index: false, follow: true } : undefined,
  };
}

export const dynamic = "force-dynamic";

const shapeLabel = { straight: "Straight pole", prebent: "Pre-bent pole", hub: "Hub assembly" } as const;

function Source({ from }: { from?: "you" | "photo" }) {
  if (!from) return <span className="text-sm text-muted">Not readable. Measure it.</span>;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${from === "you" ? "bg-line text-fg" : "bg-lichen/30 text-accent"}`}>
      {from === "you" ? "You entered" : "From your photo"}
    </span>
  );
}

function sizeHref(r: ResolvedPole) {
  const q = new URLSearchParams();
  if (r.shape) q.set("shape", r.shape);
  if (r.lengthIn) q.set("length", String(r.lengthIn));
  if (r.sections) q.set("sections", String(r.sections));
  if (r.diameterMm) q.set("diameter", String(r.diameterMm));
  if (r.hubArms) q.set("arms", String(r.hubArms));
  return `/poles/size${q.size ? `?${q}` : ""}`;
}

async function Result({ id }: { id: string }) {
  const check = await getPhotoCheck(id);
  if (!check) {
    return (
      <Panel title="We couldn't find that match">
        <p className="text-muted">The link may be mistyped. Upload your photos again above.</p>
      </Panel>
    );
  }
  if (!check.read) {
    return (
      <Panel title="We couldn't read those photos">
        <p className="text-muted">
          Try again with a closer, well-lit photo of the label or the whole pole beside a tape measure, or{" "}
          <Link href="/poles/size" className="font-semibold text-fg underline">search by size</Link>.
        </p>
      </Panel>
    );
  }

  const read = check.read;
  const r = resolvePole(check.input, read);
  const hasMeasure = Boolean(r.lengthIn || r.diameterMm);

  if (!read.isTentPole && !r.tent && !hasMeasure) {
    return (
      <Panel title="That doesn't look like a tent pole">
        <p className="text-muted">
          Photograph the pole itself: the whole pole laid out straight, plus a close-up of any printed label or marking near a joint.
        </p>
      </Panel>
    );
  }

  const model: TentModel | null = r.tent ? await modelForQuery(r.tent) : null;
  const matches: PoleMatch[] = hasMeasure
    ? await matchPoles({
        lengthIn: r.lengthIn,
        sections: r.sections,
        diameterMm: r.diameterMm,
        shape: r.shape,
        hubArms: r.hubArms,
        colorCode: r.colorCode,
        toleranceIn: 2,
      })
    : [];

  const alert: AlertCriteria | null = r.lengthIn
    ? { kind: "size", lengthIn: r.lengthIn, sections: r.sections, diameterMm: r.diameterMm, shape: r.shape, hubArms: r.hubArms }
    : model
      ? { kind: "model", model: model.model }
      : null;

  const rows: { label: string; value?: string; from?: "you" | "photo" }[] = [
    { label: "Tent", value: r.tent ?? undefined, from: r.from.tent },
    { label: "Type", value: r.shape ? shapeLabel[r.shape] + (r.hubArms ? `, ${r.hubArms} legs` : "") : undefined, from: r.from.shape },
    { label: "Assembled length", value: r.lengthIn ? `${r.lengthIn} in` : undefined, from: r.from.lengthIn },
    { label: "Sections", value: r.sections ? String(r.sections) : undefined, from: r.from.sections },
    { label: "Diameter", value: r.diameterMm ? `${r.diameterMm} mm` : undefined, from: r.from.diameterMm },
  ];

  return (
    <div className="grid gap-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Panel title="What we read">
          <dl className="divide-y divide-line">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                <dt className="text-sm text-muted">{row.label}</dt>
                <dd className="flex items-center gap-3">
                  {row.value && <span className="font-semibold">{row.value}</span>}
                  <Source from={row.value ? row.from : undefined} />
                </dd>
              </div>
            ))}
            {(read.colorCode || read.material) && (
              <div className="flex flex-wrap items-center justify-between gap-x-4 py-2.5">
                <dt className="text-sm text-muted">Color and material</dt>
                <dd className="font-semibold">{[read.colorCode, read.material].filter(Boolean).join(", ")}</dd>
              </div>
            )}
          </dl>
          {read.readFromLabels.length > 0 && (
            <p className="mt-4 text-sm text-muted">
              Printed on it: {read.readFromLabels.map((t, i) => <q key={i} className="mr-2 font-medium text-fg">{t}</q>)}
            </p>
          )}
        </Panel>

        <Panel title="Next step">
          {model ? (
            <>
              <p className="text-muted">This looks like a pole for the {model.display}.</p>
              <Link href={`/parts/${model.slug}`} className="btn btn-blaze mt-4 h-12">
                See {model.short} poles &amp; parts
              </Link>
            </>
          ) : r.tent ? (
            <p className="text-muted">
              We don&apos;t have a parts page for &ldquo;{r.tent}&rdquo; yet. The size matches below still apply, or open the Help
              chat and we&apos;ll check unlisted stock by hand.
            </p>
          ) : (
            <p className="text-muted">No tent name was readable. Measurements are the next best thing.</p>
          )}
          {read.notes.length > 0 && (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
              {read.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
          <p className="mt-4 text-sm">
            <Link href={sizeHref(r)} className="font-semibold text-fg underline">
              {hasMeasure ? "Adjust these measurements" : "Add your measurements"}
            </Link>{" "}
            to refine the match.
          </p>
        </Panel>
      </div>

      {hasMeasure && (
        <section aria-labelledby="matches">
          <h2 id="matches" className="display text-4xl">
            {matches.length ? `${matches.length} ${matches.length === 1 ? "pole" : "poles"} in stock that could fit` : "No listed pole matches yet"}
          </h2>
          {matches.length > 0 ? (
            <div className="mt-5">
              <PoleMatchGrid matches={matches} />
            </div>
          ) : (
            <p className="mt-2 max-w-2xl text-muted">
              We&apos;re still sorting barrels of poles. Set an alert below, or open the Help chat with your photos and we&apos;ll check
              by hand.
            </p>
          )}
        </section>
      )}

      {!hasMeasure && !model && (
        <Panel title="We need one measurement">
          <p className="text-muted">
            The photos didn&apos;t show a readable length or diameter. Assemble the pole (tape the broken section together), measure
            it tip to tip, and <Link href={sizeHref(r)} className="font-semibold text-fg underline">search by size</Link>.
          </p>
        </Panel>
      )}

      {alert && (
        <div className="max-w-3xl">
          <StockAlert criteria={alert} heading={matches.length ? "None of these right? Get an email when one is listed" : "Get an email when a pole like this is listed"} />
        </div>
      )}

      {(r.diameterMm || r.shape === "hub") && !model && (
        <div className="max-w-3xl">
          <TentCandidates diameterMm={r.diameterMm} shape={r.shape} linkBase="/poles?model=" />
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-tag)] bg-card p-6">
      <h2 className="display mb-3 text-3xl">{title}</h2>
      {children}
    </section>
  );
}

export default async function PolePhoto({ searchParams }: Props) {
  const { id } = await searchParams;
  return (
    <>
      <section className="topo-lines bg-spruce text-glacier">
        <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
          <h1 className="display text-[clamp(3rem,9vw,6.5rem)]">Match a pole from a photo</h1>
          <p className="mb-8 mt-3 max-w-2xl text-lg text-glacier/80">
            Snap the broken pole and any label on it. We read the markings, color, sections and shape, then show the poles in stock
            that fit.
          </p>
          <PolePhotoForm />
          <div className="mt-10">
            <PolesTabs active="photo" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        {id && <Result id={id} />}

        <section className={`max-w-3xl ${id ? "mt-14" : ""}`} aria-labelledby="tips">
          <h2 id="tips" className="display text-4xl">Photos that match best</h2>
          <ol className="prose-review mt-4 list-decimal pl-5 [&>li]:pl-1">
            <li><strong>The label first.</strong> Many North Face poles have a sticker or printed band with the tent name. DAC poles often print the tube diameter, like 8.7 or 9.5, near a joint.</li>
            <li><strong>The whole pole beside a tape measure.</strong> Lay it out assembled and straight, with the tape readable in the shot. We only use lengths we can actually read.</li>
            <li><strong>The bends or the hub.</strong> For pre-bent poles or hub assemblies, include one photo that shows the bend or every leg coming off the hub.</li>
          </ol>
          <p className="mt-4 text-muted">
            We don&apos;t guess lengths from a photo, because a pole that&apos;s two inches off won&apos;t pitch the tent right. Already measured?{" "}
            <Link href="/poles/size" className="font-semibold text-fg underline">Find a pole by size</Link>. Know the tent?{" "}
            <Link href="/poles" className="font-semibold text-fg underline">Search by tent</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
