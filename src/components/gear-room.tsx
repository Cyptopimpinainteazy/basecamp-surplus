import Link from "next/link";

const collections = [
  { number: "01", name: "Easton poles", href: "/collections/easton-tent-poles", detail: "Search Easton-marked poles and materials.", style: "bg-lichen/50", mark: "EASTON" },
  { number: "02", name: "DAC poles", href: "/collections/dac-tent-poles", detail: "Explore DAC-marked poles and assemblies.", style: "bg-ice", mark: "DAC" },
  { number: "03", name: "The North Face tents", href: "/brand/the-north-face?q=tent", detail: "A new basecamp starts with the right shelter.", style: "bg-blaze/15", mark: "BASECAMP" },
];
export function GearRoom() {
  return <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6" aria-labelledby="gear-room">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-granite">Repair. Rebuild. Get outside.</p><h2 id="gear-room" className="display mt-3 text-5xl sm:text-6xl">Good tents deserve another season.</h2></div><Link href="/poles/size" className="font-semibold underline underline-offset-4">Don’t know your model? Measure it →</Link></div>
    <ul className="grid gap-4 md:grid-cols-3">{collections.map(c => <li key={c.number}><Link href={c.href} className={`group relative flex min-h-64 flex-col overflow-hidden rounded-[var(--radius-tag)] p-6 ${c.style}`}><span className="text-xs font-semibold tracking-widest">GEAR ROOM / {c.number}</span><span aria-hidden className="display my-7 text-6xl text-spruce/25 transition group-hover:text-spruce/45">{c.mark}</span><div className="mt-auto"><h3 className="display text-4xl">{c.name} <span aria-hidden>↗</span></h3><p className="mt-3 text-sm text-granite">{c.detail}</p></div></Link></li>)}</ul>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-tag)] bg-spruce p-5 text-glacier"><p className="max-w-2xl text-sm">Buying a tent? Check its listed parts before your trip. Replacing a pole? Verify the model year, length, diameter, bends and end fittings.</p><Link href="/poles" className="btn btn-blaze shrink-0">Find poles & parts ↗</Link></div>
    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold"><Link href="/collections/north-face-tent-stakes" className="underline underline-offset-4">Tent stakes</Link><Link href="/brand/the-north-face" className="underline underline-offset-4">The North Face</Link><Link href="/brand/patagonia" className="underline underline-offset-4">Patagonia</Link><Link href="/brand/fjallraven" className="underline underline-offset-4">Fjällräven</Link><Link href="/brand/dope" className="underline underline-offset-4">Dope</Link><Link href="/brand/montec" className="underline underline-offset-4">Montec</Link></div>
  </section>;
}
