import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeEbayCode } from "@/lib/channels/ebay";
import { isAdmin } from "@/lib/require-admin";

// Set this URL as the "auth accepted URL" on your eBay RuName.
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!(await isAdmin())) return NextResponse.redirect(new URL("/admin/login", req.url));
  const jar = await cookies();
  const expected = jar.get("ebay_oauth_state")?.value;
  jar.delete("ebay_oauth_state");
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) {
    return NextResponse.redirect(new URL("/admin/channels?ebay=denied", req.url));
  }
  try {
    await exchangeEbayCode(code);
    return NextResponse.redirect(new URL("/admin/channels?ebay=connected", req.url));
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : "failed");
    return NextResponse.redirect(new URL(`/admin/channels?ebay=error&msg=${msg}`, req.url));
  }
}
