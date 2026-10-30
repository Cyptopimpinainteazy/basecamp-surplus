import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const POLES_DOMAIN = process.env.POLES_DOMAIN ?? "replacementtentpole.com";
const MIRROR_DOMAINS = (process.env.REDIRECT_DOMAINS ?? "highcountrysurplus.com")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);
const PRIMARY = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://basecampsurplus.com").replace(/\/$/, "");

export async function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").replace(/^www\./, "").split(":")[0];
  const { pathname, search } = req.nextUrl;

  // Secondary brand domains 301 to the primary store (keeps link equity in one place).
  if (MIRROR_DOMAINS.includes(host)) {
    return NextResponse.redirect(`${PRIMARY}${pathname}${search}`, 301);
  }

  // The pole domain is its own landing page; everything else lives on the primary domain.
  if (host === POLES_DOMAIN) {
    if (pathname === "/" || pathname === "/poles") return NextResponse.rewrite(new URL(`/poles${search}`, req.url));
    if (/^\/(sitemap\.xml|robots\.txt|_next|favicon|topo\.svg)/.test(pathname)) return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.next();
    return NextResponse.redirect(`${PRIMARY}${pathname}${search}`, 301);
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value).catch(() => false);
    if (!ok) return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|seed/).*)"],
};
