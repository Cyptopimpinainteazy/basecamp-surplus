import Link from "next/link";
import { money } from "@/lib/format";
import { listOrders, syncEbayIfStale } from "@/lib/orders";
import { ebayConfigured } from "@/lib/channels/ebay";
import { SyncEbay } from "./sync-ebay";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

const tabs = [
  { v: "", label: "All" },
  { v: "paid", label: "To ship" },
  { v: "needs_attention", label: "Needs attention" },
  { v: "label_created", label: "Label printed" },
  { v: "shipped", label: "Shipped" },
  { v: "delivered", label: "Delivered" },
  { v: "refunded", label: "Refunded" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  await syncEbayIfStale();
  const rows = await listOrders(tabs.some((t) => t.v === status) ? status || undefined : undefined);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-6xl">Orders</h1>
        {ebayConfigured() && <SyncEbay />}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link key={t.v} href={t.v ? `/admin/orders?status=${t.v}` : "/admin/orders"} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${(status ?? "") === t.v ? "bg-spruce text-glacier" : "bg-card"}`}>
            {t.label}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-tag)] bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="p-3 font-medium">Order</th>
              <th className="p-3 font-medium">Placed</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Items</th>
              <th className="p-3 font-medium">Total</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-page">
                <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold underline">{o.number}</Link> <span className="text-muted">{o.source}</span></td>
                <td className="p-3">{o.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                <td className="p-3">{o.customerName || o.email}</td>
                <td className="p-3 max-w-xs truncate">{o.items.map((i) => i.title).join(", ")}</td>
                <td className="p-3">{money(o.totalCents)}</td>
                <td className={`p-3 capitalize ${o.status === "needs_attention" ? "font-semibold text-blaze-deep" : ""}`}>{o.status.replace("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-muted">No orders here.</p>}
      </div>
    </div>
  );
}
