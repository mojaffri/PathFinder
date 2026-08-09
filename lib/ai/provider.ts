import { AnthropicProvider } from "./anthropic-provider";
import type { AIProvider } from "./types";

let provider: AIProvider = new AnthropicProvider();

export function getAIProvider(): AIProvider {
  return provider;
}

export function setAIProviderForTests(next: AIProvider): void {
  if (process.env.NODE_ENV !== "test") throw new Error("AI provider injection is test-only.");
  provider = next;
}
