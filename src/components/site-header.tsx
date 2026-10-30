import Link from "next/link";
import { site } from "@/lib/config";
import { CartButton } from "./cart-drawer";

const nav = [
  { href: "/c/tents", label: "Tents" },
  { href: "/c/jackets", label: "Jackets" },
  { href: "/poles", label: "Tent poles" },
  { href: "/shop?condition=used", label: "Pre-owned" },
  { href: "/reviews", label: "Reviews" },
  { href: "/shop", label: "All gear" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-spruce text-glacier">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.name} home`}>
          <svg width="34" height="26" viewBox="0 0 34 26" aria-hidden>
            <path d="M1 25 L12 6 L17 13 L22 4 L33 25 Z" fill="#eef3f4" />
            <path d="M22 4 L25.5 10.5 L22 9 L19.2 9.6 Z" fill="#ff7a00" />
          </svg>
          <span className="display text-[1.7rem] tracking-[0.01em]">{site.name}</span>
        </Link>
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 font-medium text-glacier/85 hover:bg-spruce-2 hover:text-glacier">
              {n.label}
            </Link>
          ))}
        </nav>
        <form action="/shop" className="ml-auto hidden md:block" role="search">
          <label htmlFor="q" className="sr-only">Search gear</label>
          <input
            id="q"
            name="q"
            placeholder="Search Nuptse, Stormbreak, size M…"
            className="h-10 w-72 rounded-md border-0 bg-spruce-2 px-3 text-glacier placeholder:text-glacier/55 focus:bg-snow focus:text-ink focus:outline-none"
          />
        </form>
        <div className="ml-auto md:ml-2">
          <CartButton />
        </div>
      </div>
      <nav aria-label="Categories" className="no-scrollbar flex gap-1 overflow-x-auto border-t border-spruce-2 px-3 py-1.5 lg:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-glacier/85 hover:bg-spruce-2">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
