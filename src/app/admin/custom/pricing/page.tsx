import Link from "next/link";
import { getPricing } from "@/lib/custom-jobs";
import { PricingForm } from "./pricing-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Builder pricing" };

export default async function Pricing() {
  return (
    <div className="space-y-6">
      <p className="text-sm"><Link href="/admin/custom" className="underline">Custom jobs</Link></p>
      <h1 className="display text-5xl">Builder pricing</h1>
      <p className="max-w-2xl text-muted">
        These start from rough market estimates. Replace them with your own: get printer quotes for each size and set your
        shop rates for poles before taking orders.
      </p>
      <PricingForm p={await getPricing()} />
    </div>
  );
}
