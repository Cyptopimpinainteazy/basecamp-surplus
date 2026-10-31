"use client";

import { useState, useTransition } from "react";
import type { PurchaseOrder } from "@/lib/db/schema";
import { cancelPo, createAndSendPos, markPoSentManually, resendPo, type ActionState } from "../../dropship-actions";

const money = (c: number | null) => (c == null ? "cost not set" : `$${(c / 100).toFixed(2)}`);
const statusText: Record<string, string> = {
  pending: "Not emailed yet",
  sent: "Emailed, awaiting confirmation",
  confirmed: "Confirmed by supplier",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

export function SupplierPanel({
  orderId,
  pos,
  supplierNames,
  links,
  needsPo,
}: {
  orderId: string;
  pos: PurchaseOrder[];
  supplierNames: Record<string, string>;
  links: Record<string, string>;
  needsPo: boolean;
}) {
  const [msg, setMsg] = useState<ActionState>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<ActionState | void>) =>
    start(async () => {
      setMsg((await fn()) ?? { ok: "Done." });
    });
  return (
    <section className="rounded-[var(--radius-tag)] bg-card p-5">
      <h2 className="display text-3xl">Supplier orders</h2>
      {pos.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{needsPo ? "No purchase orders yet." : "Everything in this order ships from your shelf or your Denver shop."}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {pos.map((po) => (
            <li key={po.id} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{po.number} · {supplierNames[po.supplierId] ?? "Supplier"}</p>
                <span className="text-sm">{statusText[po.status] ?? po.status}</span>
              </div>
              <p className="text-sm text-muted">{po.items.map((i) => `${i.quantity} × ${i.title}`).join(", ")} · {money(po.costCents)}</p>
              {po.trackingNumber && (
                <p className="text-sm">
                  {po.carrier} <a href={po.trackingUrl ?? "#"} target="_blank" rel="noopener" className="font-mono underline">{po.trackingNumber}</a>
                </p>
              )}
              {po.supplierNote && <p className="mt-1 text-sm italic">“{po.supplierNote}”</p>}
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <a href={links[po.id]} target="_blank" rel="noopener" className="underline">Supplier page</a>
                {po.status !== "cancelled" && po.status !== "shipped" && (
                  <button type="button" disabled={busy} className="underline" onClick={() => run(() => resendPo(po.id))}>
                    {po.status === "pending" ? "Email it" : "Resend email"}
                  </button>
                )}
                {po.status === "pending" && (
                  <button type="button" disabled={busy} className="underline" onClick={() => run(() => markPoSentManually(po.id))}>
                    I sent it another way
                  </button>
                )}
                {po.status !== "cancelled" && po.status !== "shipped" && (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-blaze-deep underline"
                    onClick={() => {
                      if (confirm(`Cancel ${po.number}? Tell the supplier too.`)) run(() => cancelPo(po.id));
                    }}
                  >
                    Cancel PO
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {needsPo && (
        <button type="button" disabled={busy} className="btn btn-spruce mt-4" onClick={() => run(() => createAndSendPos(orderId))}>
          {busy ? "Working…" : "Create & email missing POs"}
        </button>
      )}
      {msg?.ok && <p role="status" className="mt-3 text-sm font-semibold text-accent">{msg.ok}</p>}
      {msg?.error && <p role="alert" className="mt-3 text-sm font-semibold text-blaze-deep">{msg.error}</p>}
    </section>
  );
}
