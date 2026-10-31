"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { mountPoleExplorer, type PoleScene } from "../../public/editorial/pole-explorer.js";

export function PoleWorkbench() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<PoleScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [explode, setExplode] = useState(0);
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    const node = host.current; if (!node) return;
    let cancelled = false, started = false;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || started) return;
      started = true; observer.disconnect();
      import("three").then(three => {
        if (cancelled) return;
        scene.current = mountPoleExplorer(node, three, () => { scene.current?.dispose(); scene.current = null; setReady(false); setFailed(true); });
        setReady(true);
      }).catch(() => { if (!cancelled) setFailed(true); });
    }, {rootMargin: "150px"});
    observer.observe(node);
    return () => { cancelled = true; observer.disconnect(); scene.current?.dispose(); scene.current = null; };
  }, []);
  return <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6" aria-labelledby="workbench-title">
    <div className="overflow-hidden rounded-[var(--radius-tag)] bg-spruce text-glacier">
      <div className="grid gap-6 p-6 sm:p-9 lg:grid-cols-[.8fr_1.2fr]">
        <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blaze">The interactive gear bench</p><h2 id="workbench-title" className="display mt-4 text-5xl sm:text-6xl">Get to know<br/>your next fix.</h2><p className="mt-5 max-w-md text-glacier/75">Drag the assembly to rotate it. Pull the sections apart and see how tube sections, connector inserts, end tips and shock cord relate.</p><p className="mt-4 text-sm text-glacier/65">Generic educational model. Not to scale, not a product viewer and not proof that any pole fits your tent.</p><Link href="/poles/size" className="btn btn-blaze mt-6">Put your measurements to work ↗</Link></div>
        <div><div className="relative h-64 overflow-hidden rounded-md bg-ink sm:h-80"><div ref={host} className="absolute inset-0"/>{!ready && <Image src="/editorial/pole-workbench.webp" alt="Generic pole category scene, AI-generated" fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover"/>}<p role="status" className="absolute bottom-3 left-3 rounded bg-ink/80 px-3 py-1 text-xs">{failed ? "3D unavailable — use the measurement finder instead." : ready ? "Drag horizontally to rotate · generic pole assembly" : "Loading the gear bench…"}</p></div>
          <div className="mt-4"><label htmlFor="pole-explode" className="text-sm font-semibold">Assembled <span className="float-right">Exploded view</span></label><input id="pole-explode" type="range" min="0" max="100" value={explode} disabled={!ready} onChange={e=>{setExplode(Number(e.target.value));scene.current?.setExplode(Number(e.target.value)/100);}} className="mt-3 w-full accent-orange-500"/></div>
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!ready} className="btn btn-line min-h-10 px-3 text-sm" onClick={()=>scene.current?.rotate(-.3)} aria-label="Rotate pole left">← Rotate</button><button type="button" disabled={!ready} className="btn btn-line min-h-10 px-3 text-sm" onClick={()=>scene.current?.rotate(.3)} aria-label="Rotate pole right">Rotate →</button><button type="button" disabled={!ready} className="btn btn-line min-h-10 px-3 text-sm" aria-pressed={auto} onClick={()=>{setAuto(!auto);scene.current?.setAuto(!auto);}}>{auto?"Pause turntable":"Turntable"}</button><button type="button" disabled={!ready} className="btn btn-line min-h-10 px-3 text-sm" onClick={()=>{setExplode(0);setAuto(false);scene.current?.setAuto(false);scene.current?.setExplode(0);scene.current?.reset();}}>Reset</button></div>
        </div>
      </div>
    </div>
  </section>;
}
