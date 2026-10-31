import Link from "next/link";
import { site } from "@/lib/config";
import { CartButton } from "./cart-drawer";
import { LiveSearch } from "./live-search";
import { ThemeToggle } from "./theme-toggle";

const nav = [
  { href: "/c/tents", label: "Tents" },
  { href: "/c/jackets", label: "Jackets" },
  { href: "/poles", label: "Poles & parts" },
  { href: "/shop?condition=used", label: "Pre-owned" },
  { href: "/poles/field-guide", label: "Pole guide" },
  { href: "/reviews", label: "Reviews" },
  { href: "/shop", label: "All gear" },
];

export function SiteHeader() {
  return (
    <header className="glass sticky top-0 z-30 text-glacier">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.name} home`}>
          <svg width="34" height="26" viewBox="0 0 34 26" aria-hidden>
            <path d="M1 25 L12 6 L17 13 L22 4 L33 25 Z" fill="#eef3f4" />
            <path d="M22 4 L25.5 10.5 L22 9 L19.2 9.6 Z" fill="#ff7a00" />
          </svg>
          <span className="display whitespace-nowrap text-[1.7rem] tracking-[0.01em]">{site.name}</span>
        </Link>
        <nav aria-label="Main" className="ml-4 hidden items-center gap-0.5 lg:flex xl:ml-6">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="navlink whitespace-nowrap rounded-md px-2.5 py-2 font-medium xl:px-3 text-glacier/85 hover:text-glacier">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden md:block">
          <LiveSearch />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <ThemeToggle />
          <CartButton />
        </div>
      </div>
      <nav aria-label="Categories" className="no-scrollbar flex gap-1 overflow-x-auto border-t border-glacier/10 px-3 py-1.5 lg:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-glacier/85 hover:bg-spruce-2">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
