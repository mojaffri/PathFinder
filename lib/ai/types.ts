export type AIFeature = "resume-extraction" | "roadmap-generation" | "assessment-grading";

export interface AIUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface AIStructuredRequest {
  feature: AIFeature;
  model?: string;
  maxTokens: number;
  toolName: string;
  toolDescription: string;
  toolSchema: { type: "object"; properties?: Record<string, unknown>; required?: string[]; [key: string]: unknown };
  prompt: string;
  document?: {
    mediaType: "application/pdf";
    data: string;
    title?: string;
  };
  signal?: AbortSignal;
}

export interface AIStructuredResponse {
  data: unknown;
  provider: string;
  model: string;
  usage?: AIUsage;
}

export interface AIProvider {
  readonly name: string;
  readonly defaultModel: string;
  isConfigured(): boolean;
  generateStructured(request: AIStructuredRequest): Promise<AIStructuredResponse>;
}

export type AIErrorCode = "not-configured" | "timeout" | "provider" | "malformed-output";

export class AIServiceError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}
