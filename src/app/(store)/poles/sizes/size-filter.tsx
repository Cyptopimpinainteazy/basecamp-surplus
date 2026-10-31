"use client";

import { useEffect, useState } from "react";

/** Filters the server-rendered chart sections by tent name, without hiding them from search engines. */
export function SizeFilter({ count }: { count: number }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(count);
  useEffect(() => {
    const needle = q.trim().toLowerCase();
    let n = 0;
    document.querySelectorAll<HTMLElement>("[data-tent]").forEach((el) => {
      const match = !needle || (el.dataset.tent ?? "").toLowerCase().includes(needle);
      el.hidden = !match;
      if (match) n++;
    });
    setShown(n);
  }, [q]);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor="tent-filter" className="sr-only">Filter by tent</label>
      <input
        id="tent-filter"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter by tent, e.g. Stormbreak"
        className="field h-12 sm:max-w-sm"
        autoComplete="off"
      />
      <p className="text-sm text-granite" aria-live="polite">
        {shown} of {count} tents
      </p>
    </div>
  );
}
