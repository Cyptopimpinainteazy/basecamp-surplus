import Link from "next/link";

/** Tab bar shared by the pole finder and the pole size chart. */
export function PolesTabs({ active }: { active: "finder" | "size" | "photo" | "sizes" }) {
  const tab = (on: boolean) =>
    `shrink-0 rounded-t-md px-4 py-2.5 font-semibold ${on ? "bg-page text-fg" : "text-glacier/80 hover:bg-spruce-2 hover:text-glacier"}`;
  return (
    <nav aria-label="Tent poles" className="no-scrollbar flex gap-1 overflow-x-auto">
      <Link href="/poles" className={tab(active === "finder")} aria-current={active === "finder" ? "page" : undefined}>
        Find by tent
      </Link>
      <Link href="/poles/size" className={tab(active === "size")} aria-current={active === "size" ? "page" : undefined}>
        Find by size
      </Link>
      <Link href="/poles/photo" className={tab(active === "photo")} aria-current={active === "photo" ? "page" : undefined}>
        Match from a photo
      </Link>
      <Link href="/poles/sizes" className={tab(active === "sizes")} aria-current={active === "sizes" ? "page" : undefined}>
        Pole sizes
      </Link>
    </nav>
  );
}
