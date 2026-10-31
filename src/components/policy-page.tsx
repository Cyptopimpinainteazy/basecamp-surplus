import { site } from "@/lib/config";

/** Shared layout for policy and company pages: one readable column. */
export function PolicyPage({ title, intro, updated, children }: { title: string; intro?: string; updated?: boolean; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <h1 className="display text-6xl sm:text-7xl">{title}</h1>
      {intro && <p className="mt-4 text-lg text-granite">{intro}</p>}
      {updated && (
        <p className="mt-3 text-sm text-granite">
          Last updated {new Date(`${site.policiesUpdated}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      )}
      <div className="prose-review mt-8">{children}</div>
    </div>
  );
}

export function BusinessIdentity() {
  return (
    <>
      {site.legalName || site.name}
      {site.businessAddress ? `, ${site.businessAddress}` : `, ${site.city}, Colorado`}
    </>
  );
}
