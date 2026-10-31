"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WriteReviewForm({ initialSubject }: { initialSubject: string }) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review writing failed.");
      router.push(`/admin/reviews/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review writing failed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-[var(--radius-tag)] bg-card p-5">
      <div>
        <label htmlFor="subject" className="label">Brand and model</label>
        <input id="subject" required minLength={3} value={subject} onChange={(e) => setSubject(e.target.value)} className="field" placeholder="The North Face Stormbreak 2" />
      </div>
      <div>
        <label htmlFor="notes" className="label">Your own notes (optional)</label>
        <textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="field" placeholder="Anything you've seen first-hand: how it packs, quality of this batch, what customers ask about" />
        <p className="mt-1 text-xs text-muted">Only your notes are written as first-hand experience. Everything else is attributed to its source.</p>
      </div>
      {error && <p className="rounded-md bg-blaze/15 p-3 text-sm">{error}</p>}
      <button disabled={busy} className="btn btn-blaze w-full text-lg">
        {busy ? "Researching and writing, about 1–3 minutes…" : "Research and write the review"}
      </button>
    </form>
  );
}
