# ADR-001: Deterministic scoring

**Status:** Accepted

## Context

Career matches, job fit, readiness, and task priority affect what a user does next. An LLM-generated number would be difficult to reproduce, test, or explain.

## Decision

Implement numerical scoring as explicit TypeScript functions over validated domain records. AI may extract inputs or explain results but cannot assign or override a score.

## Alternatives considered

- LLM-only ranking: flexible, but unstable and opaque.
- Embedding similarity: useful for retrieval, but insufficient for weighted requirements and evidence quality.
- Rules plus an LLM adjustment: rejected because the adjustment would reintroduce untraceable variance.

## Tradeoffs

Weights require deliberate maintenance and curated tests. In exchange, results are reproducible, debuggable, and safe to compare over time.
