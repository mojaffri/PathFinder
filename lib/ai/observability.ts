import type { AIFeature, AIUsage } from "./types";

export interface AICallEvent {
  timestamp: string;
  feature: AIFeature;
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
  retries: number;
  parseFailures: number;
  errorCode?: string;
  usage?: AIUsage;
}

const MAX_EVENTS = 200;
const events: AICallEvent[] = [];

export function recordAICall(event: AICallEvent): void {
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();
  // Metadata only: prompts, responses, resume text, and student answers are never logged.
  if (process.env.NODE_ENV !== "test" && event.provider !== "mock") console.info("[ai-call]", JSON.stringify(event));
}

export function getAICallEvents(): readonly AICallEvent[] {
  return [...events];
}

export function clearAICallEvents(): void {
  events.length = 0;
}
