import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { createOrderFromCheckout } from "@/lib/orders";
import { stripe } from "@/lib/stripe";

export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("STRIPE_WEBHOOK_SECRET not set", { status: 500 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch (e) {
    return new Response(`Bad signature: ${e instanceof Error ? e.message : ""}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      await createOrderFromCheckout(session);
      revalidatePath("/", "layout");
    }
  }
  return new Response("ok");
}
