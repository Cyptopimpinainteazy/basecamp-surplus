"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Scrollytelling: one tent pole goes from a loose barrel to a pitched tent to a
// shipping tube as the reader scrolls through four steps. The art is sticky; each
// step that reaches the middle of the screen sets the scene. Without JavaScript
// every step is still readable and the art shows the pitched tent.

const steps = [
  {
    kicker: "01 · The barrels",
    title: "A truckload of loose poles",
    body: "About a thousand factory pole sets, plus two barrels of loose DAC and Easton sections: straight, pre-bent and hub assemblies.",
  },
  {
    kicker: "02 · The tape",
    title: "Measured, never guessed",
    body: "Every pole is assembled and measured tip to tip. We count the sections and read the diameter printed on the tube.",
  },
  {
    kicker: "03 · The match",
    title: "Matched to your tent",
    body: "Search by tent model, by your own measurements, or snap a photo of the broken pole and we read it for you.",
    links: [
      { href: "/poles", label: "Find by tent" },
      { href: "/poles/size", label: "Find by size" },
      { href: "/poles/photo", label: "Match a photo" },
    ],
  },
  {
    kicker: "04 · The tube",
    title: "Shipped from Denver",
    body: "Packed in a rigid tube so nothing bends in transit, and on its way to your trailhead.",
  },
];

const SEG = 5;
const colors = ["#a7b2b8", "#c9a24a", "#a7b2b8", "#c9a24a", "#a7b2b8"];

/** Where each pole section sits in each scene: [x, y, rotation°]. */
function place(step: number, i: number): [number, number, number] {
  if (step === 0) {
    // Leaning out of the barrel at different angles.
    const xs = [150, 168, 186, 204, 222];
    const rs = [-24, -9, 4, 14, 28];
    return [xs[i], 236 - (i % 2) * 14, rs[i] + 90];
  }
  if (step === 1) {
    // Laid end to end above the tape.
    return [80 + 55 + i * 108, 214, 0];
  }
  if (step === 2) {
    // Bent into the tent's arch.
    const deg = 180 - (i + 0.5) * 36;
    const a = (deg * Math.PI) / 180;
    return [300 + 174 * Math.cos(a), 340 - 174 * Math.sin(a), 90 - deg];
  }
  // Folded into a bundle inside the tube, which slides right.
  return [410 + (i - 2) * 3, 214 + (i - 2) * 5, 0];
}

export function PoleStory() {
  const [step, setStep] = useState(2);
  const [js, setJs] = useState(false);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    setJs(true);
    setStep(0);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-62% 0px -36% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="story topo-lines bg-spruce text-glacier" data-js={js ? "" : undefined} aria-labelledby="story-h">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <h2 id="story-h" className="display scroll-stretch text-5xl sm:text-7xl">
          From the barrel <span className="text-blaze">to your tent</span>
        </h2>
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 sm:px-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-12">
        <div className="sticky top-[6.5rem] z-20 -mx-4 h-[34vh] bg-spruce px-4 shadow-[0_18px_24px_-18px_rgba(0,0,0,.6)] md:top-24 md:z-0 md:mx-0 md:h-[72vh] md:bg-transparent md:px-0 md:shadow-none">
          <svg viewBox="0 0 600 400" className="story-art h-full w-full" role="img" aria-label={steps[step].title}>
            {/* barrel */}
            <g style={{ opacity: step === 0 ? 1 : 0, transform: `translateY(${step === 0 ? 0 : 30}px)` }}>
              <rect x="120" y="250" width="130" height="120" rx="10" fill="#2a4b41" stroke="#6ff0b4" strokeOpacity=".35" />
              <ellipse cx="185" cy="250" rx="65" ry="14" fill="#1b3129" stroke="#6ff0b4" strokeOpacity=".35" />
              <path d="M120 290h130M120 330h130" stroke="#6ff0b4" strokeOpacity=".25" />
            </g>

            {/* tape measure */}
            <g style={{ opacity: step === 1 ? 1 : 0 }}>
              <rect x="80" y="236" width="540" height="22" fill="#ffcf3f" rx="3" style={{ transform: `scaleX(${step === 1 ? 1 : 0})`, transformOrigin: "80px 0" }} />
              {Array.from({ length: 28 }, (_, k) => (
                <path key={k} d={`M${84 + k * 19.4} 236v${k % 5 === 0 ? 12 : 6}`} stroke="#13201c" strokeWidth="1.5" />
              ))}
              <text x="350" y="300" textAnchor="middle" fill="currentColor" fontSize="34" fontWeight="800" style={{ fontFamily: "var(--font-display)" }}>
                141 in · 5 sections · 9 mm
              </text>
            </g>

            {/* tent fabric */}
            <path
              d="M128 340 A172 172 0 0 1 472 340 Z"
              fill="#ff7a00"
              fillOpacity=".16"
              stroke="#ff7a00"
              strokeWidth="2"
              strokeDasharray="1200"
              style={{ strokeDashoffset: step === 2 ? 0 : 1200, opacity: step === 2 ? 1 : 0 }}
            />
            <path d="M40 342h520" stroke="currentColor" strokeOpacity={step === 2 ? 0.5 : 0} strokeWidth="2" />

            {/* shipping tube */}
            <g style={{ opacity: step === 3 ? 1 : 0, transform: `translateX(${step === 3 ? 0 : -60}px)` }}>
              <rect x="190" y="190" width="380" height="50" rx="25" fill="#c9a77a" />
              <rect x="190" y="190" width="380" height="50" rx="25" fill="none" stroke="#13201c" strokeOpacity=".3" />
              <rect x="300" y="198" width="120" height="34" rx="4" fill="#eef3f4" />
              <text x="360" y="221" textAnchor="middle" fill="#13201c" fontSize="15" fontWeight="700">DENVER → YOU</text>
            </g>

            {/* the pole sections */}
            {Array.from({ length: SEG }, (_, i) => {
              const [x, y, r] = place(step, i);
              return (
                <g key={i} style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg)`, opacity: step === 3 ? 0 : 1 }}>
                  <rect x="-54" y="-5" width="108" height="10" rx="5" fill={colors[i]} />
                  <rect x="44" y="-6" width="10" height="12" rx="2" fill="#5b6670" />
                </g>
              );
            })}
          </svg>
        </div>

        <ol className="relative z-10 md:py-[18vh]">
          {steps.map((s, i) => (
            <li
              key={s.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-i={i}
              data-active={step === i ? "" : undefined}
              className="story-step flex min-h-[64vh] flex-col justify-center py-8 md:min-h-[62vh]"
            >
              <div className="glass-light rounded-[var(--radius-tag)] p-6">
                <p className="text-sm font-semibold tracking-wide text-blaze">{s.kicker}</p>
                <h3 className="display mt-2 text-4xl sm:text-5xl">{s.title}</h3>
                <p className="mt-3 text-lg text-glacier/85">{s.body}</p>
                {s.links && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {s.links.map((l) => (
                      <Link key={l.href} href={l.href} className="btn btn-blaze min-h-10 px-4 text-sm">
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
