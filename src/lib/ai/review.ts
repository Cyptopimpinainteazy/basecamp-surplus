import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { categorySlugs, site } from "../config";
import { anthropic, LISTING_MODEL } from "./client";

// Drafts a long-form gear review. Claude researches the product with the web
// search server tool, then returns the article through the save_review tool.
// Drafts are saved unpublished so the owner can review before anything goes live.

export const aiReviewSchema = z.object({
  title: z.string().min(20).max(110),
  dek: z.string().min(40).max(320),
  subject: z.string().min(3),
  stockQuery: z.string().min(2),
  category: z.enum(categorySlugs),
  verdict: z.string().min(80),
  bestFor: z.string().min(10),
  notFor: z.string().min(10),
  pros: z.array(z.string()).min(3).max(7),
  cons: z.array(z.string()).min(2).max(7),
  specs: z.array(z.object({ label: z.string(), value: z.string() })).max(18),
  body: z.string().min(1500),
  seoTitle: z.string().max(70),
  seoDescription: z.string().max(170),
  keywords: z.array(z.string()).max(15),
  sources: z.array(z.object({ title: z.string(), url: z.string().url() })).min(1).max(10),
});
export type AiReview = z.infer<typeof aiReviewSchema>;

const saveTool: Anthropic.Tool = {
  name: "save_review",
  description: "Save the finished review article. Call exactly once, after research is done.",
  input_schema: {
    type: "object",
    required: [
      "title", "dek", "subject", "stockQuery", "category", "verdict", "bestFor", "notFor",
      "pros", "cons", "specs", "body", "seoTitle", "seoDescription", "keywords", "sources",
    ],
    properties: {
      title: { type: "string", description: "Headline: '<Brand> <Model> review: <the one-line takeaway>'. Under 100 characters." },
      dek: { type: "string", description: "One or two sentences under the headline summarizing who it's for and the main trade-off." },
      subject: { type: "string", description: "Brand and model, e.g. 'The North Face Wawona 4'." },
      stockQuery: { type: "string", description: "Shortest phrase that identifies this model in store listings, e.g. 'Wawona 4'." },
      category: { type: "string", enum: [...categorySlugs] },
      verdict: { type: "string", description: "Three sentences: what it is, who should buy it, who should look elsewhere." },
      bestFor: { type: "string" },
      notFor: { type: "string" },
      pros: { type: "array", items: { type: "string" } },
      cons: { type: "array", items: { type: "string" } },
      specs: {
        type: "array",
        items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] },
        description: "Published specs from manufacturer or major retailers only. Include units.",
      },
      body: {
        type: "string",
        description: "Markdown article, 1,100–1,600 words, using ## section headings (no # h1). Cover: the short version; fit/sizing or space with concrete examples; the standout feature; setup or use; weather performance; durability; versions or how to identify them if relevant; comparison with its closest sibling; bottom line. Plain markdown only, no HTML.",
      },
      seoTitle: { type: "string", description: "Under 60 characters, starts with brand + model + 'Review'." },
      seoDescription: { type: "string", description: "150–160 characters." },
      keywords: { type: "array", items: { type: "string" } },
      sources: {
        type: "array",
        items: { type: "object", properties: { title: { type: "string" }, url: { type: "string" } }, required: ["title", "url"] },
        description: "Every page you relied on for specs or claims.",
      },
    },
  },
};

const system = `You write gear reviews for ${site.name}, an outdoor gear store in Denver, Colorado. Reviews double as buying guides and must rank in search, so they are specific, accurate and useful.

Research first: search for the manufacturer's specs, at least one major retailer listing (REI, Backcountry, Moosejaw, MEC), and independent reviews. Use more searches when specs conflict, and note version differences when a model has been updated.

Honesty rules (non-negotiable):
- ${site.name} has not field-tested the product. Never claim "we tested", "in our testing", "we camped", or any first-hand experience. Attribute hands-on findings to their source ("independent testers found…", "owners on REI report…").
- Only state specs you found in sources. When sources disagree, say which version each refers to or leave it out.
- Don't invent star ratings, prices that may change, or quotes. Paraphrase sources; never copy sentences.
- Give an honest verdict including real weaknesses. Don't oversell because the store sells the item.

Style: a knowledgeable gear-shop voice, plain sentences, concrete numbers (pad widths, square feet, inches of headroom), no hype words, no emojis. Where relevant mention Colorado conditions (afternoon thunderstorms, wind above treeline, cold nights). If the product uses tent poles, you may link to the replacement pole finder at /poles.`;

export async function writeReview(input: { subject: string; notes?: string }): Promise<AiReview> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Write the review for: ${input.subject}.${input.notes ? `\n\nOwner's notes to include (these are first-hand and can be stated as the store's own observations): ${input.notes}` : ""}`,
    },
  ];
  const tools = [
    { type: "web_search_20250305", name: "web_search", max_uses: 8 } as unknown as Anthropic.Tool,
    saveTool,
  ];

  for (let step = 0; step < 8; step++) {
    const res = await anthropic().messages.create({
      model: LISTING_MODEL,
      max_tokens: 16000,
      system,
      tools,
      messages,
    });
    const save = res.content.find((b) => b.type === "tool_use" && b.name === "save_review");
    if (save && save.type === "tool_use") {
      const parsed = aiReviewSchema.safeParse(save.input);
      if (parsed.success) return parsed.data;
      messages.push({ role: "assistant", content: res.content });
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: save.id,
            is_error: true,
            content: `Fix these fields and call save_review again: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
          },
        ],
      });
      continue;
    }
    // Server-side search paused or Claude stopped early: continue the same turn.
    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason !== "pause_turn") {
      messages.push({ role: "user", content: "Now call save_review with the finished article." });
    }
  }
  throw new Error("The review couldn't be finished. Try again, or add notes to narrow the model.");
}
