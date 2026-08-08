import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/**
 * Server-only Anthropic client. Only ever import this from route handlers
 * (`app/api/**\/route.ts`) — never from a "use client" component — so
 * `ANTHROPIC_API_KEY` never ends up in a browser bundle.
 */
export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const ANTHROPIC_MODEL = "claude-sonnet-5";
