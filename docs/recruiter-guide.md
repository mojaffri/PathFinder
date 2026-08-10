# Recruiter evaluation guide

This guide is a compact map of what to inspect and what engineering decisions to ask about.

## Five-minute demo

1. Open the [live site](https://path-finder-umber.vercel.app/) and choose **Try the demo**.
2. On **Dashboard**, note the target role, 62% seeded readiness, scheduled tasks, saved-job-only gaps, evidence-backed skills, and recorded activity.
3. Open **Workspace → Job Fit** and inspect one saved job's required/preferred requirements and evidence-backed match details.
4. Open **Workspace → Projects** to see deterministic GitHub signals and the evidence ledger behind skills.
5. Open **Plan** to inspect dependencies, priority, effort, feasibility, and dates.
6. Open **SkillForge** to inspect assessment history and multidimensional mastery.
7. Open **Progress** for real event-backed longitudinal analytics.
8. Open **Workspace → Applications** for the focused nine-stage pipeline.

Demo records are labeled. The account is shared and may be reset; do not enter personal data.

## Architecture in one minute

- Next.js App Router presents server-rendered pages with focused client components for interactive workflows.
- Supabase Auth verifies identity; protected API routes never trust a client user ID.
- Drizzle repositories are the exclusive database boundary.
- Each repository operation runs in a user-scoped transaction, and forced RLS is the backstop against an omitted ownership predicate.
- AI handles unstructured extraction and subjective feedback behind a validated provider boundary.
- Deterministic domain engines own scoring, evidence confidence, mastery, roadmap dependencies, feasibility, and scheduling.

## Strong interview talking points

### Architecture

“I separated probabilistic interpretation from deterministic decisions. Route handlers authenticate and validate, domain services compute, repositories persist, and forced RLS protects user isolation even if an application query is wrong.”

### Hardest technical problem

“The hardest part was making evidence flow coherently across resumes, projects, GitHub analysis, assessments, job requirements, and roadmap priority without turning the LLM into the source of truth. The solution was a shared evidence record, deterministic confidence bands, and persisted snapshots/events where historical truth matters.”

### Deterministic versus AI tradeoff

“AI is valuable for variable prose and written feedback. It is a poor fit for numbers a user expects to reproduce. I validate structured output with Zod, then compute scores independently. Every essential AI path either has a conservative deterministic fallback or a typed unavailable state.”

### Database design

“Postgres fits the ownership graph and point-in-time snapshots. I normalized records that need querying—requirements, attempts, applications, events—and kept narrative output in JSONB where relational queries add no value. Drizzle owns migrations; Supabase owns identity.”

### Roadmap algorithm

“Task candidates come from actual gaps and recurring saved-job requirements. Priority combines severity, frequency, confidence, and dependencies. A deterministic scheduler applies prerequisites, effort, weekly capacity, and the target date, and reports infeasible plans rather than inventing capacity.”

### Skill evidence model

“A keyword claim is not equivalent to an assessment or project. The model keeps claimed, assessed, demonstrated, and professional dimensions separate, weights strength and verification, and recomputes confidence from addressable source records.”

### Security

“Authentication and authorization are separate. Every route verifies the Supabase user; repositories scope data; forced RLS provides defense in depth. Uploads validate size, MIME/extension, and magic bytes. OAuth tokens are encrypted at rest, AI routes are rate-limited in Postgres, and account deletion includes private Storage objects.”

### Testing

“Pure domain logic has deterministic unit tests. Repository and RLS behavior runs against embedded Postgres with the real migrations and a non-superuser role. Playwright checks desktop/mobile journeys and axe accessibility without requiring paid AI calls.”

### What I would build next

“First, isolate demo data per visitor. Second, add production error tracing and alerting beyond structured logs. Third, add direct property-style tests for the legacy gap-analysis engine before evolving its weights.”

## Resume bullets

- Built a full-stack career-readiness platform with Next.js 16, TypeScript, Supabase Auth/Postgres/Storage, and Drizzle across 34 application tables and 11 versioned migrations.
- Designed deterministic career and job-fit engines with requirement-level evidence, plus a 46-career catalog validated across 13 education stages (598 career/stage combinations).
- Implemented a validated AI boundary for resume/job extraction, roadmap narrative, and written assessment feedback using Zod schemas, timeouts, retry handling, and deterministic fallbacks.
- Developed an evidence-confidence model spanning claimed, assessed, demonstrated, and professional signals, including seven reproducible GitHub file-tree/manifest detectors that exclude popularity metrics from scoring.
- Built a dependency-aware adaptive roadmap scheduler that combines skill gaps, saved-job frequency, evidence confidence, weekly capacity, and target dates while preserving completion history.
- Established CI with strict lint/type checks, 224 passing tests (including 39 embedded-Postgres integration tests), production builds, and desktop/mobile Playwright accessibility and demo-journey coverage.

## Honest limitations

- The demo is one shared mutable account rather than an isolated sandbox per visitor.
- GitHub analysis detects repository structure and manifests, not code correctness or test quality.
- Heuristic extraction is conservative when no AI key is present.
- Structured logs and Vercel Analytics exist; dedicated exception tracing/alerting is not yet integrated.
- The product offers decision support, not a hiring-outcome prediction or global labor-market dataset.
