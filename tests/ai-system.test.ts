import assert from "node:assert/strict";
import { test } from "vitest";
import { z } from "zod";
import { requestStructuredAI } from "../lib/ai/structured-output";
import { AIServiceError, type AIProvider } from "../lib/ai/types";

const toolSchema = { type: "object" as const, properties: { value: { type: "string" } }, required: ["value"] };

test("structured AI retries malformed output and returns validated data", async () => {
  let calls = 0;
  const provider: AIProvider = { name: "mock", defaultModel: "mock-1", isConfigured: () => true, async generateStructured() { calls += 1; return { data: calls === 1 ? { nope: true } : { value: "ok" }, provider: "mock", model: "mock-1" }; } };
  const result = await requestStructuredAI({ feature: "assessment-grading", schema: z.object({ value: z.string() }), toolSchema, toolName: "test", toolDescription: "test", prompt: "redacted", maxTokens: 10, provider });
  assert.equal(calls, 2);
  assert.equal(result.data.value, "ok");
  assert.equal(result.metadata.retries, 1);
});

test("structured AI enforces timeout through AbortSignal", async () => {
  const provider: AIProvider = { name: "mock", defaultModel: "mock-1", isConfigured: () => true, generateStructured(request) { return new Promise((_resolve, reject) => request.signal?.addEventListener("abort", () => reject(new AIServiceError("timeout", "timed out")), { once: true })); } };
  await assert.rejects(() => requestStructuredAI({ feature: "resume-extraction", schema: z.object({ value: z.string() }), toolSchema, toolName: "test", toolDescription: "test", prompt: "redacted", maxTokens: 10, timeoutMs: 5, provider }), (error: unknown) => error instanceof AIServiceError && error.code === "timeout");
});

test("unconfigured provider fails with a typed error without making a call", async () => {
  const provider: AIProvider = { name: "mock", defaultModel: "mock-1", isConfigured: () => false, async generateStructured() { throw new Error("should not run"); } };
  await assert.rejects(() => requestStructuredAI({ feature: "roadmap-generation", schema: z.object({ value: z.string() }), toolSchema, toolName: "test", toolDescription: "test", prompt: "redacted", maxTokens: 10, provider }), (error: unknown) => error instanceof AIServiceError && error.code === "not-configured");
});
