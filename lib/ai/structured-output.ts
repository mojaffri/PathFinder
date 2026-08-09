import type { ZodType } from "zod";
import { getAIProvider } from "./provider";
import { recordAICall } from "./observability";
import { AIServiceError, type AIFeature, type AIProvider, type AIUsage } from "./types";

export interface StructuredAIResult<T> {
  data: T;
  metadata: { provider: string; model: string; retries: number; usage?: AIUsage };
}

export async function requestStructuredAI<T>({
  feature,
  schema,
  toolSchema,
  toolName,
  toolDescription,
  prompt,
  maxTokens,
  timeoutMs = 20_000,
  malformedRetries = 1,
  provider = getAIProvider(),
}: {
  feature: AIFeature;
  schema: ZodType<T>;
  toolSchema: { type: "object"; properties?: Record<string, unknown>; required?: string[]; [key: string]: unknown };
  toolName: string;
  toolDescription: string;
  prompt: string;
  maxTokens: number;
  timeoutMs?: number;
  malformedRetries?: number;
  provider?: AIProvider;
}): Promise<StructuredAIResult<T>> {
  const started = Date.now();
  let parseFailures = 0;
  let lastError: unknown;
  const model = provider.defaultModel;

  if (!provider.isConfigured()) {
    const error = new AIServiceError("not-configured", "AI provider is not configured.");
    recordAICall({ timestamp: new Date().toISOString(), feature, provider: provider.name, model, latencyMs: 0, success: false, retries: 0, parseFailures: 0, errorCode: error.code });
    throw error;
  }

  for (let attempt = 0; attempt <= malformedRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await provider.generateStructured({ feature, maxTokens, toolName, toolDescription, toolSchema, prompt, signal: controller.signal });
      const parsed = schema.safeParse(response.data);
      if (!parsed.success) {
        parseFailures += 1;
        lastError = parsed.error;
        continue;
      }
      recordAICall({ timestamp: new Date().toISOString(), feature, provider: response.provider, model: response.model, latencyMs: Date.now() - started, success: true, retries: attempt, parseFailures, usage: response.usage });
      return { data: parsed.data, metadata: { provider: response.provider, model: response.model, retries: attempt, usage: response.usage } };
    } catch (error) {
      lastError = error;
      if (error instanceof AIServiceError && error.code === "malformed-output") {
        parseFailures += 1;
        continue;
      }
      const code = error instanceof AIServiceError ? error.code : "provider";
      recordAICall({ timestamp: new Date().toISOString(), feature, provider: provider.name, model, latencyMs: Date.now() - started, success: false, retries: attempt, parseFailures, errorCode: code });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  const error = new AIServiceError("malformed-output", "Structured AI output failed validation after retry.", lastError);
  recordAICall({ timestamp: new Date().toISOString(), feature, provider: provider.name, model, latencyMs: Date.now() - started, success: false, retries: malformedRetries, parseFailures, errorCode: error.code });
  throw error;
}
