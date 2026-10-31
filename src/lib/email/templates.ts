import { site } from "../config";
import type { Address, CustomJob, Order, PurchaseOrder, Supplier } from "../db/schema";
import { money } from "../format";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#eef3f4;font-family:Arial,Helvetica,sans-serif;color:#13201c">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f4;padding:24px 12px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:6px;overflow:hidden">
<tr><td style="background:#1f3a32;padding:20px 28px;color:#eef3f4;font-size:20px;font-weight:bold;letter-spacing:.5px">${esc(site.name)}</td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:22px;margin:0 0 16px">${esc(title)}</h1>
${body}
<p style="margin:28px 0 0;font-size:13px;color:#5b6670">Questions? Reply to this email or chat with us at <a href="${site.url}" style="color:#1f3a32">${new URL(site.url).hostname}</a>.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function itemsTable(order: Order) {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e3e8ea">${esc(i.title)}${i.saleUnitLabel ? `<br><small>${esc(i.saleUnitLabel)}</small>` : ""}${i.quantity > 1 ? ` × ${i.quantity}` : ""}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e3e8ea">${money(i.unitCents * i.quantity)}</td></tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}
<tr><td style="padding:8px 0">Shipping</td><td align="right">${order.shippingCents ? money(order.shippingCents) : "Free"}</td></tr>
${order.items.some(i => (i.lineDiscountCents ?? 0) > 0) ? `<tr><td style="padding:4px 0">Discount</td><td align="right">−${money(order.items.reduce((sum,i)=>sum+(i.lineDiscountCents ?? 0),0))}</td></tr>` : ""}
${order.taxCents ? `<tr><td style="padding:4px 0">Tax</td><td align="right">${money(order.taxCents)}</td></tr>` : ""}
<tr><td style="padding:8px 0;font-weight:bold">Total</td><td align="right" style="font-weight:bold">${money(order.totalCents)}</td></tr></table>`;
}

/** What the customer should expect, given who ships each part of the order. */
function shipPromise(order: Order) {
  const custom = order.items.filter((i) => i.customJobId);
  const partner = order.items.filter((i) => !i.customJobId && i.fulfillment && i.fulfillment !== "stock");
  const ours = order.items.length - custom.length - partner.length;
  const parts = [
    ours ? `In-stock items ship from Denver within 1–2 business days.` : "",
    custom.length ? `Custom-made items go into production now; we'll email you when they ship.` : "",
    partner.length ? `${partner.length === 1 ? "One item ships" : "Some items ship"} directly from our partner warehouse.` : "",
  ].filter(Boolean);
  const split = [ours > 0, custom.length > 0, partner.length > 0].filter(Boolean).length > 1;
  return `Order <b>${order.number}</b> is confirmed. ${parts.join(" ")}${split ? " Parts of your order may arrive separately, each with its own tracking." : " You'll get tracking by email as soon as it ships."}`;
}

export function orderConfirmationEmail(order: Order) {
  return {
    subject: `Order ${order.number} confirmed`,
    html: shell(
      `Thanks${order.customerName ? `, ${esc(order.customerName.split(" ")[0])}` : ""}. Your order is in.`,
      `<p style="font-size:15px;line-height:1.5">${order.status === "needs_attention" ? `Payment received for order <b>${order.number}</b>. We are checking an inventory issue and will contact you before shipping.` : shipPromise(order)}</p>${itemsTable(order)}`,
    ),
  };
}

export function shippedEmail(order: Order) {
  return {
    subject: `Order ${order.number} has shipped`,
    html: shell(
      "Your gear is on the way",
      `<p style="font-size:15px;line-height:1.5">Order <b>${order.number}</b> shipped via ${esc(order.carrier ?? "")} ${esc(order.service ?? "")}.</p>
<p style="margin:20px 0"><a href="${order.trackingUrl ?? "#"}" style="background:#ff7a00;color:#13201c;padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:bold">Track package ${esc(order.trackingNumber ?? "")}</a></p>${itemsTable(order)}`,
    ),
  };
}

export function ownerAlertEmail(subject: string, lines: string[]) {
  return { subject: `[${site.name}] ${subject}`, html: shell(subject, lines.map((l) => `<p style="font-size:14px">${esc(l)}</p>`).join("")) };
}

export function ticketReplyEmail(name: string, topic: string, reply: string) {
  return {
    subject: `Re: ${topic}`,
    html: shell(
      `Hi${name ? ` ${esc(name.split(" ")[0])}` : ""},`,
      reply
        .split(/\n{2,}/)
        .map((p) => `<p style="font-size:15px;line-height:1.5">${esc(p).replace(/\n/g, "<br>")}</p>`)
        .join(""),
    ),
  };
}

export function stockAlertEmail(opts: { label: string; productTitle: string; productUrl: string; priceCents: number; unsubscribeUrl: string }) {
  return {
    subject: `Now in stock: ${opts.productTitle}`,
    html: shell(
      "The part you asked about is listed",
      `<p style="font-size:15px;line-height:1.5">You asked us to tell you when we had: <b>${esc(opts.label)}</b>.</p>
<p style="font-size:15px;line-height:1.5"><b>${esc(opts.productTitle)}</b> is now listed for ${money(opts.priceCents)}. Stock is limited and we don't hold items.</p>
<p style="margin:20px 0"><a href="${opts.productUrl}" style="background:#ff7a00;color:#13201c;padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:bold">View it</a></p>
<p style="font-size:12px;color:#5b6670">This alert has now been used, so you won't get more emails about it. <a href="${opts.unsubscribeUrl}" style="color:#5b6670">Cancel this alert</a>.</p>`,
    ),
  };
}

const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${href}" style="background:#ff7a00;color:#13201c;padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:bold">${esc(label)}</a></p>`;

const addressBlock = (a: Address | null) =>
  a
    ? `<p style="font-size:14px;line-height:1.5;background:#eef3f4;padding:12px 14px;border-radius:4px">${[a.name, a.line1, a.line2, `${a.city}, ${a.state} ${a.postalCode}`, a.country, a.phone]
        .filter(Boolean)
        .map((l) => esc(String(l)))
        .join("<br>")}</p>`
    : `<p style="font-size:14px;color:#c95a00"><b>No ship-to address on file.</b> Reply to this email before shipping.</p>`;

/** Purchase order emailed to a supplier when a customer pays. */
export function purchaseOrderEmail(po: PurchaseOrder, supplier: Supplier, link: string) {
  const rows = po.items
    .map(
      (i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e3e8ea;vertical-align:top">
<b>${esc(i.title)}</b>${i.supplierSku ? `<br><small>Your SKU: ${esc(i.supplierSku)}</small>` : ""}<br><small>Our ref: ${esc(i.sku)}</small>
${i.spec?.length ? `<ul style="margin:8px 0 0;padding-left:18px;font-size:13px">${i.spec.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
${i.artwork?.length ? `<p style="margin:8px 0 0;font-size:13px">Artwork: ${i.artwork.map((a) => `<a href="${a.url}">${esc(a.name)}</a>`).join(", ")}</p>` : ""}
</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e3e8ea;vertical-align:top">× ${i.quantity}${i.unitCostCents != null ? `<br><small>${money(i.unitCostCents)} ea</small>` : ""}</td></tr>`,
    )
    .join("");
  return {
    subject: `Purchase order ${po.number} from ${site.name}`,
    html: shell(
      `Purchase order ${po.number}`,
      `<p style="font-size:15px;line-height:1.5">Hi${supplier.contactName ? ` ${esc(supplier.contactName.split(" ")[0])}` : ""}, please fill this order and ship it directly to our customer.</p>
<p style="font-size:14px;line-height:1.5"><b>Blind ship, please:</b> no ${esc(supplier.name)} branding, invoice or pricing in the package. Use ${esc(site.name)} as the shipper name if your system allows it.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}</table>
${po.costCents != null ? `<p style="font-size:14px;text-align:right"><b>PO total: ${money(po.costCents)}</b></p>` : ""}
<h2 style="font-size:16px;margin:24px 0 8px">Ship to</h2>${addressBlock(po.shipTo)}
<p style="font-size:15px;line-height:1.5">Use this private link to confirm the order and add tracking when it ships. Our customer gets the tracking automatically.</p>
${button(link, "Confirm & add tracking")}
<p style="font-size:13px;color:#5b6670">Questions about this order? Reply to this email.</p>`,
    ),
  };
}

/** Customer email when one supplier's part of an order ships. */
export function partShippedEmail(order: Order, po: PurchaseOrder, allShipped: boolean) {
  return {
    subject: allShipped ? `Order ${order.number} has shipped` : `Part of order ${order.number} has shipped`,
    html: shell(
      allShipped ? "Your gear is on the way" : "Part of your order is on the way",
      `<p style="font-size:15px;line-height:1.5">${po.items.map((i) => `${esc(i.title)}${i.quantity > 1 ? ` × ${i.quantity}` : ""}`).join(", ")} shipped${po.carrier ? ` via ${esc(po.carrier)}` : ""}.${allShipped ? "" : " The rest of your order ships separately, and you'll get tracking for it too."}</p>
${po.trackingUrl ? button(po.trackingUrl, `Track package ${po.trackingNumber ?? ""}`) : `<p style="font-size:15px">Tracking number: <b>${esc(po.trackingNumber ?? "")}</b></p>`}`,
    ),
  };
}

const jobKindLabel: Record<CustomJob["kind"], string> = { canopy: "custom logo canopy", poles: "custom tent pole build", private_label: "private-label tent order" };

/** To the customer right after they submit a custom request. */
export function customRequestReceivedEmail(job: CustomJob, link: string) {
  return {
    subject: `We got your ${jobKindLabel[job.kind]} request (${job.number})`,
    html: shell(
      "Your request is in",
      `<p style="font-size:15px;line-height:1.5">Thanks${job.name ? `, ${esc(job.name.split(" ")[0])}` : ""}. We'll check your artwork and details with our production partner and send a proof and final price, usually within 2 business days.</p>
<ul style="font-size:14px;line-height:1.6">${job.summary.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
${job.estimateCents ? `<p style="font-size:14px">Estimate: <b>${money(job.estimateCents)}</b> (final price comes with your proof)</p>` : ""}
${button(link, "View your request")}
<p style="font-size:13px;color:#5b6670">Nothing is charged until you approve the proof.</p>`,
    ),
  };
}

/** To the customer when the owner sends the proof and final price. */
export function customQuoteEmail(job: CustomJob, link: string) {
  return {
    subject: `Your proof and price are ready (${job.number})`,
    html: shell(
      "Your proof is ready",
      `<p style="font-size:15px;line-height:1.5">Your ${jobKindLabel[job.kind]} is ready to review. Check the proof carefully: spelling, colors and logo placement print exactly as shown.</p>
<p style="font-size:15px">Price: <b>${money((job.priceCents ?? 0) + job.shippingCents)}</b>${job.shippingCents ? ` including ${money(job.shippingCents)} shipping` : ", shipping included"}</p>
${job.ownerNote ? `<p style="font-size:14px;line-height:1.5;background:#eef3f4;padding:12px 14px;border-radius:4px">${esc(job.ownerNote)}</p>` : ""}
${button(link, "Review proof & approve")}
<p style="font-size:13px;color:#5b6670">Want changes? Use the same link to tell us what to fix.</p>`,
    ),
  };
}

/** To the owner when a customer submits a request or asks for proof changes. */
export function customJobOwnerEmail(job: CustomJob, headline: string, adminLink: string) {
  return {
    subject: `[${site.name}] ${headline}: ${job.number}`,
    html: shell(
      headline,
      `<p style="font-size:14px">${esc(job.name)}${job.company ? `, ${esc(job.company)}` : ""} · <a href="mailto:${esc(job.email)}">${esc(job.email)}</a>${job.phone ? ` · ${esc(job.phone)}` : ""}</p>
<ul style="font-size:14px;line-height:1.6">${job.summary.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
${job.customerNote ? `<p style="font-size:14px;line-height:1.5;background:#eef3f4;padding:12px 14px;border-radius:4px">${esc(job.customerNote)}</p>` : ""}
${job.artwork.length ? `<p style="font-size:14px">Artwork: ${job.artwork.map((a) => `<a href="${a.url}">${esc(a.name)}</a>`).join(", ")}</p>` : ""}
${button(adminLink, "Open in admin")}`,
    ),
  };
}
