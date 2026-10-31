"use server";

import { revalidatePath } from "next/cache";
import { supplierConfirm, supplierShip } from "@/lib/purchase-orders";

export type PoFormState = { ok?: string; error?: string } | null;

export async function confirmPo(token: string, _: PoFormState, form: FormData): Promise<PoFormState> {
  try {
    await supplierConfirm(token, String(form.get("note") ?? ""));
    revalidatePath(`/supplier/po/${token}`);
    return { ok: "Thanks, the order is confirmed." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't confirm the order." };
  }
}

export async function shipPo(token: string, _: PoFormState, form: FormData): Promise<PoFormState> {
  const carrier = String(form.get("carrier") ?? "").trim();
  const custom = String(form.get("carrierOther") ?? "").trim();
  const tracking = String(form.get("tracking") ?? "").replace(/\s+/g, "");
  const name = carrier === "Other" ? custom : carrier;
  if (!name) return { error: "Choose the carrier." };
  if (tracking.length < 6) return { error: "Enter the tracking number." };
  try {
    await supplierShip(token, name, tracking, String(form.get("note") ?? ""));
    revalidatePath(`/supplier/po/${token}`);
    return { ok: "Tracking saved. The customer has been emailed." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save tracking." };
  }
}
