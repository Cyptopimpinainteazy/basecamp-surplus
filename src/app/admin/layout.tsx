import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/config";
import { isAdmin } from "@/lib/require-admin";
import { logout } from "./actions";

export const metadata: Metadata = { title: { default: "Admin", template: `%s | ${site.name} admin` }, robots: { index: false } };

const nav = [
  { href: "/admin", label: "Today" },
  { href: "/admin/intake", label: "Add item" },
  { href: "/admin/products", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/channels", label: "Channels" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAdmin();
  return (
    <div className="min-h-dvh bg-glacier">
      {authed && (
        <header className="sticky top-0 z-30 bg-ink text-glacier">
          <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2">
            <Link href="/" className="display mr-3 shrink-0 text-2xl">{site.name}</Link>
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-glacier/85 hover:bg-spruce">
                {n.label}
              </Link>
            ))}
            <form action={logout} className="ml-auto shrink-0">
              <button className="rounded-md px-3 py-2 text-sm text-glacier/70 hover:bg-spruce">Sign out</button>
            </form>
          </div>
        </header>
      )}
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
