import { desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { supportConversations, supportTickets } from "@/lib/db/schema";
import { TicketCard } from "./ticket-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support" };

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const showChats = view === "chats";
  const [tickets, chats] = await Promise.all([
    db.select().from(supportTickets).orderBy(supportTickets.status, desc(supportTickets.createdAt)).limit(200),
    showChats ? db.select().from(supportConversations).orderBy(desc(supportConversations.updatedAt)).limit(60) : Promise.resolve([]),
  ]);
  const convById = new Map<string, (typeof supportConversations.$inferSelect)>();
  if (!showChats) {
    const ids = tickets.map((t) => t.conversationId).filter(Boolean) as string[];
    if (ids.length) {
      const convs = await db.select().from(supportConversations).where(inArray(supportConversations.id, ids));
      for (const c of convs) convById.set(c.id, c);
    }
  }
  return (
    <div>
      <h1 className="display text-6xl">Support</h1>
      <div className="my-4 flex gap-2">
        <Link href="/admin/support" className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${!showChats ? "bg-spruce text-glacier" : "bg-snow"}`}>Tickets</Link>
        <Link href="/admin/support?view=chats" className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${showChats ? "bg-spruce text-glacier" : "bg-snow"}`}>All chats</Link>
      </div>
      {!showChats && (
        <div className="space-y-4">
          {tickets.length === 0 && <p className="text-granite">No tickets yet. The assistant opens one whenever a customer needs you.</p>}
          {tickets.map((t) => (
            <TicketCard key={t.id} t={t} transcript={t.conversationId ? (convById.get(t.conversationId)?.messages ?? []) : []} />
          ))}
        </div>
      )}
      {showChats && (
        <ul className="space-y-4">
          {chats.map((c) => (
            <li key={c.id} className="rounded-[var(--radius-tag)] bg-snow p-4">
              <p className="text-sm text-granite">{c.updatedAt.toLocaleString("en-US")} {c.email && `· ${c.email}`}</p>
              <div className="mt-2 space-y-2">
                {c.messages.map((m, i) => (
                  <p key={i} className={`whitespace-pre-wrap text-sm ${m.role === "user" ? "font-semibold" : "text-granite"}`}>
                    {m.role === "user" ? "Customer: " : "Assistant: "}{m.content}
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
