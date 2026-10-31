"use client";

import { useActionState, useState, useTransition } from "react";
import { changesJob, payJob, type JobState } from "./actions";

export function JobActions({ token, total }: { token: string; total: string }) {
  const [payState, setPayState] = useState<JobState>(null);
  const [paying, start] = useTransition();
  const [changeState, change, sending] = useActionState<JobState, FormData>(changesJob.bind(null, token), null);
  const [agree, setAgree] = useState(false);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-[var(--radius-tag)] bg-spruce p-6 text-glacier">
        <h2 className="display text-4xl">Approve & pay</h2>
        <label className="mt-3 flex gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          I checked the proof: spelling, colors and logo placement. It will be made exactly as shown.
        </label>
        <button
          type="button"
          className="btn btn-blaze mt-4 w-full"
          disabled={!agree || paying}
          onClick={() => start(async () => setPayState((await payJob(token)) ?? null))}
        >
          {paying ? "Opening checkout…" : `Approve and pay ${total}`}
        </button>
        {payState?.error && <p role="alert" className="mt-3 rounded bg-blaze/20 p-2 text-sm font-semibold">{payState.error}</p>}
      </div>
      <form action={change} className="rounded-[var(--radius-tag)] bg-card p-6">
        <h2 className="display text-4xl">Request changes</h2>
        <label className="label mt-3" htmlFor="message">What should we change?</label>
        <textarea id="message" name="message" rows={4} minLength={3} maxLength={2000} required className="field" placeholder="Make the logo bigger on the back wall and use white text on the valance." />
        <button className="btn btn-line mt-3" disabled={sending}>{sending ? "Sending…" : "Send changes"}</button>
        {changeState?.ok && <p role="status" className="mt-3 font-semibold text-accent">{changeState.ok}</p>}
        {changeState?.error && <p role="alert" className="mt-3 font-semibold text-blaze-deep">{changeState.error}</p>}
      </form>
    </div>
  );
}
