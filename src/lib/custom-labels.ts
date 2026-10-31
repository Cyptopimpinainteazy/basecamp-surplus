import type { CustomJobKind, CustomJobStatus } from "./db/schema";

export const jobStatusLabel: Record<CustomJobStatus, string> = {
  requested: "Needs a quote",
  quoted: "Quote sent",
  checkout: "At checkout (unpaid)",
  paid: "Paid",
  in_production: "In production",
  shipped: "Shipped",
  declined: "Declined",
  cancelled: "Cancelled",
};

export const jobKindLabel: Record<CustomJobKind, string> = { canopy: "Logo canopy", poles: "Pole build", private_label: "Private label" };
