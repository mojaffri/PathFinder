import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIStructuredRequest, AIStructuredResponse } from "./types";
import { AIServiceError } from "./types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";
export const DEFAULT_GATEWAY_MODEL = "anthropic/claude-sonnet-4.6";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic | null = null;

  get defaultModel(): string {
    return this.usesGateway() ? DEFAULT_GATEWAY_MODEL : DEFAULT_ANTHROPIC_MODEL;
  }

  private usesGateway(): boolean {
    return !process.env.ANTHROPIC_API_KEY && Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
  }

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
  }

  async generateStructured(request: AIStructuredRequest): Promise<AIStructuredResponse> {
    const gateway = this.usesGateway();
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
    if (!apiKey) throw new AIServiceError("not-configured", "Anthropic is not configured.");
    this.client ??= new Anthropic({ apiKey, ...(gateway ? { baseURL: "https://ai-gateway.vercel.sh" } : {}) });
    try {
      const model = request.model ?? this.defaultModel;
      const content: Anthropic.MessageCreateParams["messages"][number]["content"] = request.document
        ? [
            {
              type: "document",
              source: { type: "base64", media_type: request.document.mediaType, data: request.document.data },
              title: request.document.title ?? null,
            },
            { type: "text", text: request.prompt },
          ]
        : request.prompt;
      const response = await this.client.messages.create(
        {
          model,
          max_tokens: request.maxTokens,
          tools: [{ name: request.toolName, description: request.toolDescription, input_schema: request.toolSchema }],
          tool_choice: { type: "tool", name: request.toolName },
          messages: [{ role: "user", content }],
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
