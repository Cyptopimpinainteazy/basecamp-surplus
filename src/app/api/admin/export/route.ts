import { eq } from "drizzle-orm";
import { crosslistCsv } from "@/lib/channels/crosslist";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { isAdmin } from "@/lib/require-admin";

// Crosslister import CSV (Vendoo / List Perfectly / Crosslist).
export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const rows = await db.select().from(products).where(eq(products.status, "active"));
  const date = new Date().toISOString().slice(0, 10);
  return new Response(crosslistCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="crosslist-${date}.csv"`,
    },
  });
}
