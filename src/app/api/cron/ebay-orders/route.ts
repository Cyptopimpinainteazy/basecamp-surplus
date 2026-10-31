import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ebayConfigured, ebayConnected } from "@/lib/channels/ebay";
import { runOrderTasks } from "@/lib/order-tasks";
import { importEbayOrders } from "@/lib/orders";

export const maxDuration = 60;

// Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}` || !process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  await runOrderTasks();
  if (!ebayConfigured() || !(await ebayConnected())) return NextResponse.json({ skipped: "eBay not connected" });
  const r = await importEbayOrders();
  if (r.imported) revalidatePath("/", "layout");
  return NextResponse.json(r);
}
