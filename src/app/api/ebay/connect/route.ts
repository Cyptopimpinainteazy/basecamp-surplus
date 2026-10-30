import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ebayConfigured, ebayConsentUrl } from "@/lib/channels/ebay";
import { isAdmin } from "@/lib/require-admin";

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.redirect(new URL("/admin/login", req.url));
  if (!ebayConfigured()) return NextResponse.redirect(new URL("/admin/channels?ebay=missing-keys", req.url));
  const state = crypto.randomUUID();
  (await cookies()).set("ebay_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return NextResponse.redirect(ebayConsentUrl(state));
}
