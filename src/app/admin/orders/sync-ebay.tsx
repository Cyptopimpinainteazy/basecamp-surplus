"use client";

import { useState, useTransition } from "react";
import { syncEbayOrdersNow } from "../actions";

export function SyncEbay() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  return (
    <div className="text-right">
      <button disabled={pending} onClick={() => start(async () => setMsg(await syncEbayOrdersNow()))} className="btn btn-line">
        {pending ? "Checking eBay…" : "Pull eBay orders now"}
      </button>
      {msg && <p className={`mt-1 text-sm ${msg.error ? "text-blaze-deep" : "text-granite"}`}>{msg.error ?? msg.ok}</p>}
    </div>
  );
}
