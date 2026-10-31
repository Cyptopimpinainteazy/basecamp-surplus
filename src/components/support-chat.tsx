"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
const KEY = "bc_support_v1";

const starters = ["Where's my order?", "Do you have a pole for my tent?", "How do returns work?"];

// Turns bare URLs in assistant replies into links.
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} className="break-all font-semibold underline">
            {p.replace(/^https?:\/\/(www\.)?/, "")}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function SupportChat({ storeName }: { storeName: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setMsgs(s.msgs ?? []);
        setConversationId(s.conversationId);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ msgs, conversationId }));
    } catch {
      /* ignore */
    }
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, conversationId]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setMsgs((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The assistant couldn't answer.");
      setConversationId(data.conversationId);
      setMsgs((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assistant couldn't answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="support-panel"
        className="fixed bottom-4 right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-spruce px-5 font-semibold text-glacier shadow-lg shadow-ink/25 hover:bg-spruce-2"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 5h16v11H9l-5 4V5Z" />
        </svg>
        {open ? "Close help" : "Help"}
      </button>

      {open && (
        <section
          id="support-panel"
          aria-label="Customer support chat"
          className="fixed bottom-20 right-4 z-40 flex h-[min(560px,calc(100dvh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl bg-card shadow-2xl shadow-ink/30"
        >
          <header className="bg-spruce px-4 py-3 text-glacier">
            <p className="display text-2xl">{storeName} help</p>
            <p className="text-sm text-glacier/75">Answers about gear, orders, shipping and returns. A person follows up on anything it can't resolve.</p>
          </header>
          <div ref={list} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {msgs.length === 0 && (
              <div className="space-y-2">
                <p className="text-muted">What can we help with?</p>
                {starters.map((s) => (
                  <button key={s} onClick={() => send(s)} className="block w-full rounded-lg border-[1.5px] border-line px-3 py-2 text-left hover:border-accent">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[88%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[0.95rem] ${m.role === "user" ? "ml-auto bg-spruce text-glacier" : "bg-page"}`}
              >
                {m.role === "assistant" ? <Linkified text={m.content} /> : m.content}
              </div>
            ))}
            {busy && <p className="text-sm text-muted">Checking…</p>}
            {error && <p className="rounded-md bg-blaze/15 p-2 text-sm">{error}</p>}
          </div>
          <form
            className="flex gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <label htmlFor="support-input" className="sr-only">Message</label>
            <textarea
              id="support-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Type your question"
              className="field min-h-11 flex-1 resize-none"
              maxLength={2000}
            />
            <button type="submit" disabled={busy || !input.trim()} className="btn btn-blaze px-4">
              Send
            </button>
          </form>
        </section>
      )}
    </>
  );
}
