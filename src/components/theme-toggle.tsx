"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function current(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Sun/moon switch. The choice is remembered; with no choice the site follows the system setting. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(current());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme(current());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function flip() {
    const next: Theme = current() === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode or blocked storage: the switch still works for this visit.
    }
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(apply);
    else apply();
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={flip}
      className="press grid h-10 w-10 place-items-center rounded-md text-glacier/85 hover:bg-spruce-2 hover:text-glacier"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="theme-icon" data-dark={dark ? "" : undefined}>
        {/* Sun rays fold away into the moon's crescent. */}
        <circle cx="12" cy="12" r="5" className="theme-core" />
        <g className="theme-rays">
          <path d="M12 1.5v2.2M12 20.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M1.5 12h2.2M20.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
        </g>
        <circle cx="17" cy="8" r="5" className="theme-bite" fill="var(--color-spruce)" stroke="none" />
      </svg>
    </button>
  );
}
