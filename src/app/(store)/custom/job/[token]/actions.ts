"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { approveAndPay, requestChanges } from "@/lib/custom-jobs";

export type JobState = { ok?: string; error?: string } | null;

export async function payJob(token: string): Promise<JobState> {
  let url: string;
  try {
    url = await approveAndPay(token);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Checkout didn't start. Try again." };
  }
  redirect(url);
}

export async function changesJob(token: string, _: JobState, form: FormData): Promise<JobState> {
  try {
    await requestChanges(token, String(form.get("message") ?? ""));
    revalidatePath(`/custom/job/${token}`);
    return { ok: "Sent. We'll get a revised proof back to you." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't send that." };
  }
}
