import { allActiveProducts } from "@/lib/products";
import { productFeedXml } from "@/lib/channels/feed";
import { buildSafe } from "@/lib/build-safe";

// Google Merchant Center / Meta Commerce Manager / Pinterest catalog feed.
export const revalidate = 900;

export async function GET() {
  const xml = productFeedXml(await buildSafe(allActiveProducts, []));
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=900" },
  });
}
