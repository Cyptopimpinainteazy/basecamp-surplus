"use client";

import { useCart, type CartLine } from "./cart";

export function AddToCart({ line, disabled }: { line: Omit<CartLine, "qty">; disabled?: boolean }) {
  const { add, lines } = useCart();
  const inCart = lines.find((l) => l.id === line.id);
  const atMax = inCart && inCart.qty >= line.max;
  return (
    <button
      type="button"
      disabled={disabled || Boolean(atMax)}
      onClick={() => add(line)}
      className="btn btn-blaze w-full text-lg sm:w-auto sm:min-w-64"
    >
      {disabled ? "Sold out" : atMax ? "In your cart" : "Add to cart"}
    </button>
  );
}
