import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { poleGuide, poleGuides } from "@/lib/pole-guides";
import { confidenceLabel } from "@/lib/tent-reference";
import { polesForExactModel } from "@/lib/products";
import { reviewForProduct } from "@/lib/articles";
import { buildSafe } from "@/lib/build-safe";
import { site } from "@/lib/config";
import { ProductGrid } from "@/components/product-card";
import { JsonLd } from "@/components/json-ld";
export const revalidate=300;
type Props={params:Promise<{slug:string}>};
export function generateStaticParams(){return poleGuides.map(t=>({slug:t.slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const t=poleGuide((await params).slug);if(!t)return {};
  const title=`${t.model} replacement poles & size guide`;
  const description=`Compare ${t.model} pole reference details, ${t.poleSystem || "pole systems"}, recorded diameters and replacement stock. Check generation, length and fittings.`.slice(0,160);
  return {title,description,alternates:{canonical:`/poles/tents/${t.slug}`},openGraph:{title,description,url:`/poles/tents/${t.slug}`}};
}
export default async function TentPoleGuide({params}:Props){
  const t=poleGuide((await params).slug);if(!t)notFound();
  const [parts,review]=await buildSafe(()=>Promise.all([polesForExactModel(t.model),reviewForProduct(t.model)]),[[],null] as const);
  const path=`/poles/tents/${t.slug}`;
  const rows=[["Pole system",t.poleSystem || "Not recorded"],["Pole count",t.poleCount===null?"Not confirmed in reference":String(t.poleCount)],["Reported tube diameter",t.diametersMm.length?`${t.diametersMm.join(" / ")} mm`:"Not recorded"],["Hub layout",t.hub?"Hub system reported — verify layout":"Check original pole geometry"],["Assembled length","Not published in this reference — measure original stock"],["Evidence level",confidenceLabel[t.confidence]]];
  return <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
    <JsonLd data={[{"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:site.url},{"@type":"ListItem",position:2,name:"Replacement tent poles",item:`${site.url}/poles`},{"@type":"ListItem",position:3,name:t.model,item:site.url+path}]},{"@context":"https://schema.org","@type":"WebPage",name:`${t.model} replacement pole guide`,url:site.url+path,citation:t.source.url,about:{"@type":"Thing",name:t.model}}]}/>
    <nav aria-label="Breadcrumb" className="text-sm text-granite"><Link href="/poles" className="underline">Replacement tent poles</Link> / {t.model}</nav>
    <section className="mt-7 grid gap-8 rounded-[var(--radius-tag)] bg-spruce p-6 text-glacier sm:p-10 lg:grid-cols-[1.3fr_1fr]">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-glacier/70">Tent model field guide</p><h1 className="display mt-4 text-5xl sm:text-6xl">{t.model}<br/><span className="text-blaze">Replacement poles.</span></h1><p className="mt-6 max-w-2xl text-glacier/80">Start with the frame your tent actually uses. Compare the sourced reference below with your original poles, then check the dimensions and fittings of any listed replacement.</p><div className="mt-6 flex flex-wrap gap-3"><a href="#stock" className="btn btn-blaze">Check listed parts ↓</a><Link href="/poles/size" className="btn btn-line">Search by measurements</Link></div></div>
      <div className="rounded-md bg-glacier p-5 text-ink"><h2 className="display text-3xl">Reference, not a fit guarantee.</h2><dl className="mt-4 divide-y divide-ice">{rows.map(([label,value])=><div key={label} className="py-3"><dt className="text-xs font-semibold uppercase tracking-wide text-granite">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>)}</dl></div>
    </section>
    <section className="mt-12 grid gap-8 lg:grid-cols-2"><div><h2 className="display text-4xl">What the reference says</h2><p className="mt-4 text-granite">{t.notes}</p><p className="mt-4 text-sm">Source: <a href={t.source.url} rel="noopener noreferrer" target="_blank" className="underline">{t.source.title} ↗</a> · {confidenceLabel[t.confidence]}</p><p className="mt-3 text-sm text-granite">Historical specifications can vary by generation. This source entry does not establish the identity, condition or dimensions of the poles in your hands.</p>{review&&<Link href={`/reviews/${review.slug}`} className="mt-5 inline-block font-semibold underline">Read the {t.model} gear review →</Link>}</div><div><h2 className="display text-4xl">Before buying a replacement</h2><ol className="mt-4 list-decimal space-y-3 pl-5 text-granite"><li>Confirm the exact model, capacity and generation/year from the tent label.</li><li>Measure assembled length and tube outside diameter, and count sections.</li><li>Compare tips, ferrules, hub connections and any factory bends.</li><li>Confirm whether the listing is one section, one pole or a complete set.</li></ol></div></section>
    <section id="stock" className="mt-14 scroll-mt-32"><h2 className="display text-4xl">Listed parts for {t.model}</h2><p className="mb-6 mt-3 text-granite">Only active stock with this exact model recorded in its fitment list appears here. Review the listing and verify generation and fittings before purchase.</p>{parts.length?<ProductGrid items={parts}/>:<div className="rounded-[var(--radius-tag)] bg-snow p-6"><p className="font-semibold">No active parts are linked to this exact model right now.</p><p className="mt-2 text-granite">This guide remains a reference, not a stock promise. Search by measurements or contact support with your model and pole details.</p><Link href="/help" className="btn btn-spruce mt-4">Ask about a replacement</Link></div>}</section>
    <section className="mt-14"><h2 className="display text-4xl">More North Face pole guides</h2><ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{poleGuides.filter(g=>g.slug!==t.slug).map(g=><li key={g.slug}><Link href={`/poles/tents/${g.slug}`} className="text-sm underline underline-offset-4">{g.model}</Link></li>)}</ul></section>
  </div>;
}
