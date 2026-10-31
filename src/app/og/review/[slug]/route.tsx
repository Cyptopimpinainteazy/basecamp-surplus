import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ridges } from "@/components/ridge-paths";
import { site } from "@/lib/config";
import { getArticle } from "@/lib/articles";

// 1200×630 social card for a review: tent name, takeaway, and pole specs.
export const revalidate = 86400;

const fonts = Promise.all(
  ["display-800.woff", "body-400.woff", "body-600.woff"].map((f) => readFile(join(process.cwd(), "assets", "og", f))),
);

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a || a.status !== "published") return new Response("Not found", { status: 404 });
  const [display, body, bodySemi] = await fonts;

  const [head, ...rest] = a.title.split(/:\s+/);
  const name = head.replace(/\s+review$/i, "").replace(/\s+replacement poles$/i, "");
  const kicker = /review$/i.test(head) ? "Gear review" : "Replacement parts guide";
  const takeaway = rest.join(": ");
  const spec = (label: string) => a.specs.find((s) => s.label === label)?.value;
  const facts = [
    spec("Capacity"),
    spec("Season"),
    spec("Poles") ? `${spec("Poles")} poles` : undefined,
    spec("Pole diameter"),
  ].filter(Boolean) as string[];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#1f3a32", color: "#eef3f4", position: "relative", fontFamily: "Archivo" }}>
        <svg width="1200" height="260" viewBox="0 0 1600 600" preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: 0 }}>
          <path d={ridges[1]} fill="#2a4b41" transform="translate(0 -40)" />
          <path d={ridges[2]} fill="#13201c" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", padding: "64px 72px 0", flexGrow: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, fontWeight: 600 }}>
            <span style={{ display: "flex", background: "#ff7a00", color: "#13201c", padding: "6px 16px", borderRadius: 6 }}>{kicker}</span>
            <span style={{ color: "rgba(238,243,244,.75)" }}>{site.name}</span>
          </div>
          <div style={{ display: "flex", fontFamily: "Big Shoulders", fontSize: name.length > 26 ? 96 : 116, lineHeight: 0.92, marginTop: 34, maxWidth: 1050 }}>
            {name}
          </div>
          {takeaway && (
            <div style={{ display: "flex", fontSize: 34, lineHeight: 1.3, marginTop: 22, maxWidth: 980, color: "rgba(238,243,244,.88)" }}>
              {takeaway.charAt(0).toUpperCase() + takeaway.slice(1)}
            </div>
          )}
        </div>
        {facts.length > 0 && (
          <div style={{ display: "flex", gap: 14, padding: "0 72px 56px", fontSize: 26, fontWeight: 600, position: "relative" }}>
            {facts.map((f) => (
              <span key={f} style={{ display: "flex", background: "#eef3f4", color: "#13201c", padding: "8px 18px", borderRadius: 999 }}>{f}</span>
            ))}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Big Shoulders", data: display, weight: 800, style: "normal" },
        { name: "Archivo", data: body, weight: 400, style: "normal" },
        { name: "Archivo", data: bodySemi, weight: 600, style: "normal" },
      ],
    },
  );
}
