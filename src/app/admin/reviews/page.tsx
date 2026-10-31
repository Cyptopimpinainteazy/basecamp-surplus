import { desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews" };

export default async function ReviewsAdmin() {
  const rows = await db.select().from(articles).orderBy(desc(articles.updatedAt));
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-6xl">Reviews</h1>
        <Link href="/admin/reviews/new" className="btn btn-blaze">Write a review</Link>
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-tag)] bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="p-3 font-medium">Review</th>
              <th className="p-3 font-medium">Matches stock</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((a) => (
              <tr key={a.id} className="hover:bg-page">
                <td className="p-3"><Link href={`/admin/reviews/${a.id}`} className="font-semibold hover:underline">{a.title}</Link></td>
                <td className="p-3">{a.stockQuery}</td>
                <td className="p-3 capitalize">{a.status}</td>
                <td className="p-3">{a.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-muted">No reviews yet. Write the first one.</p>}
      </div>
    </div>
  );
}
