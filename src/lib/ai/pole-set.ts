import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { site } from "../config";
import { anthropic, LISTING_MODEL } from "./client";

// Reads one photo set of a tent's complete pole kit (ideally laid out beside a
// tape measure) and returns one entry per distinct pole, ready to list.

const pole = z.object({
  role: z.string().min(2),
  shape: z.enum(["straight", "prebent", "hub"]).default("straight"),
  hubArms: z.number().int().min(2).max(8).nullable().default(null),
  countInSet: z.number().int().min(1).max(12),
  sections: z.number().int().min(1).max(20).nullable(),
  lengthIn: z.number().positive().max(400).nullable(),
  packedLengthIn: z.number().positive().max(60).nullable(),
  diameterMm: z.number().positive().max(25).nullable(),
  colorCode: z.string().default(""),
  material: z.string().default(""),
  title: z.string().min(15).max(80),
  description: z.string().min(60),
  keywords: z.array(z.string()).max(12).default([]),
  weightOz: z.number().positive().nullable(),
});

export const poleSetSchema = z.object({
  brand: z.string().min(2),
  tentModel: z.string().min(2),
  poles: z.array(pole).min(1).max(10),
  readFromLabels: z.array(z.string()).default([]),
  uncertainties: z.array(z.string()).default([]),
});
export type PoleSet = z.infer<typeof poleSetSchema>;

const tool: Anthropic.Tool = {
  name: "record_pole_set",
  description: "Record every distinct pole in the photographed tent pole kit.",
  input_schema: {
    type: "object",
    required: ["brand", "tentModel", "poles"],
    properties: {
      brand: { type: "string", description: "e.g. 'The North Face'." },
      tentModel: { type: "string", description: "Tent model without brand, exactly as printed, e.g. 'Stormbreak 2', 'Wawona 6', 'Madraque 33'." },
      poles: {
        type: "array",
        description: "One entry per distinct pole. Identical poles (same length, color and sections) are one entry with countInSet > 1.",
        items: {
          type: "object",
          required: ["role", "shape", "countInSet", "sections", "lengthIn", "packedLengthIn", "diameterMm", "title", "description", "weightOz"],
          properties: {
            role: { type: "string", description: "Position: 'main', 'cross', 'brow', 'fly', 'hub', 'door arch', 'ridge'. If unknown, describe it ('long gray pole')." },
            shape: { type: "string", enum: ["straight", "prebent", "hub"], description: "straight: flexes into shape; prebent: sections have visible factory bends; hub: several legs joined at an aluminum hub piece." },
            hubArms: { type: ["integer", "null"], description: "Hub assemblies only: number of legs off the hub." },
            countInSet: { type: "integer", description: "How many of this exact pole one tent uses." },
            sections: { type: ["integer", "null"], description: "Shock-corded sections counted in the photo." },
            lengthIn: { type: ["number", "null"], description: "Assembled tip-to-tip inches (hub assemblies: the longest leg, hub center to tip; pre-bent poles: along the curve). Only from a printed label or a tape measure readable in the photo. Otherwise null. Never estimate." },
            packedLengthIn: { type: ["number", "null"], description: "One section's length in inches, only if readable on a tape or label." },
            diameterMm: { type: ["number", "null"], description: "Only if printed on the pole." },
            colorCode: { type: "string" },
            material: { type: "string", description: "e.g. 'DAC Featherlite NSL aluminum', 'Aluminum', 'Fiberglass'." },
            title: { type: "string", description: "Listing title, max 80 chars: 'Replacement <Role> Pole for <Brand> <Model> Tent'." },
            description: { type: "string", description: "60–120 words: what it is, which tent and position it fits, sections/length if known, how to confirm fit (color code, label). No hype." },
            keywords: { type: "array", items: { type: "string" } },
            weightOz: { type: ["number", "null"], description: "Only if a scale is shown; else null." },
          },
        },
      },
      readFromLabels: { type: "array", items: { type: "string" } },
      uncertainties: { type: "array", items: { type: "string" }, description: "Anything the seller should check: unreadable tape, unsure model, mixed sets." },
    },
  },
};

export async function readPoleSet(imageUrls: string[], hints: { tentHint?: string; notes?: string }): Promise<PoleSet> {
  const content: Anthropic.ContentBlockParam[] = [
    ...imageUrls.slice(0, 12).map((url) => ({ type: "image", source: { type: "url", url } }) as Anthropic.ImageBlockParam),
    { type: "text", text: "This is one tent's pole kit. Record every distinct pole." },
  ];
  const res = await anthropic().messages.create({
    model: LISTING_MODEL,
    max_tokens: 6000,
    system: `You catalog replacement tent poles for ${site.name}, a Denver outdoor gear store. Read pole labels, sleeve tags, printed DAC markings, color codes and any tape measure in the photos. Measurements must come from what is printed or readable; when a number isn't visible, return null and add a note to uncertainties. Never guess lengths from proportions.${hints.tentHint ? `\nThe seller says this kit is for: ${hints.tentHint}.` : ""}${hints.notes ? `\nSeller notes: ${hints.notes}` : ""}`,
    tools: [tool],
    tool_choice: { type: "tool", name: "record_pole_set" },
    messages: [{ role: "user", content }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("The AI didn't return the pole set. Try again.");
  const parsed = poleSetSchema.safeParse(block.input);
  if (!parsed.success) {
    throw new Error(`The pole set came back incomplete: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  }
  return parsed.data;
}
