import Link from "next/link";

/** Tab bar shared by the pole finder and the pole size chart. */
export function PolesTabs({ active }: { active: "finder" | "sizes" }) {
  const tab = (on: boolean) =>
    `rounded-t-md px-4 py-2.5 font-semibold ${on ? "bg-glacier text-ink" : "text-glacier/80 hover:bg-spruce-2 hover:text-glacier"}`;
  return (
    <nav aria-label="Tent poles" className="flex gap-1">
      <Link href="/poles" className={tab(active === "finder")} aria-current={active === "finder" ? "page" : undefined}>
        Find by tent
      </Link>
      <Link href="/poles/sizes" className={tab(active === "sizes")} aria-current={active === "sizes" ? "page" : undefined}>
        Pole sizes
      </Link>
    </nav>
  );
}
