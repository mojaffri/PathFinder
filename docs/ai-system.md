# AI system

PathFinder centralizes provider access under `lib/ai/`. Product services never instantiate an SDK client directly.

## Architecture

- `AIProvider` is the replaceable provider contract.
- `AnthropicProvider` is the current server-only adapter and is the only code that imports the Anthropic SDK.
- `requestStructuredAI()` applies Zod validation, timeouts, one malformed-output retry, typed errors, and metadata-only telemetry.
- Resume extraction, roadmap narrative generation, and open-response assessment grading use this shared path.

Career matching, gap analysis, roadmap pacing, deterministic assessment items, and mastery calculation do not use AI. The roadmap has a deterministic fallback; resume extraction falls back to the heuristic parser; failed assessment responses remain saved and ungraded.

## Reliability and privacy

Every call has a feature name, bounded output size, AbortSignal timeout, structured tool schema, Zod response schema, and parse retry. Failures are represented by `AIServiceError` codes. Observability records provider, model, latency, success, retries, parse failures, and token usage when supplied. Prompts, resumes, student answers, and generated content are never logged.

API keys are read only inside the server-side Anthropic adapter. AI-heavy routes have in-process rate limits and request-size guards. These controls are suitable for the current single-instance portfolio deployment, not a distributed production system; production should use authenticated users, durable quotas, and a shared rate-limit store.

## Adding or replacing a provider

Implement `AIProvider`, map the provider response to `AIStructuredResponse`, and select it in `lib/ai/provider.ts`. Feature code and fallback behavior should not change.
