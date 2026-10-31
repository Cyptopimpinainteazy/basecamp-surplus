"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type Results = {
  products: { href: string; title: string; brand: string; priceCents: number; image: string | null; condition: string }[];
  models: { href: string; title: string }[];
  reads: { href: string; title: string; kind: string }[];
};

const money = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;

/**
 * Header search with results as you type. Still a plain GET form to /shop, so
 * Enter (or no JavaScript) runs the full search.
 */
export function LiveSearch() {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Results | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRes(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (r.ok) {
          setRes(await r.json());
          setActive(-1);
        }
      } catch {
        // aborted by the next keystroke, or offline: keep the last results
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const links = res ? [...res.products.map((p) => p.href), ...res.models.map((m) => m.href), ...res.reads.map((r) => r.href)] : [];
  const empty = res && links.length === 0;
  const show = open && q.trim().length >= 2 && (res || loading);

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!links.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % links.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? links.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      setOpen(false);
      router.push(links[active]);
    }
  }

  let i = -1;
  const optId = (n: number) => `${id}-o${n}`;
  const row = (n: number) =>
    `flex items-center gap-3 rounded-md px-3 py-2 ${n === active ? "bg-page" : "hover:bg-page"}`;

  return (
    <div ref={box} className="relative">
      <form action="/shop" role="search" onSubmit={() => setOpen(false)}>
        <label htmlFor={`${id}-q`} className="sr-only">Search gear</label>
        <input
          id={`${id}-q`}
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          autoComplete="off"
          role="combobox"
          aria-expanded={Boolean(show)}
          aria-controls={`${id}-list`}
          aria-activedescendant={active >= 0 ? optId(active) : undefined}
          placeholder="Search Nuptse, Stormbreak, size M…"
          className="h-10 w-52 rounded-md min-[1400px]:w-56 border-0 bg-spruce-2 px-3 text-glacier transition-[width,background-color] duration-300 placeholder:text-glacier/55 focus:w-64 focus:bg-card focus:text-fg focus:outline-none"
        />
      </form>
      {show && (
        <div
          id={`${id}-list`}
          role="listbox"
          className="absolute right-0 top-12 z-40 max-h-[70vh] w-[26rem] overflow-y-auto rounded-[var(--radius-tag)] bg-card p-2 text-fg shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)] ring-1 ring-line"
        >
          {loading && !res && <p className="px-3 py-3 text-sm text-muted">Searching…</p>}
          {empty && (
            <p className="px-3 py-3 text-sm text-muted">
              Nothing matches &ldquo;{q.trim()}&rdquo; yet. Try a tent model or brand, or press Enter to search everything.
            </p>
          )}
          {res && res.products.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">Gear</p>
              {res.products.map((p) => {
                const n = ++i;
                return (
                  <a key={p.href} id={optId(n)} role="option" aria-selected={n === active} href={p.href} className={row(n)} onClick={() => setOpen(false)}>
                    <span className="h-12 w-10 shrink-0 overflow-hidden rounded bg-line">
                      {/* eslint-disable-next-line @next/next/no-img-element -- tiny thumbnail, already optimized at upload */}
                      {p.image && <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.title}</span>
                      <span className="block text-xs text-muted">{p.brand}</span>
                    </span>
                    <span className="display text-xl">{money(p.priceCents)}</span>
                  </a>
                );
              })}
            </>
          )}
          {res && res.models.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">Poles &amp; parts</p>
              {res.models.map((m) => {
                const n = ++i;
                return (
                  <a key={m.href} id={optId(n)} role="option" aria-selected={n === active} href={m.href} className={row(n)} onClick={() => setOpen(false)}>
                    <span className="text-sm font-semibold">{m.title}</span>
                  </a>
                );
              })}
            </>
          )}
          {res && res.reads.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">Reviews &amp; comparisons</p>
              {res.reads.map((r) => {
                const n = ++i;
                return (
                  <a key={r.href} id={optId(n)} role="option" aria-selected={n === active} href={r.href} className={row(n)} onClick={() => setOpen(false)}>
                    <span className="rounded bg-lichen/60 px-1.5 py-0.5 text-[0.7rem] font-semibold text-accent">{r.kind}</span>
                    <span className="line-clamp-1 text-sm font-semibold">{r.title}</span>
                  </a>
                );
              })}
            </>
          )}
          {res && !empty && (
            <a href={`/shop?q=${encodeURIComponent(q.trim())}`} className="mt-1 block rounded-md px-3 py-2 text-sm font-semibold text-accent hover:bg-page">
              See all results for &ldquo;{q.trim()}&rdquo;
            </a>
          )}
        </div>
      )}
    </div>
  );
}
