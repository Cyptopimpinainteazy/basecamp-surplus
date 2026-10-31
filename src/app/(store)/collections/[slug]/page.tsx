import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Catalog } from "@/components/catalog";
import { JsonLd } from "@/components/json-ld";
import { seoCollection, seoCollections } from "@/lib/seo-collections";
import { catalogSeo, type SearchParams } from "@/lib/seo";
import { site } from "@/lib/config";
export const revalidate = 300;
type Props = {params:Promise<{slug:string}>;searchParams:Promise<SearchParams>};
export function generateStaticParams(){return seoCollections.map(c=>({slug:c.slug}));}
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata>{
  const c=seoCollection((await params).slug);if(!c)return {};
  const seo=catalogSeo(`/collections/${c.slug}`,await searchParams);
  return {title:c.title+(seo.page>1?` — Page ${seo.page}`:""),description:c.description,alternates:{canonical:seo.canonical},robots:seo.noindex?{index:false,follow:true}:undefined,openGraph:{title:c.title,description:c.description,url:seo.canonical}};
}
export default async function CollectionPage({params,searchParams}:Props){
  const c=seoCollection((await params).slug);if(!c)notFound();
  const path=`/collections/${c.slug}`;
  return <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
    <JsonLd data={{"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:site.url},{"@type":"ListItem",position:2,name:c.title,item:site.url+path}]}} />
    <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted"><Link href="/" className="underline">Home</Link> / {c.title}</nav>
    <p className="text-xs font-semibold uppercase tracking-widest text-muted">The replacement gear room</p><h1 className="display mt-3 text-6xl sm:text-7xl">{c.title}</h1><p className="mt-5 max-w-3xl text-lg text-muted">{c.intro}</p>
    <div className="my-7 flex flex-wrap gap-3"><Link href="/poles" className="btn btn-spruce">Find by tent model</Link><Link href="/poles/size" className="btn btn-blaze">Compare pole measurements</Link></div>
    <Catalog path={path} sp={await searchParams} base={c.query}/>
    <section className="mt-16 grid gap-8 rounded-[var(--radius-tag)] bg-card p-6 md:grid-cols-2">{c.sections.map(s=><div key={s.title}><h2 className="display text-4xl">{s.title}</h2><p className="mt-4 text-muted">{s.body}</p></div>)}</section>
    <p className="mt-7"><Link href={c.link.href} className="font-semibold underline">{c.link.label} →</Link></p><p className="mt-5 text-sm text-muted">Independent reseller. Brand names identify the products; no manufacturer affiliation is implied. Availability, condition and measurements are shown in individual listings.</p>
  </div>;
}
