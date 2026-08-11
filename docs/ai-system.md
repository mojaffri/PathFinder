# AI system

PathFinder centralizes provider access under `lib/ai/`. Product services never instantiate an SDK client directly.

## Architecture

- `AIProvider` is the replaceable provider contract.
- `AnthropicProvider` is the current server-only adapter and is the only code that imports the Anthropic SDK. It prefers a direct `ANTHROPIC_API_KEY`; otherwise it uses Vercel AI Gateway with `AI_GATEWAY_API_KEY` or the deployment's automatic short-lived `VERCEL_OIDC_TOKEN`.
- `requestStructuredAI()` applies Zod validation, timeouts, one malformed-output retry, typed errors, and metadata-only telemetry.
- Resume extraction, roadmap narrative generation, and any future open-response assessment grading use this shared path. The current SkillForge catalog is fixed-choice and deterministic.

Career matching, gap analysis, roadmap pacing, current assessment items, and mastery calculation do not use AI. The roadmap has a deterministic fallback and text-based resume extraction falls back to the heuristic parser.

For PDFs, `AIStructuredRequest.document` can carry the original validated PDF as a server-only base64 document block. This preserves visual columns and allows the provider to read scanned/image-only resumes whose PDF text layer is empty. DOCX continues through text extraction. The document bytes are bounded by the same 8 MB upload limit and are never included in logs.

## Reliability and privacy

Every call has a feature name, bounded output size, AbortSignal timeout, structured tool schema, Zod response schema, and parse retry. Failures are represented by `AIServiceError` codes. Observability records provider, model, latency, success, retries, parse failures, and token usage when supplied. Prompts, resumes, student answers, and generated content are never logged.

Provider credentials are read only inside the server-side Anthropic adapter. Production normally uses Vercel's short-lived OIDC token rather than a stored model-provider key. AI-heavy routes require a verified user, enforce request-size guards, and consume atomic per-profile limits stored in Postgres before calling the provider. This protects authenticated usage across serverless instances; pre-auth/IP abuse still belongs at the platform firewall layer.

## Adding or replacing a provider

Implement `AIProvider`, map the provider response to `AIStructuredResponse`, and select it in `lib/ai/provider.ts`. Feature code and fallback behavior should not change.
