import type { Metadata } from "next";
import Link from "next/link";
import { ClearCart } from "./clear-cart";

export const metadata: Metadata = { title: "Order placed", robots: { index: false } };

export default function SuccessPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <ClearCart />
      <h1 className="display text-6xl sm:text-7xl">Order placed.</h1>
      <p className="mt-4 text-lg">
        A confirmation with your order number is on its way to your inbox. We pack and ship from Denver within 1–2
        business days, and you&apos;ll get tracking by email as soon as the label prints.
      </p>
      <p className="mt-3 text-granite">Questions about your order? Open the Help chat with your order number and email.</p>
      <Link href="/shop" className="btn btn-spruce mt-8">Keep shopping</Link>
    </div>
  );
}
