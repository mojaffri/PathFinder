import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIStructuredRequest, AIStructuredResponse } from "./types";
import { AIServiceError } from "./types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly defaultModel = DEFAULT_ANTHROPIC_MODEL;
  private client: Anthropic | null = null;

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async generateStructured(request: AIStructuredRequest): Promise<AIStructuredResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new AIServiceError("not-configured", "Anthropic is not configured.");
    this.client ??= new Anthropic({ apiKey });
    try {
      const model = request.model ?? this.defaultModel;
      const response = await this.client.messages.create(
        {
          model,
          max_tokens: request.maxTokens,
          tools: [{ name: request.toolName, description: request.toolDescription, input_schema: request.toolSchema }],
          tool_choice: { type: "tool", name: request.toolName },
          messages: [{ role: "user", content: request.prompt }],
        },
        { signal: request.signal },
      );
      const toolUse = response.content.find((block) => block.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        throw new AIServiceError("malformed-output", "Provider returned no structured tool output.");
      }
      return {
        data: toolUse.input,
        provider: this.name,
        model,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
      };
    } catch (error) {
      if (error instanceof AIServiceError) throw error;
      if (request.signal?.aborted) throw new AIServiceError("timeout", "AI request timed out.", error);
      throw new AIServiceError("provider", "AI provider request failed.", error);
    }
  }
}
