import { brands, categories, conditions } from "@/lib/config";
import { IntakeForm } from "./intake-form";

export const metadata = { title: "Add item" };

export default function IntakePage() {
  return (
    <div>
      <h1 className="display mb-6 text-6xl">Add an item</h1>
      <IntakeForm
        brands={brands.map((b) => ({ slug: b.slug, name: b.name }))}
        categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
        conditions={conditions.map((c) => ({ value: c.value, label: c.label }))}
      />
    </div>
  );
}
