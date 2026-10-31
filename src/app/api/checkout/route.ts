import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { checkoutBody, orderableProblem } from "@/lib/checkout-rules";
import { poleSaleLabel } from "@/lib/pole-sale";
import { getPackagePreset, shippingPolicy, site } from "@/lib/config";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { shipNote } from "@/lib/fulfillment";

export async function POST(req: Request) {
  const parsed = checkoutBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Your cart couldn't be read. Refresh and try again." }, { status: 400 });
  const { items, shipping } = parsed.data;

  const rows = await db.select().from(products).where(inArray(products.id, items.map((i) => i.id)));
  const problems: string[] = [];
  const lines = items.flatMap((i) => {
    const p = rows.find((r) => r.id === i.id);
    if (!p || p.status !== "active" || p.quantity < 1) {
      problems.push(`${p?.title ?? "An item"} just sold. Remove it from your cart to continue.`);
      return [];
    }
    const problem = orderableProblem(p);
    if (problem) { problems.push(`${p.title}: ${problem}`); return []; }
    if (p.quantity < i.qty) {
      problems.push(`Only ${p.quantity} left of ${p.title}. Lower the quantity to continue.`);
      return [];
    }
    return [{ p, qty: i.qty }];
  });
  if (problems.length) return NextResponse.json({ error: problems.join(" ") }, { status: 409 });

  const subtotal = lines.reduce((s, l) => s + l.p.priceCents * l.qty, 0);
  const bulky = lines.some((l) => shippingPolicy.bulkyCategories.includes(l.p.category));
  const freeStandard = subtotal >= shippingPolicy.freeThresholdCents;
  const standard = freeStandard ? 0 : bulky ? shippingPolicy.standardCents.bulky : shippingPolicy.standardCents.light;
  const expedited = bulky ? shippingPolicy.expeditedCents.bulky : shippingPolicy.expeditedCents.light;
  // Largest package preset in the cart drives the default box for the label.
  const pkg = lines
    .map((l) => getPackagePreset(l.p.packagePreset))
    .sort((a, b) => b.length * b.width * b.height - a.length * a.width * a.height)[0];

  const rate = (name: string, amount: number, min: number, max: number) => ({
    shipping_rate_data: {
      type: "fixed_amount" as const,
      display_name: name,
      fixed_amount: { amount, currency: "usd" },
      delivery_estimate: { minimum: { unit: "business_day" as const, value: min }, maximum: { unit: "business_day" as const, value: max } },
    },
  });
  const options =
    shipping === "expedited"
      ? [rate("Expedited", expedited, 2, 4), rate(freeStandard ? "Standard (free)" : "Standard", standard, 4, 8)]
      : [rate(freeStandard ? "Standard (free)" : "Standard", standard, 4, 8), rate("Expedited", expedited, 2, 4)];

  let session;
  try {
    session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: lines.map(({ p, qty }) => ({
      quantity: qty,
      price_data: {
        currency: "usd",
        unit_amount: p.priceCents,
        product_data: {
          name: p.title,
          description: [p.category === "poles" ? poleSaleLabel(p.poleSpec) : null, shipNote(p)].filter(Boolean).join(" · ") || undefined,
          images: p.images.slice(0, 1).map((i) => i.url).filter((u) => u.startsWith("https://")),
          metadata: {
            sku: p.sku,
            product_id: p.id,
            ...(p.category === "poles" ? { sale_unit: poleSaleLabel(p.poleSpec)! } : {}),
            ...(p.fulfillment !== "stock" ? { fulfillment: p.fulfillment } : {}),
          },
        },
        tax_behavior: "exclusive",
      },
    })),
    shipping_address_collection: { allowed_countries: ["US"] },
    shipping_options: options,
    phone_number_collection: { enabled: true },
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    allow_promotion_codes: true,
    metadata: {
      schema_version: "2",
      shipping_method: shipping,
      package: pkg.id,
    },
    success_url: `${site.url}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site.url}/shop`,
    });
  } catch (e) {
    console.error("[checkout]", e);
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Try again in a minute, or use the Help chat." }, { status: 503 });
  }
  return NextResponse.json({ url: session.url });
}
