"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

export function PoleFinder({ models, compact }: { models: { model: string; count: number }[]; compact?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const listId = useId();
  const go = (m: string) => {
    const v = m.trim();
    if (v) router.push(`/poles?model=${encodeURIComponent(v)}`);
  };
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="flex flex-col gap-2 sm:flex-row"
        role="search"
      >
        <label htmlFor={`${listId}-in`} className="sr-only">Tent model</label>
        <input
          id={`${listId}-in`}
          list={listId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your tent, e.g. Stormbreak 2"
          className="field h-14 flex-1 text-lg"
          autoComplete="off"
        />
        <datalist id={listId}>
          {models.map((m) => (
            <option key={m.model} value={m.model} />
          ))}
        </datalist>
        <button className="btn btn-blaze h-14 text-lg">Find my pole</button>
      </form>
      {!compact && models.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {models.slice(0, 10).map((m) => (
            <button
              key={m.model}
              type="button"
              onClick={() => go(m.model)}
              className="rounded-full border-[1.5px] border-current/30 px-3 py-1 text-sm hover:border-current"
            >
              {m.model}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
