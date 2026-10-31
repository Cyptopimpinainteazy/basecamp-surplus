import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { and, eq, gt, sql } from "drizzle-orm";
import { anthropic, SUPPORT_MODEL } from "./ai/client";
import { categories, getCondition, policies, site } from "./config";
import { db } from "./db";
import { supportConversations, supportTickets, type ChatMessage } from "./db/schema";
import { money } from "./format";
import { getProductBySlug, listProducts } from "./products";
import { lookupOrderForCustomer } from "./orders";
import { sendEmail } from "./email/send";
import { tentReference } from "./tent-reference";
import { ownerAlertEmail } from "./email/templates";

// AI support assistant: answers from live inventory, policies and order status,
// and opens a ticket for anything it can't resolve (returns, damage, refunds).

const MAX_USER_MESSAGES = 25;
const MAX_CONVERSATIONS_PER_IP_PER_HOUR = 8;

const tools: Anthropic.Tool[] = [
  {
    name: "search_inventory",
    description: "Search in-stock products. Use for any question about what we carry, sizes, prices, or alternatives.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords, e.g. 'nuptse', 'down jacket', 'stormbreak 2 pole'" },
        category: { type: "string", enum: categories.map((c) => c.slug) },
        size: { type: "string" },
        max_price_usd: { type: "number" },
        condition: { type: "string", enum: ["new", "used"] },
      },
    },
  },
  {
    name: "get_product",
    description: "Full details for one product by its slug (from search results).",
    input_schema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] },
  },
  {
    name: "lookup_order",
    description: "Look up order status and tracking. Requires BOTH the order number (BC-XXXXXX) and the email used at checkout. Ask the customer for both before calling.",
    input_schema: {
      type: "object",
      properties: { order_number: { type: "string" }, email: { type: "string" } },
      required: ["order_number", "email"],
    },
  },
  {
    name: "create_ticket",
    description: "Hand off to the owner. Use for returns, refunds, damaged or wrong items, address changes after purchase, bulk/wholesale inquiries, or anything you cannot resolve. Ask for the customer's email first.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        order_number: { type: "string" },
        topic: { type: "string", description: "Short subject, e.g. 'Return request: BC-7KQ2MD'" },
        summary: { type: "string", description: "Everything the owner needs to act without re-asking." },
      },
      required: ["email", "topic", "summary"],
    },
  },
];

const system = `You are the customer support assistant for ${site.name} (${site.url}), an online outdoor gear store in ${site.city}, Colorado selling new-with-tags tents, jackets, snow gear and replacement tent poles (The North Face, Montec, Dope, Fjällräven) and pre-owned Patagonia.

How to help:
- Be brief, friendly and specific. Plain sentences, no emojis, no markdown headings. Use short lists only when comparing products.
- For product questions, call search_inventory and recommend real in-stock items with their price and link (${site.url}/p/<slug>). Never invent products, stock, prices, specs or discounts.
- For order status, collect the order number AND checkout email, then call lookup_order. Never reveal order details without both matching.
- Returns, refunds, damaged/wrong items, cancellations and address changes: gather the order number, email and what happened, then call create_ticket and tell the customer the owner will reply by email within one business day. You cannot issue refunds yourself.
- If asked about authenticity: everything is authentic retail surplus/overstock; we are an independent reseller, not affiliated with or authorized by any brand.
- Replacement poles: ask for the tent brand and model and search for it. Results include pole_size (assembled lengthIn, sections, diameterMm, colorCode, role); compare with the customer's measurements. The full chart is at ${site.url}/poles/sizes. Customers who don't know their tent model can search by measurement at ${site.url}/poles/size, or upload photos of the pole at ${site.url}/poles/photo and the site reads labels, sections and shape for them. Every tent model we know has a parts page under ${site.url}/parts. Side-by-side tent comparisons (e.g. Rock 22 vs Rock 32) are at ${site.url}/compare. Custom work: logo canopy tents with a free proof at ${site.url}/custom/canopy-tents, tent poles cut to the customer's measurements at ${site.url}/custom/tent-poles (priced instantly, built in Denver in 3-5 business days), and private-label tents for brands at ${site.url}/custom/private-label. Never quote a final price for printed or private-label work; the builder estimate is only an estimate until the proof. If none match, offer a ticket so the owner can check unlisted stock.
- Useful pages: returns ${site.url}/returns, contact ${site.url}/contact, wholesale and bulk quotes ${site.url}/wholesale, privacy ${site.url}/privacy. Send bulk or wholesale buyers to the wholesale page.
- If a part isn't listed yet, tell them they can set an email alert on the finder or size search page so they hear when it's listed.
- If you don't know, say so and offer a ticket. Stay on topic; politely decline unrelated requests.

North Face tent pole reference (published specs; lengths are not published). Use it to narrow down a customer's tent from pole diameter or count, and say it narrows the options rather than confirming a fit:
${tentReference.map((t) => `- ${t.model}: ${t.poleCount ?? "?"} poles${t.hub ? " with hub" : ""}${t.diametersMm.length ? `, ${t.diametersMm.join("/")} mm` : ""}${t.poleSystem ? `, ${t.poleSystem}` : ""}`).join("\n")}

Policies (quote accurately):
Shipping: ${policies.shipping}
Returns: ${policies.returns}
Authenticity: ${policies.authenticity}
Sizing: ${policies.sizing}
Payment: ${policies.payment}`;

async function runTool(name: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  switch (name) {
    case "search_inventory": {
      const rows = await listProducts({
        q: (input.query as string) || undefined,
        category: input.category as string | undefined,
        size: input.size as string | undefined,
        maxPriceCents: input.max_price_usd ? Math.round(Number(input.max_price_usd) * 100) : undefined,
        condition: input.condition as "new" | "used" | undefined,
        limit: 8,
      });
      if (rows.length === 0) return "No in-stock products match.";
      return JSON.stringify(
        rows.map((p) => ({
          slug: p.slug,
          title: p.title,
          price: money(p.priceCents),
          msrp: p.msrpCents ? money(p.msrpCents) : null,
          condition: getCondition(p.condition).label,
          size: p.size || null,
          color: p.color || null,
          in_stock: p.quantity,
          fits: p.fitment.length ? p.fitment : undefined,
          pole_size: p.category === "poles" && p.poleSpec ? p.poleSpec : undefined,
          url: `${site.url}/p/${p.slug}`,
        })),
      );
    }
    case "get_product": {
      const p = await getProductBySlug(String(input.slug));
      if (!p || p.status !== "active") return "Product not found or no longer available.";
      return JSON.stringify({
        title: p.title,
        price: money(p.priceCents),
        msrp: p.msrpCents ? money(p.msrpCents) : null,
        condition: getCondition(p.condition).label,
        condition_notes: p.conditionNotes,
        size: p.size,
        color: p.color,
        description: p.description,
        highlights: p.highlights,
        specs: p.specs,
        fits: p.fitment,
        in_stock: p.quantity,
        url: `${site.url}/p/${p.slug}`,
      });
    }
    case "lookup_order": {
      const o = await lookupOrderForCustomer(String(input.order_number ?? ""), String(input.email ?? ""));
      if (!o) return "No order matches that order number and email. Ask the customer to double-check both.";
      await db.update(supportConversations).set({ email: o.email }).where(eq(supportConversations.id, conversationId));
      return JSON.stringify({
        order_number: o.number,
        placed: o.createdAt.toISOString().slice(0, 10),
        status: o.status === "needs_attention" ? "processing" : o.status.replace("_", " "),
        items: o.items.map((i) => `${i.quantity} × ${i.title}`),
        total: money(o.totalCents),
        carrier: o.carrier,
        tracking_number: o.trackingNumber,
        tracking_url: o.trackingUrl,
        shipped_on: o.shippedAt?.toISOString().slice(0, 10) ?? null,
      });
    }
    case "create_ticket": {
      const email = String(input.email ?? "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "That email looks invalid. Ask the customer to re-enter it.";
      const [t] = await db
        .insert(supportTickets)
        .values({
          conversationId,
          name: String(input.name ?? ""),
          email,
          orderNumber: input.order_number ? String(input.order_number).toUpperCase() : null,
          topic: String(input.topic).slice(0, 200),
          summary: String(input.summary).slice(0, 4000),
        })
        .returning();
      if (site.ownerEmail) {
        await sendEmail({
          to: site.ownerEmail,
          replyTo: email,
          ...ownerAlertEmail(`Support ticket: ${t.topic}`, [`From ${t.name || "customer"} <${t.email}>`, t.orderNumber ? `Order ${t.orderNumber}` : "", t.summary]),
        }).catch((e) => console.error("[ticket alert]", e));
      }
      return `Ticket created. The owner will reply to ${email} within one business day.`;
    }
    default:
      return `Unknown tool ${name}`;
  }
}

export async function supportReply(opts: { conversationId?: string; message: string; ip: string }) {
  const text = opts.message.trim().slice(0, 2000);
  if (!text) throw new Error("Type a message first.");

  let conv = opts.conversationId
    ? (await db.select().from(supportConversations).where(eq(supportConversations.id, opts.conversationId)))[0]
    : undefined;
  if (!conv) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(supportConversations)
      .where(and(eq(supportConversations.ip, opts.ip), gt(supportConversations.createdAt, new Date(Date.now() - 3600_000))));
    if (n >= MAX_CONVERSATIONS_PER_IP_PER_HOUR) {
      throw new Error(`You've started a lot of chats in the last hour. Email ${site.supportEmail} and we'll help directly.`);
    }
    [conv] = await db.insert(supportConversations).values({ ip: opts.ip }).returning();
  }
  const history = conv.messages;
  if (history.filter((m) => m.role === "user").length >= MAX_USER_MESSAGES) {
    throw new Error(`This chat has reached its limit. Email ${site.supportEmail} and we'll pick it up from there.`);
  }

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: text },
  ];

  let reply = "";
  for (let step = 0; step < 6; step++) {
    const res = await anthropic().messages.create({
      model: SUPPORT_MODEL,
      max_tokens: 900,
      system,
      tools,
      messages,
    });
    if (res.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: res.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type !== "tool_use") continue;
        let out: string;
        try {
          out = await runTool(block.name, block.input as Record<string, unknown>, conv.id);
        } catch (e) {
          out = `Tool error: ${e instanceof Error ? e.message : String(e)}`;
        }
        results.push({ type: "tool_result", tool_use_id: block.id, content: out });
      }
      messages.push({ role: "user", content: results });
      continue;
    }
    reply = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    break;
  }
  if (!reply) reply = `I couldn't finish that one. Email ${site.supportEmail} and we'll sort it out.`;

  const now = new Date().toISOString();
  const updated: ChatMessage[] = [...history, { role: "user", content: text, at: now }, { role: "assistant", content: reply, at: now }];
  await db.update(supportConversations).set({ messages: updated, updatedAt: new Date() }).where(eq(supportConversations.id, conv.id));
  return { conversationId: conv.id, reply };
}
