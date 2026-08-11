import { afterEach, describe, expect, it } from "vitest";
import { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL, DEFAULT_GATEWAY_MODEL } from "@/lib/ai/anthropic-provider";

const original = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  gateway: process.env.AI_GATEWAY_API_KEY,
  oidc: process.env.VERCEL_OIDC_TOKEN,
};

afterEach(() => {
  setEnv("ANTHROPIC_API_KEY", original.anthropic);
  setEnv("AI_GATEWAY_API_KEY", original.gateway);
  setEnv("VERCEL_OIDC_TOKEN", original.oidc);
});

function setEnv(name: "ANTHROPIC_API_KEY" | "AI_GATEWAY_API_KEY" | "VERCEL_OIDC_TOKEN", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("AnthropicProvider configuration", () => {
  it("uses Vercel's automatic OIDC token through AI Gateway", () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    process.env.VERCEL_OIDC_TOKEN = "short-lived-token";
    const provider = new AnthropicProvider();
    expect(provider.isConfigured()).toBe(true);
    expect(provider.defaultModel).toBe(DEFAULT_GATEWAY_MODEL);
  });

  it("prefers a direct Anthropic key when one is configured", () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-key";
    process.env.VERCEL_OIDC_TOKEN = "short-lived-token";
    const provider = new AnthropicProvider();
    expect(provider.isConfigured()).toBe(true);
    expect(provider.defaultModel).toBe(DEFAULT_ANTHROPIC_MODEL);
  });
});
