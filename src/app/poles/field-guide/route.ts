import { poleFieldGuideHtml } from "@/content/pole-field-guide";
import { site } from "@/lib/config";

export const dynamic = "force-static";
export function GET() {
  const canonical = `${site.url}/poles/field-guide`;
  const html = poleFieldGuideHtml.replaceAll("__FIELD_GUIDE_CANONICAL__", canonical.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"));
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
