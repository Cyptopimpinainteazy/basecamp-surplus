import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/db/schema";
import { money } from "@/lib/format";
import { GearImage } from "./gear-image";

export function Hero({ inStock, brandsLine, featured }: { inStock: number; brandsLine: string; featured: Product | null }) {
  return <section aria-labelledby="hero-title">
    <div className="relative isolate flex min-h-[600px] items-center overflow-hidden bg-spruce text-glacier sm:min-h-[700px]">
      <Image src="/editorial/alpine-campsite.webp" alt="Generic orange tent at an alpine lake at dusk; AI-generated lifestyle scene" fill priority sizes="100vw" className="-z-20 object-cover object-[62%_center]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-ink/45 to-ink/10" aria-hidden />
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[.24em] text-glacier/80">Denver, Colorado / Independent outdoor outfitter</p>
        <h1 id="hero-title" className="display mt-6 max-w-3xl text-[clamp(4.5rem,9vw,8rem)]">The tent stays.<br/><span className="text-blaze">The adventure<br/>goes on.</span></h1>
        <p className="mt-7 max-w-lg text-lg text-glacier/85">Replacement poles for the shelter you love. Tents and outdoor gear for the miles still ahead.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/poles" className="btn btn-blaze">Find your replacement pole ↗</Link><Link href="/c/tents" className="btn btn-line bg-ink/30">Explore tents</Link></div>
        <p className="mt-8 text-sm text-glacier/75">{inStock > 0 ? `${inStock.toLocaleString()} units currently listed in stock.` : "Explore the model guides while inventory is being listed."}</p>
      </div>
      <p className="absolute bottom-4 right-4 max-w-64 text-right text-[10px] text-white/75">AI-generated lifestyle image. Not a photograph of a listed tent.</p>
    </div>
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 pt-8 sm:px-6">
      <p className="max-w-2xl text-lg text-granite">Explore gear from {brandsLine}. Check each listing for actual photos, condition and included parts.</p>
      {featured && <Link href={`/p/${featured.slug}`} className="flex max-w-sm items-center gap-4 rounded-[var(--radius-tag)] bg-snow p-3"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-ice">{featured.images[0] && <GearImage src={featured.images[0].url} alt={featured.images[0].alt || featured.title} sizes="80px" />}</div><div><p className="text-xs uppercase tracking-wider text-granite">From the current inventory</p><p className="mt-1 line-clamp-2 text-sm font-semibold">{featured.title}</p><p className="display mt-2 text-3xl">{money(featured.priceCents)}</p></div></Link>}
    </div>
  </section>;
}
