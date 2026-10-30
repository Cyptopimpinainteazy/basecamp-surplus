import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to enable AI listings and support chat.");
  }
  _client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export const LISTING_MODEL = process.env.ANTHROPIC_LISTING_MODEL ?? "claude-sonnet-5-5";
export const SUPPORT_MODEL = process.env.ANTHROPIC_SUPPORT_MODEL ?? "claude-haiku-5-5";
