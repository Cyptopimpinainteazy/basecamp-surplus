import Link from "next/link";
import type { Product } from "@/lib/db/schema";
import { money, savingsPercent } from "@/lib/format";
import { GearImage } from "./gear-image";
import { Parallax } from "./parallax";
import { ridges } from "./ridge-paths";

// Atmospheric perspective: far ridges are lighter and bluer, near ridges darker.
const ridgeFills = ["#3d5e57", "#2c4a42", "#1c332d", "#13201c"];

/**
 * The one bold moment on the site: a Front Range dusk. The headline sits between
 * ridgelines so the nearest mountains rise over its baseline, and a hang tag on the
 * right shows a real piece of stock with its price.
 */
export function Hero({ inStock, brandsLine, featured }: { inStock: number; brandsLine: string; featured: Product | null }) {
  const save = featured ? savingsPercent(featured.priceCents, featured.msrpCents) : 0;
  return (
    <section className="relative isolate overflow-hidden text-glacier" aria-labelledby="hero-title">
      {/* sky */}
      <div
        className="absolute inset-0 -z-30"
        style={{ background: "linear-gradient(180deg,#0c1c18 0%,#16322b 38%,#3b4c3c 64%,#b8682a 86%,#e98a37 100%)" }}
        aria-hidden
      />
      <div className="topo-lines absolute inset-0 -z-20 opacity-70" aria-hidden />

      <div className="relative isolate flex min-h-[540px] flex-col justify-end sm:min-h-[min(86vh,860px)]">
        {/* Far layers: sun and two ridgelines, behind the headline. Full-bleed. */}
        <Parallax speed={0.06} className="pointer-events-none absolute inset-x-0 bottom-[22%] -z-10 flex justify-center">
          <div className="relative translate-x-[55%] translate-y-[18%] sm:translate-x-[30%] sm:translate-y-0" aria-hidden>
            <div className="absolute left-1/2 top-1/2 h-[clamp(26rem,52vw,48rem)] w-[clamp(26rem,52vw,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,150,60,.38) 0%, rgba(255,122,0,.12) 38%, rgba(255,122,0,0) 68%)" }} />
            <div className="h-[clamp(8rem,17vw,15rem)] w-[clamp(8rem,17vw,15rem)] rounded-full" style={{ background: "radial-gradient(circle at 50% 40%,#fff1d6 0%,#ffc27a 38%,#ff9a3d 70%,#ff8a1f 100%)", boxShadow: "0 0 80px 20px rgba(255,140,40,.35)" }} />
          </div>
        </Parallax>
        {ridges.slice(0, 2).map((d, i) => (
          <Parallax key={i} speed={0.12 - i * 0.04} className="pointer-events-none absolute inset-x-0 bottom-0 -z-10">
            <svg viewBox="0 0 1600 600" preserveAspectRatio="none" className="block h-[clamp(11rem,27vw,24rem)] w-full" aria-hidden>
              <path d={d} fill={ridgeFills[i]} />
            </svg>
          </Parallax>
        ))}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 mx-auto w-full max-w-7xl px-4 sm:px-6">
          {featured && (
            <Link
              href={`/p/${featured.slug}`}
              className="hero-tag group pointer-events-auto absolute right-6 top-16 hidden w-[280px] origin-top lg:block xl:w-[300px]"
              aria-label={`Featured: ${featured.title}, ${money(featured.priceCents)}`}
            >
              <svg className="absolute -top-14 left-1/2 h-16 w-10 -translate-x-1/2" viewBox="0 0 40 64" aria-hidden>
                <path d="M20 0 C 10 20, 32 34, 20 58" stroke="#eef3f4" strokeOpacity=".7" strokeWidth="1.6" fill="none" />
              </svg>
              <div className="tag-card overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]">
                <span className="tag-hole left-1/2 -translate-x-1/2" aria-hidden />
                <div className="relative aspect-square bg-ice">
                  {featured.images[0] && <GearImage src={featured.images[0].url} alt="" sizes="300px" priority />}
                  {save > 0 && (
                    <span className="display absolute right-3 top-3 z-[2] rotate-6 rounded-md bg-blaze px-2.5 py-1 text-2xl text-ink">
                      {save}% off
                    </span>
                  )}
                </div>
                <div className="p-4 text-ink">
                  <p className="text-sm text-granite">{featured.brand}</p>
                  <p className="line-clamp-2 font-semibold leading-snug">{featured.title}</p>
                  <p className="mt-2 flex items-baseline gap-2">
                    <span className="display text-4xl">{money(featured.priceCents)}</span>
                    {save > 0 && <s className="text-granite">{money(featured.msrpCents)}</s>}
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>

        <p className="relative mx-auto mt-16 w-full max-w-7xl px-4 text-lg sm:mt-24 text-glacier/80 sm:px-6 sm:text-xl lg:pr-[360px]">
          {inStock > 0 ? `${inStock.toLocaleString()} pieces in stock in Denver today.` : "Fresh stock lands every week."}
        </p>
        <h1
          id="hero-title"
          className="hero-rise display relative mx-auto mt-3 w-full max-w-7xl px-4 pb-[clamp(3.2rem,7.5vw,7rem)] text-[clamp(4.3rem,13vw,11rem)] sm:px-6 lg:pr-[340px] xl:pr-6"
          style={{ textShadow: "0 2px 30px rgba(0,0,0,.25)" }}
        >
          Gear with the
          <br />
          tags still on.
        </h1>

        {/* Near layers rise over the headline's baseline. */}
        <svg viewBox="0 0 1600 600" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 block h-[clamp(7rem,17vw,15rem)] w-full" aria-hidden>
          <path d={ridges[2]} fill={ridgeFills[2]} />
          <path d={ridges[3]} fill="#eef3f4" transform="translate(0 40)" />
        </svg>
      </div>

      <div className="relative z-10 bg-glacier text-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 md:flex-row md:items-end md:justify-between">
          <p className="max-w-2xl text-lg sm:text-xl">
            New-with-tags tents, jackets and replacement tent poles from {brandsLine}, priced below retail. Plus
            inspected pre-owned Patagonia. Shipped from Denver.
          </p>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/c/jackets" className="btn btn-spruce">Shop jackets</Link>
            <Link href="/c/tents" className="btn btn-blaze">Shop tents</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
