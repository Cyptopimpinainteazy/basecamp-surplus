"use client";

import { useActionState, useTransition } from "react";
import type { ChatMessage, SupportTicket } from "@/lib/db/schema";
import { replyToTicket, setTicketStatus } from "../actions";

export function TicketCard({ t, transcript }: { t: SupportTicket; transcript: ChatMessage[] }) {
  const [state, action, pending] = useActionState(replyToTicket, null);
  const [busy, start] = useTransition();
  return (
    <article className={`rounded-[var(--radius-tag)] bg-card p-5 ${t.status === "open" ? "border-l-4 border-blaze" : ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{t.topic}</h2>
        <span className="text-sm capitalize text-muted">{t.status} · {new Date(t.createdAt).toLocaleString("en-US")}</span>
      </div>
      <p className="text-sm">{t.name ? `${t.name} · ` : ""}<a href={`mailto:${t.email}`} className="underline">{t.email}</a>{t.orderNumber ? ` · ${t.orderNumber}` : ""}</p>
      <p className="mt-3 whitespace-pre-wrap">{t.summary}</p>
      {transcript.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted">Chat transcript ({transcript.length} messages)</summary>
          <div className="mt-2 space-y-1.5">
            {transcript.map((m, i) => (
              <p key={i} className={`whitespace-pre-wrap ${m.role === "user" ? "font-semibold" : "text-muted"}`}>{m.role === "user" ? "Customer: " : "Assistant: "}{m.content}</p>
            ))}
          </div>
        </details>
      )}
      {t.reply && <p className="mt-3 whitespace-pre-wrap rounded-md bg-page p-3 text-sm"><span className="font-semibold">You replied:</span> {t.reply}</p>}
      {t.status !== "closed" ? (
        <form action={action} className="mt-4 space-y-2">
          <input type="hidden" name="id" value={t.id} />
          <label htmlFor={`r-${t.id}`} className="label">Reply by email</label>
          <textarea id={`r-${t.id}`} name="reply" rows={4} className="field" />
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={pending} className="btn btn-spruce min-h-10 px-4">{pending ? "Sending…" : "Send reply"}</button>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="close" /> Close ticket after sending</label>
            <button type="button" disabled={busy} onClick={() => start(() => setTicketStatus(t.id, "closed"))} className="text-sm text-muted underline">Close without reply</button>
            {state && <span className={`text-sm ${state.error ? "text-blaze-deep" : "text-accent"}`}>{state.error ?? state.ok}</span>}
          </div>
        </form>
      ) : (
        <button type="button" disabled={busy} onClick={() => start(() => setTicketStatus(t.id, "open"))} className="mt-3 text-sm underline">Reopen</button>
      )}
    </article>
  );
}
