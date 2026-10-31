import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { customJobs, type CustomJobStatus } from "@/lib/db/schema";
import { money } from "@/lib/format";
import { deleteAbandonedCheckouts } from "../dropship-actions";
import { jobKindLabel as kindLabel, jobStatusLabel as statusLabel } from "@/lib/custom-labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Custom jobs" };

const tabs: { id: string; label: string; statuses: CustomJobStatus[] }[] = [
  { id: "todo", label: "Needs you", statuses: ["requested", "paid"] },
  { id: "waiting", label: "Waiting on customer", statuses: ["quoted"] },
  { id: "production", label: "In production", statuses: ["in_production"] },
  { id: "done", label: "Shipped", statuses: ["shipped"] },
  { id: "closed", label: "Declined / cancelled", statuses: ["declined", "cancelled", "checkout"] },
];

export default async function CustomJobs({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "todo" } = await searchParams;
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const jobs = await db.select().from(customJobs).where(inArray(customJobs.status, current.statuses)).orderBy(desc(customJobs.createdAt)).limit(200);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl">Custom jobs</h1>
          <p className="mt-2 max-w-2xl text-muted">Logo canopy requests, custom-cut pole builds and private-label inquiries.</p>
        </div>
        <Link href="/admin/custom/pricing" className="btn btn-line">Builder pricing</Link>
      </div>
      <nav className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link key={t.id} href={`/admin/custom?tab=${t.id}`} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${t.id === current.id ? "bg-spruce text-glacier" : "bg-card"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      {jobs.length === 0 ? (
        <p className="mt-8 text-muted">Nothing here.</p>
      ) : (
        <table className="mt-6 w-full overflow-hidden rounded-[var(--radius-tag)] bg-card text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr><th className="p-3">Job</th><th className="p-3">Type</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3 text-right">Price</th><th className="p-3">Received</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-page">
                <td className="p-3"><Link href={`/admin/custom/${j.id}`} className="font-mono font-semibold underline">{j.number}</Link></td>
                <td className="p-3">{kindLabel[j.kind]}</td>
                <td className="p-3">{j.company || j.name || j.email}</td>
                <td className="p-3">{statusLabel[j.status]}</td>
                <td className="p-3 text-right">{money(j.priceCents ?? j.estimateCents)}{!j.priceCents && j.estimateCents ? " est." : ""}</td>
                <td className="p-3 text-muted">{j.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {current.id === "closed" && (
        <form action={deleteAbandonedCheckouts} className="mt-4">
          <button className="text-sm underline">Cancel pole-build checkouts abandoned for 2+ days</button>
        </form>
      )}
    </div>
  );
}
