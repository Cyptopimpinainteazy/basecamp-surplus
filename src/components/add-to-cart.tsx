"use client";

import { useEffect, useState } from "react";
import { useCart, type CartLine } from "./cart";

export function AddToCart({ line, disabled, disabledLabel }: { line: Omit<CartLine, "qty">; disabled?: boolean; disabledLabel?: string }) {
  const { add, lines } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = lines.find((l) => l.id === line.id);
  const atMax = inCart && inCart.qty >= line.max;

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 1600);
    return () => clearTimeout(t);
  }, [justAdded]);

  return (
    <button
      type="button"
      disabled={disabled || (Boolean(atMax) && !justAdded)}
      onClick={() => {
        if (justAdded || atMax) return;
        add(line);
        setJustAdded(true);
      }}
      className={`btn w-full text-lg sm:w-auto sm:min-w-64 ${justAdded ? "btn-spruce" : "btn-blaze"}`}
      aria-live="polite"
    >
      {justAdded ? (
        <>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="check-draw" aria-hidden>
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
          Added to cart
        </>
      ) : disabled ? (
        disabledLabel ?? "Sold out"
      ) : atMax ? (
        "In your cart"
      ) : (
        "Add to cart"
      )}
    </button>
  );
}
