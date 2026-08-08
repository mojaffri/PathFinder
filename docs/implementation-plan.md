# Implementation plan

## Completed in the current phase

1. Centralize AI provider access and structured-output reliability.
2. Add metadata-only observability, timeouts, retries, and typed failures.
3. Extend assessments with deterministic formats and a strict versioned AI rubric.
4. Persist enriched attempt history and show progress over time.
5. Make mastery recency- and repeat-performance-aware.
6. Add request bounds, endpoint throttling, offline regression tests, and architecture documentation.

## Next priorities

1. Replace local mock auth/storage with authenticated server persistence and ownership enforcement.
2. Add a shared distributed quota/telemetry store and retention policy.
3. Add hybrid per-question grading composition and more deterministic catalog questions.
4. Add artifact-review workflows and reviewer verification for project evidence.
5. Add browser tests for assessment retry, refresh persistence, keyboard flow, and responsive layouts.
6. Feed weak SkillForge concepts into saved-roadmap ordering through an explicit, versioned prioritization adapter.
