"use client";

import { useTransition } from "react";
import { setOrderStatus } from "../../actions";

export function OrderStatusButtons({ id, status, stripePi }: { id: string; status: string; stripePi: string | null }) {
  const [pending, start] = useTransition();
  const b = "btn btn-line min-h-10 px-3 text-sm";
  return (
    <section className="flex flex-wrap gap-2">
      {status === "needs_attention" && <button disabled={pending} onClick={() => start(() => setOrderStatus(id, "paid"))} className={b}>Stock reconciled, ready to ship</button>}
      {status === "label_created" && <button disabled={pending} onClick={() => start(() => setOrderStatus(id, "shipped"))} className={b}>Mark handed to carrier</button>}
      {(status === "label_created" || status === "shipped") && <button disabled={pending} onClick={() => start(() => setOrderStatus(id, "delivered"))} className={b}>Mark delivered</button>}
      {stripePi && (
        <a href={`https://dashboard.stripe.com/payments/${stripePi}`} target="_blank" rel="noreferrer" className={b}>Refund in Stripe</a>
      )}
      {status !== "refunded" && <button disabled={pending} onClick={() => start(() => setOrderStatus(id, "refunded"))} className={b}>Mark refunded</button>}
    </section>
  );
}
