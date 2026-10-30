"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./cart";

const fmt = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative inline-flex h-11 items-center gap-2 rounded-md px-3 font-semibold text-glacier hover:bg-spruce-2"
      aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-blaze px-1.5 text-sm font-bold text-ink">
          {count}
        </span>
      )}
    </button>
  );
}

export function CartDrawer({ freeThresholdCents }: { freeThresholdCents: number }) {
  const { lines, open, setOpen, setQty, remove, subtotalCents } = useCart();
  const [shipping, setShipping] = useState<"standard" | "expedited">("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines.map((l) => ({ id: l.id, qty: l.qty })), shipping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout couldn't start.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout couldn't start.");
      setBusy(false);
    }
  }

  const remaining = freeThresholdCents - subtotalCents;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-ink/50 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={() => setOpen(false)}
      />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-glacier shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between bg-spruce px-5 py-4 text-glacier">
          <h2 className="display text-3xl">Your cart</h2>
          <button onClick={() => setOpen(false)} className="h-10 rounded-md px-3 hover:bg-spruce-2" aria-label="Close cart">
            Close
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-start gap-4 p-6">
            <p className="text-lg">Your cart is empty.</p>
            <Link href="/shop" onClick={() => setOpen(false)} className="btn btn-spruce">
              Browse the gear
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ice overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={l.id} className="flex gap-4 py-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-snow">
                    {l.image && <Image src={l.image} alt="" fill sizes="80px" className="object-cover" unoptimized={l.image.endsWith(".svg")} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/p/${l.slug}`} onClick={() => setOpen(false)} className="line-clamp-2 font-semibold hover:underline">
                      {l.title}
                    </Link>
                    <p className="mt-1 font-semibold">{fmt(l.priceCents)}</p>
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      {l.max > 1 ? (
                        <label className="flex items-center gap-2">
                          Qty
                          <select className="field h-9 min-h-0 w-16 py-0" value={l.qty} onChange={(e) => setQty(l.id, Number(e.target.value))}>
                            {Array.from({ length: Math.min(l.max, 10) }, (_, i) => i + 1).map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <span className="text-granite">Last one</span>
                      )}
                      <button onClick={() => remove(l.id)} className="text-granite underline hover:text-ink">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-ice bg-snow p-5">
              <p className="mb-3 text-sm text-granite">
                {remaining > 0 ? `Add ${fmt(remaining)} more for free standard shipping.` : "Free standard shipping unlocked."}
              </p>
              <fieldset className="mb-4 grid grid-cols-2 gap-2 text-sm">
                <legend className="label">Shipping</legend>
                {(["standard", "expedited"] as const).map((s) => (
                  <label
                    key={s}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border-[1.5px] px-3 py-2 ${shipping === s ? "border-spruce bg-glacier" : "border-ice"}`}
                  >
                    <input type="radio" name="ship" value={s} checked={shipping === s} onChange={() => setShipping(s)} />
                    {s === "standard" ? "Standard, 3–6 days" : "Expedited, 1–3 days"}
                  </label>
                ))}
              </fieldset>
              <div className="mb-4 flex items-baseline justify-between">
                <span>Subtotal</span>
                <span className="display text-3xl">{fmt(subtotalCents)}</span>
              </div>
              {error && <p className="mb-3 rounded-md bg-blaze/15 p-3 text-sm">{error}</p>}
              <button onClick={checkout} disabled={busy} className="btn btn-blaze w-full text-lg">
                {busy ? "Opening secure checkout…" : "Check out"}
              </button>
              <p className="mt-2 text-center text-xs text-granite">Shipping and tax are calculated at checkout.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
