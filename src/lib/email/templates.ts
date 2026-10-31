import { site } from "../config";
import type { Order } from "../db/schema";
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
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e3e8ea">${esc(i.title)}${i.quantity > 1 ? ` × ${i.quantity}` : ""}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e3e8ea">${money(i.unitCents * i.quantity)}</td></tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}
<tr><td style="padding:8px 0">Shipping</td><td align="right">${order.shippingCents ? money(order.shippingCents) : "Free"}</td></tr>
${order.taxCents ? `<tr><td style="padding:4px 0">Tax</td><td align="right">${money(order.taxCents)}</td></tr>` : ""}
<tr><td style="padding:8px 0;font-weight:bold">Total</td><td align="right" style="font-weight:bold">${money(order.totalCents)}</td></tr></table>`;
}

export function orderConfirmationEmail(order: Order) {
  return {
    subject: `Order ${order.number} confirmed`,
    html: shell(
      `Thanks${order.customerName ? `, ${esc(order.customerName.split(" ")[0])}` : ""}. Your order is in.`,
      `<p style="font-size:15px;line-height:1.5">Order <b>${order.number}</b> ships from Denver within 1–2 business days. You'll get another email with tracking as soon as the label is printed.</p>${itemsTable(order)}`,
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
