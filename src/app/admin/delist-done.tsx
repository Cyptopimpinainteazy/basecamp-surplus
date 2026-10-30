"use client";

import { useTransition } from "react";
import type { Channel } from "@/lib/db/schema";
import { clearNeedsDelist } from "./actions";

export function DelistDone({ productId, channel }: { productId: string; channel: Channel }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => clearNeedsDelist(productId, channel))} className="btn btn-line min-h-10 px-4 text-sm">
      {pending ? "Saving…" : "Removed"}
    </button>
  );
}
