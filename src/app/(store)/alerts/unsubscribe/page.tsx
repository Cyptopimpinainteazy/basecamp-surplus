import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeAlert } from "@/lib/alerts";

export const metadata: Metadata = { title: "Alert cancelled", robots: { index: false } };

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const row = token ? await unsubscribeAlert(token) : null;
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <h1 className="display text-6xl">{row ? "Alert cancelled" : "Nothing to cancel"}</h1>
      <p className="mt-4 text-lg">
        {row ? `You won't get an email about “${row.label}”.` : "This alert was already cancelled, already sent, or the link is incomplete."}
      </p>
      <Link href="/poles" className="btn btn-spruce mt-8">Back to poles & parts</Link>
    </div>
  );
}
