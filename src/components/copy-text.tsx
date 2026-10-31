"use client";

import { useState } from "react";

/** Selectable text with a copy button (mailto/tel links are unreliable in some browsers and apps). */
export function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <span className="select-all font-semibold">{text}</span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          } catch {
            /* clipboard unavailable: text is still selectable */
          }
        }}
        className="rounded-md border-[1.5px] border-line px-2.5 py-0.5 text-sm hover:border-accent"
      >
        {done ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
