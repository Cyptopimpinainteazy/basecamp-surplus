"use client";

import Image from "next/image";
import { useState } from "react";

export function Gallery({ images, title }: { images: { url: string; alt: string }[]; title: string }) {
  const [i, setI] = useState(0);
  if (images.length === 0) return <div className="aspect-[4/5] rounded-[var(--radius-tag)] bg-ice" />;
  const cur = images[i];
  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {images.length > 1 && (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto md:max-h-[640px] md:flex-col md:overflow-y-auto" aria-label="Photos">
          {images.map((img, n) => (
            <li key={img.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setI(n)}
                aria-label={`Show photo ${n + 1}`}
                aria-current={n === i}
                className={`relative block h-20 w-16 overflow-hidden rounded-md bg-snow ring-2 ${n === i ? "ring-spruce" : "ring-transparent hover:ring-ice"}`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" unoptimized={img.url.endsWith(".svg")} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative aspect-[4/5] flex-1 overflow-hidden rounded-[var(--radius-tag)] bg-snow">
        <Image
          src={cur.url}
          alt={cur.alt || title}
          fill
          priority
          sizes="(min-width:1024px) 50vw, 100vw"
          className="object-cover"
          unoptimized={cur.url.endsWith(".svg")}
        />
      </div>
    </div>
  );
}
