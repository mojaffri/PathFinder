# Project state

**Updated:** 2026-08-09

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
- AI and heuristic results now share a defensive record-normalization pass. Orphan action sentences are merged into the preceding project, inline URLs move out of titles into that project's description, repeated bullets are removed, more common resume section names are recognized, and project summaries are visible/editable in review.
- Skill detail pages now present a five-stage Diagnose â†’ Learn â†’ Practice â†’ Build â†’ Prove flow instead of displaying every activity at once. Python engineering diagnostics and mastery checks use accessible, deterministic multiple-choice cards; project evidence remains a separate mastery signal.
- Roadmaps now use a canonical strategy for all 13 education stages, grouped into high school, early/late college, graduate school, alternative training, post-college transition, career change, and unknown-stage recovery. Experience campaigns, credential timing, project scope, and application strategy change with the learner's actual position.
- All 46 supported careers have specific playbooks. Plans first close readiness gaps, then deliberately build a hard-to-copy selection signal through real work, external review, and revision rather than generic certificates or tutorial completion.
- Program-variable exams are verification-first. The retired PCAT was removed; GRE advice for robotics, PA, physical therapy, and physical sciences no longer assumes every target program requires it.
- Timeline labels now use actual hour estimates and weekly availability without overstating one-month phases. Top moves are priority-ordered rather than falsely promised as one-month tasks.
- Target-resume benchmarks now distinguish clinical, legal, research, humanities/policy, and conventional internship/project evidence.
- Regression coverage exhaustively exercises 46 careers across all 13 stages (598 combinations), including evidence quality, action-hour integrity, stage safeguards, program-dependent exams, competitive differentiation, and contiguous timelines.

## Known limitations

- Authentication and persistence are browser-local mocks. Server routes therefore cannot verify user ownership yet.
- Rate limits and AI telemetry are in memory and reset per process; use Redis/database-backed controls for multi-instance production.
- Attempt history is local to one browser and is not portable across devices.
- There is no sandboxed code execution; code-output grading is answer matching only.
- Hybrid assessments containing deterministic and AI questions in one submission currently use AI grading for the whole set; deterministic-only sets bypass AI.
- Catalog coverage is still uneven: the Python engineering and statistics modules have deterministic checks, while several other modules still use authored open responses pending a broader content pass.
- No live Anthropic calls run in tests.
- Career guidance is curated rather than connected to live labor-market or admissions feeds. Program requirements, licensing rules, and recruiting dates still require verification against official sources before acting.
