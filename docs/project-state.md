# Project state

**Updated:** 2026-08-08

The repository is the source of truth. PathFinder currently includes Discover, Accelerate, deterministic gap analysis, AI/fallback roadmap generation, local profile/roadmap persistence, and a working SkillForge dashboard/detail experience.

## Current phase completed

- SkillForge renders concept summaries, objectives, practice, diagnostic/mastery assessments, projects/evidence, mastery dimensions, next-best actions, readiness warnings, and attempt history.
- Assessment questions support deterministic and AI-assisted formats. Statistics Fundamentals includes a deterministic diagnostic; existing authored responses use rubric-based grading.
- Attempts persist assessment identity, numbering, validated scores, dimensions, weak concepts, feedback, outcome, rubric/provider/model metadata, and ungraded responses.
- Mastery now uses recent repeated performance instead of the historical maximum score.
- All Anthropic SDK usage is centralized in `AnthropicProvider`; three product features use the shared structured-output service.
- AI calls have timeouts, malformed-output retries, typed failures, Zod validation, metadata-only observability, fallback behavior, endpoint rate limiting, and request-size guards.
- Offline tests cover deterministic grading, mastery signals, provider abstraction, malformed retry, timeout, and missing-provider fallback.
- Resume normalization restores section headings that PDF extraction appends to the previous line, and the heuristic parser splits dateless projects using title/repository/bullet boundaries so each project retains only its own description.
- Skill detail pages now present a five-stage Diagnose â†’ Learn â†’ Practice â†’ Build â†’ Prove flow instead of displaying every activity at once. Python engineering diagnostics and mastery checks use accessible, deterministic multiple-choice cards; project evidence remains a separate mastery signal.

## Known limitations

- Authentication and persistence are browser-local mocks. Server routes therefore cannot verify user ownership yet.
- Rate limits and AI telemetry are in memory and reset per process; use Redis/database-backed controls for multi-instance production.
- Attempt history is local to one browser and is not portable across devices.
- There is no sandboxed code execution; code-output grading is answer matching only.
- Hybrid assessments containing deterministic and AI questions in one submission currently use AI grading for the whole set; deterministic-only sets bypass AI.
- Catalog coverage is still uneven: the Python engineering and statistics modules have deterministic checks, while several other modules still use authored open responses pending a broader content pass.
- No live Anthropic calls run in tests.
