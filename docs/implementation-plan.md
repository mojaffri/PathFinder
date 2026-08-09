# PathFinder — Implementation Plan

Phased plan from the current no-backend prototype to the intelligent career-readiness platform described in `CLAUDE.md`. Each phase assumes the previous one is done — do not start Phase 2 domain work on top of `localStorage`; migrate persistence first (Phase 1), or every new domain gets built twice.

For current status, see [`project-state.md`](./project-state.md). For diagrams and schema, see [`architecture.md`](./architecture.md).

---

## Phase 1 — Production Foundation ✅ Complete

**Objective:** replace `localStorage` + mock-auth with a real, secure, tested backend, without changing the product's observable behavior.

**Status:** Done. Summary below; see `docs/project-state.md` for the full current-state writeup and `docs/database.md`/`docs/security.md` for the design this phase actually produced.

**What was built:**
- `lib/db/schema/*.ts` (Drizzle schema, 25 tables), `drizzle/migrations/` (SQL + hand-written RLS policies), `repositories/*.ts` (profile, roadmap, skillforge, career-match, activity).
- Real Supabase Auth: email/password, magic link, Google/GitHub OAuth (the last two work once enabled in the Supabase dashboard, no code changes needed), `proxy.ts` (Next 16's renamed `middleware.ts`) for server-side route protection and session refresh.
- `services/profile-service.ts`/`roadmap-service.ts`/`skillforge-service.ts` rewritten as async `fetch()` wrappers over new `app/api/*` routes, which authorize every request via `getServerUser()` before calling a repository.
- Row Level Security with `FORCE ROW LEVEL SECURITY` on every user-owned table, genuinely enforced against the app's own direct-Postgres connection (not just decorative) — see `docs/security.md` for why `FORCE` specifically matters here and the real test that proves it (`tests/integration/rls-isolation.test.ts`).
- A progressive multi-step onboarding wizard (`/onboarding`), persisting after every step so leaving and returning never loses data.
- Demo mode: a seeded, clearly-labeled showcase account (`scripts/seed-demo.ts`, built entirely from the app's own real engines) and a one-click "Try Demo" button requiring no signup.
- A test runner (Vitest) for the first time — 28 tests: pure unit tests for `lib/skillforge/mastery.ts` and `lib/roadmap/pacing.ts` (the two deterministic engines most directly touched this phase), plus real integration tests against an in-memory Postgres (pglite) covering repository behavior and — the most load-bearing set — RLS user-isolation.
- `.github/workflows/ci.yml`: install → lint → typecheck → unit tests → integration tests → build, on every PR.

**Deliberately deferred, not forgotten:**
- Unit tests for `lib/matching/engine.ts` and `lib/gap-analysis/engine.ts` (the two deterministic engines this phase didn't directly touch) — still zero coverage. Highest-priority test debt for the next session that touches either file.
- `lib/resume/heuristic-extractor.ts`'s output is still never runtime-validated against its own zod schema (asymmetry with the AI path) — unrelated to this phase's scope, carried over from the Phase 0 audit.
- Resume file storage (`resumes.storage_path`) — the column exists, Supabase Storage integration doesn't.
- Job descriptions, applications, GitHub analysis — schema-only (tables + RLS exist), no repository/service/UI layer. Correctly deferred to Phase 2/4 per this plan.

**A real bug this phase caught and fixed:** `education.start_date`/`end_date` (and the equivalent columns on `experience`/`projects`/`awards`/`certifications`) were originally modeled as SQL `date` columns. `tests/integration/profile-repository.test.ts` failed on the very first real insert, because résumés and this app's own forms produce partial dates ("2022-08") that Postgres's `date` type rejects outright — `EducationRecord.startDate` etc. have always been `string | null` in `types/records.ts` for exactly this reason. Fixed by changing those columns to `text`. Documented in `docs/database.md` so the reasoning isn't lost.

---

## Phase 2 — Flagship Intelligence ✅ Complete

**Objective:** the features that make PathFinder more than a form-and-checklist app — job-description-specific fit scoring, evidence-backed skills, and real project analysis.

**Status:** Done, across two sessions. Full current-state writeup: `docs/project-state.md`. Session 2 built résumé upgrade + career-fit scoring + job analysis; session 3 built evidence-backed skills + GitHub integration, closing out everything this phase originally scoped.

**What was built (session 2 — résumé + job analysis):**
- **Resume system upgrade:** DOCX support alongside PDF (`lib/resume/docx-text.ts`, `mammoth`), magic-byte file validation (`lib/resume/file-validation.ts`), real Supabase Storage integration (`lib/supabase/storage.ts`, private bucket, signed-URL downloads), and full version history — every upload is a row (`resumes` table), one marked active per profile, with re-analysis and manual version selection (`components/profile/resume-history.tsx`, `repositories/resume-repository.ts`).
- **Centralized deterministic career-fit scoring:** `lib/matching/career-fit.ts` — a new, additive engine (existing `lib/matching/engine.ts#matchCareers` is untouched, per CLAUDE.md) scoring a student's confirmed profile against a career across seven weighted, explainable components, each carrying its own evidence (`components/discovery/career-fit-panel.tsx`).
- **Job-description analyzer + deterministic job-fit engine:** paste-only (no URL scraping, deliberate scope decision) — `lib/jobs/ai-extractor.ts`/`heuristic-extractor.ts` → `job_descriptions`/`job_requirements` (`repositories/job-repository.ts`) → `lib/jobs/fit-scoring.ts` (requirement-by-requirement matching, six weighted component scores, `prioritizeGaps()`, no LLM in the scoring path) → full UI (`/jobs`, `/jobs/[id]`).

**What was built (session 3 — evidence-backed skills + GitHub integration):**
- **A new cross-cutting evidence/confidence domain** (`types/evidence.ts`, `lib/evidence/confidence.ts`) — distinct from SkillForge's own narrower `SkillEvidence`, connected via SkillForge's assessed mastery as one input. Deterministic, quality-weighted confidence scoring (claimed/assessed/demonstrated/professional dimensions) across five bands (Unverified → Very High). Only manually-added evidence persists (`skill_evidence_records`); everything else recomputes on read. Full design: `docs/evidence-model.md`.
- **GitHub repository analysis** (`lib/github/*`): public username/repo analysis (no auth) and an OAuth-connect path reusing Supabase's *existing* auth architecture (`supabase.auth.linkIdentity`, `read:user` scope only — no second OAuth app). Deterministic detectors for testing/CI/Docker/deployment/database/backend signals from file-tree paths + parsed manifests; stars/forks/commits are metadata only, never a quality signal, per this phase's own explicit instruction. `github_connections`/`github_repos` tables (not `github_projects` as originally sketched below — the actual schema diverged slightly from the early plan once the real design was worked out). Full design: `docs/github-integration.md`.
- **`/projects` — the project analyzer:** profile projects + analyzed GitHub repos, connect/import UI, per-project detail with detected signals/skill evidence/recruiter summary/relevant target roles, and a skill-confidence panel with manual-evidence entry.
- **Job-fit evidence, now clickable:** `RequirementMatch.evidence` upgraded from plain strings to structured, clickable evidence records shared with the confidence engine.

**Deliberately not built (explicitly out of scope both sessions):** the adaptive roadmap/skill-graph (Phase 3). `applications` remains schema-only (Phase 4).

**Major risks (as anticipated, and how they played out):**
- Job-fit scoring needed the same "deterministic where it matters" discipline — held: no LLM anywhere in `fit-scoring.ts`'s or `confidence.ts`'s scoring path.
- GitHub API rate limits — handled via optional `GITHUB_TOKEN` (app-wide) and a connected student's own OAuth token, both purely additive to the unauthenticated 60/hr baseline; `lib/github/client.ts` normalizes rate-limit responses into a structured, UI-friendly error.
- Scope creep — held: no resume-tailoring AI product, no private-repo access (deliberately never requested), no adaptive-scheduling logic pulled in early.

**Tests:** `lib/jobs/fit-scoring.ts`, `lib/evidence/confidence.ts`, and all of `lib/github/*` have real unit coverage (bounds, empty input, the exact task-spec worked examples, mocked GitHub API failures/rate-limits) — see `docs/project-state.md`'s "Tests" section for the full breakdown.

**Definition of done:** met — a student can paste a job description, get a deterministic fit score with clickable evidence, see prioritized gaps, and separately build evidence-backed skill confidence from their profile, projects, and GitHub repos, all visible in one explainable `/projects` view.

---

## Phase 3 — Adaptive System ✅ Complete

**Objective:** a real skill dependency graph with a deterministic scheduler, and an adaptive roadmap engine that recomputes as a student's evidence, assessments, saved jobs, and goals change — without losing completed-work history.

**Status:** Done. Full writeup: `docs/project-state.md`'s "Adaptive Roadmap Engine" section. Design docs: `docs/skill-graph.md`, `docs/roadmap-engine.md`.

**What was actually built** (diverged from the original sketch below in one deliberate way — see "Decisions Made" in `docs/project-state.md`): rather than formalizing *SkillForge's own* `SkillModule.prerequisites` graph, a new, broader, standalone skill graph (`types/skill-graph.ts`, `data/skill-graph.ts#SKILL_GRAPH_NODES`, ~25 curated nodes) was built — SkillForge's 10-module catalog barely has any populated `prerequisites` to formalize (2 of 10 modules), so a graph scoped to SkillForge alone wouldn't have supported the task brief's own worked examples (JS→TS→React→Next.js; SQL→Postgres→ORM→backend persistence; Python→REST→FastAPI→production backend). The new graph optionally links back to a real SkillForge module via `skillForgeModuleId` where one exists.
- `lib/roadmap/skill-graph.ts` — cycle detection and dangling-prerequisite validation at index-build time (`buildSkillGraphIndex`, throws `SkillGraphValidationError`), deterministic topological ordering, unmet-prerequisite/blocked-skill lookups.
- `lib/roadmap/priority.ts` — deterministic, documented weighted-sum priority formula (gap match, saved-job frequency, unblock count, evidence weakness, mastery discount).
- `lib/roadmap/adaptive-generator.ts` + `adaptive-phases.ts` — real dependency-aware task generation (pulls in unmet prerequisites recursively) and depth-based phase grouping.
- `lib/roadmap/scheduler.ts` — a **deterministic** weekly scheduler: topological + priority ordering, greedy weekly bin-packing, impossible-deadline detection with the task brief's own worked-example message format and concrete recommendations. Reuses `lib/roadmap/pacing.ts`'s assumed-default-hours convention rather than inventing new pacing logic, though the actual multi-task bin-packing is necessarily new (pacing.ts only computes single-item durations).
- `lib/roadmap/adaptation.ts` — merges forward by `skillId` so completed/in-progress/skipped status survives every regenerate; a completed skill that drops out of scope is preserved in `completedHistory`, never deleted; produces a deterministic per-trigger change summary.
- `lib/roadmap/saved-job-signals.ts` — personalized saved-job skill-frequency aggregation, always labeled as such.
- Five new DB tables (`adaptive_roadmaps` + 4 children, two genuinely append-only) + `repositories/adaptive-roadmap-repository.ts`, three API routes, `/roadmap` UI.

**Deliberately not built (scope decisions, all documented in `docs/roadmap-engine.md`):** timed/proctored assessments beyond the existing untimed diagnostic/assessment Q&A (out of this session's scope — `assessments`/`assessment_attempts` tables are unchanged); moving `data/*.ts` curated content into the database (not needed yet — the new skill graph, like `data/skillforge-modules.ts`, is still small enough to hand-author); automatic wiring of every `RoadmapChangeTrigger` into every relevant mutation route (3 of 9 triggers are automatic/contextual-UI-wired; the rest work via direct API calls but have no UI entry point yet).

**Major risks (as anticipated, and how they played out):**
- Cycle risk in a hand-authored graph — held: `buildSkillGraphIndex` validates acyclicity and dangling references at build time, with dedicated fixture tests (`tests/unit/skill-graph.test.ts`), not just an informally-correct hand-checked list.
- Scheduler scope creep into a generic project-planning engine — held: `lib/roadmap/scheduler.ts` does exactly one job (weekly bin-packing of a given task list against given capacity/deadline), and doesn't touch or replace `lib/skillforge/next-action.ts`'s per-skill guidance.

**Tests:** 73 new tests across 6 new files — `skill-graph.test.ts` (26), `priority.test.ts` (15), `saved-job-signals.test.ts` (6), `scheduler.test.ts` (11, including the exact impossible-deadline worked example), `adaptation.test.ts` (8, including completed-history preservation across a regenerate), `adaptive-roadmap-repository.test.ts` (6, integration) — plus one new RLS-isolation case. See `docs/project-state.md`'s "Tests" section for the full breakdown.

**Definition of done:** met — the skill graph is validated at load time, not just informally correct; a student sees a real cross-skill weekly schedule with impossible-deadline detection, not just a per-skill next-best-action; completed work and change history survive every recompute.

**Narrative-roadmap quality follow-up:** the original generator/fallback now shares a canonical education-stage strategy across the 46-career catalog, program-variable exam safeguards, career-specific evidence playbooks, and exhaustive career × stage regression checks. This complements the adaptive scheduler rather than replacing it.

---

## Phase 4 — Product Completeness ✅ Complete

**Objective:** the features that make this feel like a product a student would actually keep using over months, not just once.

**Status:** Done in session 5: compact application tracking, saved-job evidence insights, actionable real-data dashboard, recorded-history analytics, structured events, accessibility/responsive/error-state improvements, security hardening, structured observability + Vercel Analytics, and Playwright/axe smoke coverage. See `docs/project-state.md` for the exact verification state and live-infrastructure risks.

**Dependencies:** Phase 1 (persistence for applications/analytics); Phase 2 (job descriptions to attach applications to).

**Expected files/modules affected:**
- New: `app/applications/`, `components/applications/*`, `services/application-service.ts`, `applications` table (already in the Phase 1 ER design).
- New: `lib/analytics/activity.ts` writing to `activity_events`, plus a lightweight analytics view (not third-party tracking — self-hosted event log consistent with the no-external-dependency ethos so far).
- New: observability — structured server-side logging for AI-path failures (today, an AI extraction/generation/grading failure silently falls back with no record of *why*, per the resume-agent's finding in this session's audit; worth at minimum a `console.error` with enough context to debug in Vercel logs, without over-building a full observability stack for a project this size).
- Accessibility pass: no dedicated a11y audit has been done yet (a light spot-check this session found reasonable `aria-label` usage on icon-only controls and no raw `<img>` tags needing alt text, but nothing systematic — run an actual audit, e.g. axe-core in CI, before calling this done).
- Performance: no specific performance risks were found in this audit (no obvious N+1-style localStorage re-reads, no unbounded lists), but a real Postgres backend changes the performance profile entirely (N+1 query risk in repositories, missing indexes) — this phase should include query review once Phase 1's repositories exist.

**Tests required:** E2E tests (Playwright) for the core flows for the first time — Discover → match → Accelerate → roadmap → SkillForge → application tracking, since this is the first phase where the full loop is meant to be used repeatedly over time rather than once.

**Definition of done:** a student can track applications against their roadmap, see basic progress analytics, and the app has at least one automated a11y check and one E2E smoke test in CI.

---

## Phase 5 — Portfolio Polish

**Objective:** make the finished project easy for a recruiter or hiring manager to evaluate quickly and accurately.

**Dependencies:** all prior phases substantially done — polish follows substance, not the other way around.

**Expected files/modules affected:** `README.md`, `docs/*` (ADRs for the decisions in this plan as they're actually made, not just proposed), screenshots/demo assets, `docs/adr/` (new — one file per significant decision: "why Supabase," "why deterministic scoring," "why no test suite existed for so long and how that was fixed").

**Major risks:** polish work has no natural stopping point — timebox it, and prioritize accuracy (the README/docs must never overstate what's built, which was the single biggest issue this audit found and fixed) over exhaustiveness.

**Tests required:** none new — this phase is about presentation of already-tested work.

**Definition of done:** a recruiter can read `README.md` alone and have an accurate, undersold-rather-than-oversold picture of what the app does, verified against the live demo in under five minutes.

---

## Cross-cutting rules for every phase

- Preserve the deterministic-vs-AI boundary (`CLAUDE.md`) — every new scoring/ranking/matching feature (job-fit scoring, skill-graph sequencing) follows the existing pattern: AI parses/interprets unstructured input, deterministic code does the actual scoring.
- Every new persisted entity gets a service-layer function with the same shape as its `localStorage`-era equivalent where one exists, so UI code changes as little as possible when the backend migrates.
- No phase after Phase 1 should write directly to `localStorage` for new features — build against the database from day one.
- Update `docs/project-state.md` at the end of every phase (or meaningful sub-phase); update `CLAUDE.md` only when a durable convention actually changes.
