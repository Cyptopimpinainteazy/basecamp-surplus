import Link from "next/link";
import { categories, site } from "@/lib/config";
import { ridges } from "./ridge-paths";

export function SiteFooter() {
  return (
    <footer className="mt-28 text-glacier/80">
      <svg viewBox="0 0 1600 600" preserveAspectRatio="none" className="-mb-px block h-[clamp(4rem,9vw,8rem)] w-full" aria-hidden>
        <path d={ridges[1]} fill="#2a4b41" transform="translate(0 -60)" />
        <path d={ridges[2]} fill="#13201c" />
      </svg>
      <div className="bg-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1.6fr]">
        <div>
          <p className="display text-4xl text-glacier">{site.name}</p>
          <p className="mt-3 max-w-md">{site.tagline} We&apos;re an independent reseller and aren&apos;t affiliated with the brands we carry.</p>
        </div>
        <div>
          <p className="mb-3 font-semibold text-glacier">Shop</p>
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={c.slug === "poles" ? "/poles" : c.slug === "parts" ? "/c/parts" : `/c/${c.slug}`} className="hover:text-glacier hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="mb-3 font-semibold text-glacier">Help</p>
            <ul className="space-y-2">
              <li><Link href="/contact" className="hover:text-glacier hover:underline">Contact us</Link></li>
              <li><Link href="/help#shipping" className="hover:text-glacier hover:underline">Shipping</Link></li>
              <li><Link href="/returns" className="hover:text-glacier hover:underline">Returns</Link></li>
              <li><Link href="/collections/north-face-replacement-poles" className="hover:text-glacier hover:underline">North Face replacement poles</Link></li>
              <li><Link href="/collections/dac-tent-poles" className="hover:text-glacier hover:underline">DAC tent poles</Link></li>
              <li><Link href="/collections/easton-tent-poles" className="hover:text-glacier hover:underline">Easton tent poles</Link></li>
              <li><Link href="/poles/size" className="hover:text-glacier hover:underline">Find a pole by size</Link></li>
              <li><Link href="/poles/photo" className="hover:text-glacier hover:underline">Match a pole from a photo</Link></li>
              <li><Link href="/reviews" className="hover:text-glacier hover:underline">Gear reviews</Link></li>
              <li><Link href="/compare" className="hover:text-glacier hover:underline">Compare tents</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold text-glacier">Company</p>
            <ul className="space-y-2">
              <li><Link href="/about" className="hover:text-glacier hover:underline">About</Link></li>
              <li><Link href="/wholesale" className="hover:text-glacier hover:underline">Wholesale</Link></li>
              <li><Link href="/privacy" className="hover:text-glacier hover:underline">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-glacier hover:underline">Terms of sale</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <p className="mx-auto max-w-7xl px-4 pb-8 text-sm text-glacier/50 sm:px-6">
        © {new Date().getFullYear()} {site.name}, Denver, Colorado. Brand names belong to their owners.
      </p>
      </div>
    </footer>
  );
}
