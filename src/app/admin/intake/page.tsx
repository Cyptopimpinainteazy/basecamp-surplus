import Link from "next/link";
import { brands, categories, conditions } from "@/lib/config";
import { IntakeForm } from "./intake-form";
import { PoleSetForm } from "./pole-set-form";

export const metadata = { title: "Add item" };

export default async function IntakePage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const poles = mode === "poles";
  const tab = (on: boolean) => `rounded-full px-4 py-2 font-semibold ${on ? "bg-spruce text-glacier" : "bg-card hover:bg-line"}`;
  return (
    <div>
      <h1 className="display mb-4 text-6xl">{poles ? "Add a pole set" : "Add an item"}</h1>
      <nav aria-label="Intake mode" className="mb-6 flex gap-2">
        <Link href="/admin/intake" className={tab(!poles)} aria-current={!poles ? "page" : undefined}>One item</Link>
        <Link href="/admin/intake?mode=poles" className={tab(poles)} aria-current={poles ? "page" : undefined}>Pole set (one tent model)</Link>
      </nav>
      {poles ? (
        <PoleSetForm />
      ) : (
        <IntakeForm
          brands={brands.map((b) => ({ slug: b.slug, name: b.name }))}
          categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
          conditions={conditions.map((c) => ({ value: c.value, label: c.label }))}
        />
      )}
    </div>
  );
}
