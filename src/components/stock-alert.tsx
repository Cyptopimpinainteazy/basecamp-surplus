"use client";

import { useId, useState } from "react";
import type { AlertCriteria } from "@/lib/db/schema";

/** "Email me when it's listed" box. One email per alert, then the alert closes. */
export function StockAlert({ criteria, heading, tone = "light" }: { criteria: AlertCriteria; heading: string; tone?: "light" | "dark" }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<{ ok?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setState(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, criteria, website: trap || undefined }),
      });
      const data = await res.json();
      setState(res.ok ? { ok: data.ok } : { error: data.error });
    } catch {
      setState({ error: "Couldn't set the alert. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const dark = tone === "dark";
  return (
    <form onSubmit={submit} className={`rounded-[var(--radius-tag)] p-5 ${dark ? "bg-spruce text-glacier" : "bg-card"}`}>
      <p className="font-semibold">{heading}</p>
      <p className={`mt-1 text-sm ${dark ? "text-glacier/75" : "text-muted"}`}>
        We&apos;re still listing about a thousand pole sets plus flies, footprints and stakes. Leave your email and we&apos;ll send one
        message when it&apos;s listed.
      </p>
      {state?.ok ? (
        <p className="mt-3 font-semibold" role="status">{state.ok}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor={`${id}-e`} className="sr-only">Email</label>
          <input id={`${id}-e`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="field h-12 flex-1 text-fg" autoComplete="email" />
          {/* Honeypot: hidden from people, filled by bots. */}
          <input type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} className="hidden" aria-hidden />
          <button disabled={busy} className="btn btn-blaze h-12">{busy ? "Saving…" : "Email me when it's listed"}</button>
        </div>
      )}
      {state?.error && <p className="mt-2 text-sm" role="alert">{state.error}</p>}
    </form>
  );
}
