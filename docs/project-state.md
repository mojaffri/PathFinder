# PathFinder — Project State

Read this after [`CLAUDE.md`](../CLAUDE.md) and before touching code. This file describes what's actually true right now; `CLAUDE.md` describes durable rules that don't change week to week. See also [`architecture.md`](./architecture.md) (diagrams), [`database.md`](./database.md) (schema), [`security.md`](./security.md) (auth/RLS model), and [`implementation-plan.md`](./implementation-plan.md) (phased roadmap).

## Last Updated

2026-08-09 (session 7) — Approved navigation consolidation: the wide-desktop header now keeps Discover, Accelerate, SkillForge, Plan, Dashboard, and Progress visible while Projects, Job Fit, Applications, and Saved live in one descriptive Workspace disclosure. The disclosure has explicit expanded state, current-route highlighting, outside-click/focus dismissal, Escape-to-close with focus restoration, and four direct links. Tablet and mobile widths now use the fully labeled navigation panel instead of an ambiguous icon-only header, with Workspace presented as a distinct section. Playwright covers the desktop disclosure, Escape behavior, navigation, and mobile Workspace visibility.

2026-08-09 (session 6) — Production auth-degradation and brand polish: the supplied PathFinder logo is now the persistent product mark in the responsive navbar and authentication surfaces; public pages remain useful when Supabase is unavailable; protected routes redirect to a calm, actionable sign-in-unavailable screen instead of rendering raw `401 Not authenticated` API failures; login/signup no longer expose environment-variable or repository instructions; and the landing-page demo CTA no longer invites users into a demo that cannot work without Supabase. Protected-route matching was extracted and regression-tested with exact path-boundary checks. The top-level navigation inventory is intentionally unchanged pending explicit product-owner approval for consolidation.

2026-08-09 (session 5) — Phase 4 product completeness: a compact nine-stage application pipeline, personalized saved-job requirement/evidence insights, a real-data main dashboard, longitudinal `/analytics`, expanded structured activity events, persistent per-user throttling on AI-cost routes, safe redirect handling, structured Vercel logs via Next instrumentation, Vercel page analytics, security headers, responsive/accessibility fixes, global error recovery, and Playwright + axe smoke coverage. The release also reconciles the remote SkillForge reliability work: a structured AI provider with timeout/retry/metadata, trusted server-side assessment catalogs, deterministic grading where possible, request-size limits, and recency/consistency-aware mastery signals. Next.js was upgraded from 16.2.11 to 16.3.0 to clear every production `npm audit` finding. Migrations `0009`/`0010` and the new repository/service/API/UI surfaces are described below.

2026-08-08 (session 4) — Phase 3, the adaptive, evidence-aware roadmap engine, built this session: a curated skill dependency graph with cycle detection (`data/skill-graph.ts`, `lib/roadmap/skill-graph.ts`), a deterministic priority formula (`lib/roadmap/priority.ts`), real dependency-aware task generation (`lib/roadmap/adaptive-generator.ts`), a deterministic weekly scheduler with impossible-deadline detection (`lib/roadmap/scheduler.ts`), adaptive recomputation that preserves completed-task history (`lib/roadmap/adaptation.ts`), saved-job skill-frequency aggregation (`lib/roadmap/saved-job-signals.ts`), five new append-history-aware DB tables + repository (`repositories/adaptive-roadmap-repository.ts`), three API routes, and a full `/roadmap` UI. See "Adaptive Roadmap Engine" below and `docs/skill-graph.md`/`docs/roadmap-engine.md` for the full design. This supersedes session 3's checkpoint (evidence-backed skills + GitHub integration), which is otherwise unchanged and summarized below.

2026-08-08 (session 3) — Evidence-backed skills + GitHub integration built this session, finishing the rest of Phase 2: a new cross-cutting `SkillEvidenceRecord`/`SkillConfidenceScore` domain model with a deterministic, quality-weighted (not count-based) confidence engine; GitHub repository analysis (deterministic detectors for testing/CI/Docker/database/backend signals, never stars/forks/commits) via both a public-username/repo path (no auth) and an OAuth-connect path reusing Supabase's existing GitHub sign-in provider (`supabase.auth.linkIdentity`, no separate OAuth app); a `/projects` project-analyzer page; and the job-fit engine's `RequirementMatch.evidence` upgraded from plain strings to the same structured, clickable evidence records. This supersedes session 2's checkpoint (résumé upgrade + career-fit engine + job analysis), which is otherwise unchanged and summarized below.

---

## Current Architecture

See [`architecture.md`](./architecture.md) for the full diagram. Summary:

```
UI (client components)
  → services/*.ts (fetch wrappers)
    → app/api/*/route.ts (authorizes via getServerUser(), then calls a repository)
      → repositories/*.ts (owns Drizzle, scopes every query to the caller's own data)
        → lib/db/with-user-context.ts (sets request.jwt.claim.sub, opens a transaction)
          → Postgres (Supabase), protected by FORCE ROW LEVEL SECURITY as a backstop
```

The deterministic domain engines remain explainable and storage-agnostic. SkillForge mastery received one deliberate extension during remote-history reconciliation: recent graded attempts are weighted more strongly and inconsistent results reduce confidence; the scoring remains deterministic and regression-tested.

`proxy.ts` (not `middleware.ts` — Next.js 16 renamed the file convention; see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`) refreshes the Supabase session on every request and server-side redirects unauthenticated visitors away from protected routes. When Supabase is not configured, the same guard keeps public pages available and redirects protected pages to a user-facing service-unavailable state; private pages never fall through to raw API errors.

---

## Implemented Features

**New this session — cohesive product layer (Phase 4):**

- **Application tracker:** `types/application.ts` → `applications` (expanded by migration `0009`) → `repositories/application-repository.ts` → `/api/applications` → `/applications`. It intentionally stops at company/title/posting/source/fit/date/stage/interview dates/notes/gap snapshot; there are no contacts, email sequences, or generic CRM workflows. Stage changes append structured events.
- **Saved-job insights:** `lib/jobs/saved-job-insights.ts` deterministically aggregates required/preferred frequency over only the signed-in user's saved postings and joins it to the existing evidence-confidence engine. Every UI label explicitly says this is personalized saved-job data, not labor-market research.
- **Dashboard and analytics:** `/api/analytics/overview` batches persisted roadmap, assessment, application, job-fit, evidence, and activity data. `/dashboard` is now an actionable command center; `/analytics` displays only recorded history and explicitly refuses synthetic backfill. Demo data is labeled wherever shown.
- **Security/observability:** authenticated, database-backed rate limits protect resume/job/roadmap/assessment AI paths; auth redirects are same-origin paths only; `instrumentation.ts` and `lib/observability/logger.ts` emit structured, document-free server errors; Vercel Analytics measures page traffic; security headers deny framing/sniffing and restrict browser capabilities.
- **Product quality:** skip link, `aria-current`, mobile-nav state, reduced-motion support, responsive requirement editing and pipeline overflow, global error/not-found states, desktop/mobile Playwright smoke tests, and axe WCAG A/AA checks. The demo seed now computes saved jobs, fit snapshots, an application, and the adaptive roadmap through real engines/repositories.
- **Resume and roadmap quality reconciliation:** AI and heuristic resume output now share defensive record normalization before validation/persistence. The narrative roadmap is education-stage-aware across all 46 careers, uses program-verification safeguards for variable admissions requirements, favors externally reviewable evidence over generic activity, and has exhaustive career/stage regression coverage. System fonts remove an external build-time font dependency while preserving the accessibility and analytics layout additions.

**Everything from Phase 1, 2, and session 3 still works**, unchanged: Discover, Accelerate, narrative roadmap generation, SkillForge's full guided-freedom loop, real accounts/auth, onboarding, demo mode, resume upgrade, career-fit scoring, job analysis, evidence-backed skills, GitHub integration. See `docs/architecture.md` §1 and the session summaries further down.

**New this session — the adaptive roadmap engine (Phase 3):** see "Adaptive Roadmap Engine" below for the full writeup.

**New this session — evidence-backed skills + GitHub integration:**

- **A new cross-cutting evidence/confidence domain**, distinct from SkillForge's own narrower `SkillEvidence`/`skill_evidence` (a manual link attached to one curated `SkillModule`'s progress — unchanged, still exists). `types/evidence.ts#SkillEvidenceRecord`/`SkillConfidenceScore` answer a broader question — for ANY named skill, how much should this be trusted — pulling together profile skill tags (claimed), experience/certifications (professional), projects + GitHub-analyzed repos (demonstrated), and SkillForge's own assessed mastery (assessed). `lib/evidence/confidence.ts#computeSkillConfidence` is deterministic and quality-weighted: a bare self-claim alone caps at "Unverified," reaching "Very High" requires ≥3 of the 4 dimensions to be independently strong, not just a high weighted average. Only manually-added evidence is persisted (`skill_evidence_records`); everything else is recomputed fresh from data that already exists (profile, SkillForge progress, GitHub repos), same "never store what's cheap to recompute" convention as `topMoves`. Full design + the exact worked example from the task spec: `docs/evidence-model.md`.
- **GitHub repository analysis**, two fully-real paths (`lib/github/*`): (1) any public username/owner-repo, no auth required — the primary path; (2) "Connect GitHub," which reuses the app's *existing* Supabase Auth architecture (`supabase.auth.linkIdentity({ provider: "github", scopes: "read:user" })`, captured in `app/auth/callback/route.ts`) rather than standing up a second OAuth app — buys a higher rate limit and a "pick from my own repos" picker, never broader data access (only `read:user` scope, never `repo`). Deterministic detectors (`lib/github/detectors.ts`) check file-tree paths + a handful of parsed manifest files (`package.json`, `requirements.txt`, etc. — `lib/github/manifest-parse.ts`) for testing/CI/Docker/deployment/database/backend-framework signals; language mix comes from GitHub's own `/languages` endpoint. **Stars, forks, and commit counts are shown as metadata only and never feed a signal's confidence or a skill's evidence strength**, per the task's explicit instruction. `lib/github/narrative.ts` is the one AI call in the pipeline (a one-sentence recruiter-style summary of already-computed facts, never inventing a new one) with a deterministic template fallback. Full design: `docs/github-integration.md`.
- **`/projects` — the project analyzer.** Lists profile projects + analyzed GitHub repos, a GitHub connect/import panel, per-project detail (`/projects/[id]`: stack, detected engineering signals, skill evidence with strength + reason, a recruiter-style summary, relevant target roles), and a "Skill confidence" section listing every tracked skill's confidence band with its full evidence ledger, expandable, plus a form to add manual evidence. `ProjectRecord` gained a real `githubUrl` field (the `projects.github_url` column existed since Phase 1 but was never wired through the domain type/repository — now it is), linking a resume project entry to its GitHub analysis.
- **Job-fit evidence, now clickable.** `RequirementMatch.evidence` changed from `string[]` to the same `SkillEvidenceRecord[]` shape the confidence engine uses (`lib/jobs/fit-scoring.ts` now calls `gatherEvidenceForSkill()` instead of maintaining its own separate text-matching logic) — a requirement match backed by a project links straight to `/projects/{id}` in `components/jobs/job-fit-results.tsx`, and every piece of evidence shows its real strength/explanation instead of a plain label.

**Session 2 (Phase 2, part 1 — résumé + job analysis):**

- **Resume system upgrade.** DOCX support alongside PDF (`lib/resume/docx-text.ts`, via `mammoth`), layered file validation (`lib/resume/file-validation.ts`: size cap → extension/MIME check → **magic-byte verification**, closing a Phase-1 known gap — a mislabeled/renamed file is now rejected instead of failing downstream), real Supabase Storage integration (`lib/supabase/storage.ts` — private `resumes` bucket, auto-created on first upload, signed-URL downloads only through an ownership-checked route), and full version history: every upload is its own row, one marked active per profile (enforced by a partial unique index), with manual "set active," delete, and re-analysis (re-running extraction against already-stored text without re-uploading) — `components/profile/resume-history.tsx`, `repositories/resume-repository.ts`. `/api/resume` now requires a signed-in session (previously anonymous/stateless).
- **Centralized deterministic career-fit scoring.** `lib/matching/career-fit.ts` — a new, purely additive engine (the existing `lib/matching/engine.ts#matchCareers`, which scores the Discover questionnaire's preference answers, is **untouched** per CLAUDE.md's "not casually rewritten" rule). This one scores a student's full *confirmed profile* — skills, experience, education, projects, certifications, work preferences — against a specific career across seven weighted, independently-evidenced components (skill match, experience match, education match, project evidence, interest alignment, preference alignment, role-specific/certification requirements), producing an overall score, strengths, gaps, and a deterministic (non-AI) explanation string. Surfaced as an expandable "Profile fit breakdown" panel on each Discover result card (`components/discovery/career-fit-panel.tsx`) once a profile exists.
- **Job-description analyzer.** Paste-only by design (no URL scraping — kept out per the task's own "don't make brittle scraping a core requirement" guidance). `lib/jobs/ai-extractor.ts` (AI, tool-use + zod, **retries once** on a schema-invalid response before falling back — same contract now shared with the resume AI extractor) with `lib/jobs/heuristic-extractor.ts` as the guaranteed no-AI-key fallback (section-header + keyword-based, classifies required-vs-preferred by which heading a line falls under). Persists to `job_descriptions` (title/company/experience-years/education requirement/responsibilities/keywords) + `job_requirements` (one normalized, individually editable row per skill/tool/experience/education item) — `repositories/job-repository.ts`.
- **Deterministic job-fit engine.** `lib/jobs/fit-scoring.ts` — requirement-by-requirement matching (strong/partial/missing + confidence + evidence + gap explanation) against the profile's skills/experience/education/projects text, six weighted component scores (required-skill coverage, preferred-skill coverage, experience match, education match, evidence strength, project relevance), and `prioritizeGaps()` ranking the highest-leverage improvements (required-missing outranks preferred-partial, etc.). No LLM anywhere in this file. Every "run fit analysis" is persisted as a new `job_matches` snapshot (not recomputed-only), so a student can compare fit before/after building evidence for a gap.
- **Full UI flow.** `/jobs` (paste a posting → saved list) and `/jobs/[id]` (edit extracted title/company/requirements/responsibilities/keywords → "Run fit analysis" → overall score + component bars + full requirement match matrix + prioritized recommendations) — `components/jobs/*`. Added to the navbar and to `proxy.ts`'s protected-route list.

- **Real accounts.** Email/password, magic link, and Google/GitHub OAuth (the OAuth providers work the moment they're enabled in the Supabase dashboard — no code changes needed, since the buttons already call `supabase.auth.signInWithOAuth`). `app/login`, `app/signup`, `app/auth/callback`.
- **Server-enforced route protection.** `proxy.ts` redirects unauthenticated requests to `/dashboard`, `/accelerate`, `/skillforge`, `/profile`, `/saved`, `/onboarding` to `/login` — enforced before any page renders, not just hidden client-side.
- **Progressive onboarding** (`/onboarding`, `components/onboarding/onboarding-flow.tsx`) — 5 steps (basics, education, target career, skills & interests, logistics), each persisted immediately on "Continue" so leaving mid-flow and coming back never loses data. Captures three genuinely new profile fields (`preferredLocations`, `employmentPreference`, `targetDate`) alongside everything the existing `StudentProfile` shape already had. `Accelerate`'s manual/resume flow also marks onboarding complete on finish, so a student who skips the wizard and goes straight to Accelerate isn't nagged to "resume onboarding" afterward.
- **Account deletion.** `app/api/account/route.ts` uses the Supabase service-role admin client to delete the auth user outright, cascading through every table via FK. Distinct from `deleteProfile()` (clears data, keeps the account signed in).
- **Demo mode.** A "Try Demo" button on the landing page (`components/landing/try-demo-button.tsx`) signs the browser into a shared, clearly-labeled (`isDemo` flag, visible badge + dashboard banner) showcase account with realistic seeded data — no signup required. `scripts/seed-demo.ts` builds that data entirely through the app's own real engines (`matchCareers`, `analyzeGaps`, `generateFallbackRoadmap`), not hand-written copy.
- **A test runner, for the first time.** Vitest, 28 tests across 4 files — see "Tests" below.
- **CI.** `.github/workflows/ci.yml` — install → lint → typecheck → unit tests → integration tests → build, on every PR.

---

## Persistence

**Supabase Postgres**, schema owned by Drizzle (`lib/db/schema/*.ts`, 36 tables: the prior 35 plus `api_usage_windows`; `applications` was expanded from its Phase-1 placeholder into the live Phase-4 tracker). `localStorage` is not used anywhere in the app. Full schema and migration history: [`database.md`](./database.md).

Key structural decisions:
- `profiles.user_id` references Supabase's own `auth.users` — there is no separate app-level `users` table.
- `careers` and `skill_modules` are seeded JSONB reference tables (`npm run db:seed:reference`), not normalized.
- Every résumé-style date field (`education.start_date`, etc.) is `text`, not SQL `date` — a real bug caught by Phase 1's own tests (see "Bugs Fixed" in the Phase 1 summary below).
- `applications` is fully implemented and RLS-protected; `api_usage_windows` is a small per-profile operational table for atomic serverless-safe throttling.
- `skill_evidence_records` stores **only manually-added** evidence — every auto-derived piece (from the profile, SkillForge progress, or an analyzed GitHub repo) is recomputed on read, never persisted redundantly. See `docs/evidence-model.md`.

---

## Authentication

Real Supabase Auth. See [`security.md`](./security.md) for the full model — the one detail worth restating here because it's easy to get wrong when extending this code: **the app talks to Postgres directly via Drizzle, not through Supabase's PostgREST API**, so RLS policies only actually apply because (a) they're declared with `FORCE ROW LEVEL SECURITY` and (b) `lib/db/with-user-context.ts` manually sets the `request.jwt.claim.sub` session variable that PostgREST would otherwise have set automatically from the caller's verified JWT. Getting either of those wrong makes RLS silently decorative. A real test proves it isn't: `tests/integration/rls-isolation.test.ts`.

---

## AI Integration

Resume extraction, roadmap generation, and open-response SkillForge grading now share the typed provider/structured-output layer in `lib/ai/`, including timeout, retry, zod validation, redacted observability metadata, and typed failures. Fixed-choice assessment questions are graded deterministically from the trusted server catalog. Resume and roadmap retain heuristic/deterministic fallbacks; open responses persist even when grading is unavailable. Live Anthropic behavior was not exercised locally because no API key is configured.

---

## Career Matching

`lib/matching/engine.ts#matchCareers` (questionnaire-preference-based, Discover) is **unchanged**, and now has unit test coverage for the first time (`tests/unit/matching-engine.test.ts`) — the test-debt item flagged at the end of Phase 1 is closed. Demo mode's seeded career matches still come from calling this real engine with a synthetic-but-coherent questionnaire answer set.

**New this session:** `lib/matching/career-fit.ts#computeCareerFitBreakdown` — a second, additive deterministic engine that scores a student's *confirmed profile* (not questionnaire answers) against a specific career, with seven weighted components, per-component evidence, strengths/gaps, and a deterministic explanation string. See "Implemented Features" above and `tests/unit/career-fit.test.ts`. `lib/matching/evidence.ts` holds small fuzzy-text-matching helpers shared by this engine and `lib/jobs/fit-scoring.ts` — deliberately **not** merged into `lib/gap-analysis/engine.ts`'s own private copies of the same logic, since that file is flagged as not to be casually restructured.

---

## Resume System

Substantially rebuilt this session — see "Implemented Features" above for the full list (DOCX support, magic-byte validation, Supabase Storage, version history/re-analysis/active-selection). Pipeline is now `app/api/resume/route.ts` → `lib/resume/file-validation.ts` → `lib/resume/{pdf-text,docx-text}.ts` → `lib/resume/text-normalize.ts` → `lib/resume/{ai-extractor,heuristic-extractor}.ts` → `lib/resume/validate-extraction.ts` (new — runtime-validates whichever path's output against `ResumeExtractionSchema` before it's ever persisted or returned, closing the "heuristic extractor output isn't runtime-validated" known issue) → `repositories/resume-repository.ts` (persists + uploads to storage) → review UI. The AI extractor now retries once on a schema-invalid tool response before falling back to heuristic, matching the pattern established for job-description extraction.

---

## Job Analysis (new this session)

Paste-a-job-description → structured requirements → deterministic fit score, the second flagship recruiter-visible workflow alongside resume/career matching. Pipeline: `app/api/jobs/route.ts` (paste, min/max length validated) → `lib/jobs/ai-extractor.ts` (AI, zod-validated, retries once on malformed) or `lib/jobs/heuristic-extractor.ts` (section-header + keyword based fallback) → `repositories/job-repository.ts` (persists `job_descriptions` + normalized, individually editable `job_requirements` rows) → review/edit UI (`components/jobs/job-detail-view.tsx`) → `app/api/jobs/[id]/match/route.ts` runs `lib/jobs/fit-scoring.ts#computeJobFitAnalysis` (deterministic — requirement-level match status/confidence/evidence/gap + six component scores + prioritized recommendations) against the caller's profile and the active resume (if any), persisting the result as a `job_matches` snapshot. `GET /api/jobs/[id]/match` returns match history for before/after comparison.

**Known simplification:** `estimateYearsOfExperience()` in `fit-scoring.ts` parses years from free-text resume dates on a best-effort basis (unparseable entries count as ~6 months rather than 0) — this is inherently approximate given `experience.startDate`/`endDate` are free text, not structured dates (see `docs/database.md`'s note on why those columns are `text`). Good enough to rank/bucket a requirement match, not represented as an exact figure anywhere in the UI.

---

## Evidence-Backed Skills (new this session)

`types/evidence.ts` + `lib/evidence/confidence.ts` — see "Implemented Features" above for the summary and `docs/evidence-model.md` for the full design, formula, and worked example. Key implementation notes for a future session:
- `lib/evidence/build-context.ts#buildSkillConfidenceContext(userId)` is the one place that composes profile + SkillForge progress + GitHub repos + manual evidence into the shape `computeSkillConfidence`/`gatherEvidenceForSkill` need — both `app/api/skills/confidence/route.ts` and `app/api/jobs/[id]/match/route.ts` call it, so a skill's confidence report and a job requirement's evidence always agree.
- `lib/evidence/confidence.ts`'s dimension→source-type mapping is fixed: `resume`→claimed, `experience`/`certification`→professional, `project`/`github_repo`/`coursework`/`publication`→demonstrated, `assessment`→assessed (SkillForge). Weights (claimed 10, assessed 30, demonstrated 35, professional 25) and the "Very High" gate (≥88 score AND ≥3 of the 3 non-claimed dimensions independently ≥70) are documented, not just tuned in code — see `docs/evidence-model.md`.
- Naming collision avoided deliberately: this session's `SkillConfidenceLevel` (`unverified`/`low`/`moderate`/`high`/`very-high`) is a different type from `types/skillforge.ts`'s existing `ConfidenceLevel` (`low`/`medium`/`high`, a SkillForge *dimension*-trust concept) — do not conflate them.

---

## GitHub Integration (new this session)

See `docs/github-integration.md` for the full design (detectors, rate-limit/failure handling, token security). Summary of what's real vs. what's env-gated:
- **Public username/repo analysis works with zero configuration** — unauthenticated GitHub API calls, capped at 60 req/hr. Fully tested (`tests/unit/github-client.test.ts`, `github-detectors.test.ts`, `github-analyze-repo.test.ts`, `github-detectors.test.ts` for manifest parsing + skill mapping).
- **`GITHUB_TOKEN`** (optional): raises the app-wide rate limit to 5,000/hr. Not configured in this local environment — not live-verified this session.
- **"Connect GitHub"** (optional, two-layer gate): requires (a) GitHub enabled as a Supabase Auth provider (same one-time dashboard step "Continue with GitHub" sign-in already needed) and (b) `GITHUB_TOKEN_ENCRYPTION_KEY` set for the resulting token to actually persist. Neither is configured locally — the connect button, `linkIdentity` call, and `app/auth/callback/route.ts`'s token-capture code are all real and typechecked/built, but **not live-verified against a real Supabase GitHub OAuth flow this session**, same "structurally real, not live-tested" caveat Phase 1 carried for Supabase itself.

---

## SkillForge

Domain logic and UI unchanged (see `architecture.md` §1). Persistence is now `skill_progress`/`assessment_attempts`/`skill_evidence` tables instead of one `SkillForgeState` blob. Its own `SkillEvidence`/`skill_evidence` (a manual link to one curated module's progress) is **unrelated to** and **unchanged by** this session's new cross-cutting evidence/confidence domain — see "Evidence-Backed Skills" above for exactly how they differ and connect (SkillForge's assessed mastery is one INPUT to a skill's confidence score, not merged into it). Notable repository-layer decision: `lib/skillforge/mastery.ts` now exports `recomputeMastery()` and `freshProgress()` (moved out of the old `services/skillforge-service.ts`, which no longer exists in that form) specifically so they stay pure/storage-agnostic and reusable — both the repository and the new unit tests (`tests/unit/mastery.test.ts`) import them directly. The "no fake progress" invariant was re-verified by tests this session, not just by reading, for the first time.

Deterministic engines needing a synchronous `(skillId) => SkillProgress` lookup (`checkReadiness`) are unaffected by the move to async persistence — callers now bulk-fetch a `Record<skillId, SkillProgress>` via `getSkillProgressMap()` once, then derive a synchronous getter from that map, rather than the engine itself awaiting anything. See `components/skillforge/skill-detail-view.tsx` and `skillforge-dashboard.tsx` for the pattern.

---

## Roadmap System

Domain logic unchanged. Persistence is now `roadmaps`/`gap_items`/`roadmap_phases`/`roadmap_tasks` instead of one `SavedRoadmap[]` array. `topMoves` and `GapAnalysis.targetCareers` are recomputed on read (via `deriveTopMoves()`) rather than stored redundantly — they're pure functions of already-stored data.

---

## Adaptive Roadmap Engine (new this session — Phase 3)

A second, separate roadmap system alongside the narrative `Roadmap` above — see `docs/roadmap-engine.md` for the full pipeline/formula/scheduling design and `docs/skill-graph.md` for the dependency graph. Summary:

- **Skill graph** (`types/skill-graph.ts`, `data/skill-graph.ts`, `lib/roadmap/skill-graph.ts`): ~25 curated nodes covering JS/TS/React/Next.js, SQL/Postgres/ORM/backend-persistence, Python/REST/FastAPI, and a data/ML branch tied to 4 real `data/skillforge-modules.ts` ids. Cycle detection and dangling-prerequisite validation run at index-build time (`buildSkillGraphIndex`), not just informally. Deterministic topological ordering and BFS depth power both task-priority ("what does this unblock") and phase grouping.
- **Priority formula** (`lib/roadmap/priority.ts#scoreSkillPriority`): documented weighted sum of matched-gap priority/impact, saved-job frequency, unblock count, and evidence weakness, with a mastery discount — same discipline as `lib/evidence/confidence.ts`.
- **Task generation** (`lib/roadmap/adaptive-generator.ts`, `adaptive-phases.ts`): candidate skills come from target-career relevance, gap-analysis matches, and saved-job requirement matches; unmet prerequisites are pulled in recursively; each unmastered skill becomes one `AdaptiveTask` (title, reason, hours, prerequisites, priority, completion criteria, evidence goal, optional SkillForge learning resource/assessment link) — never AI-authored.
- **Deterministic scheduler** (`lib/roadmap/scheduler.ts`): topologically-ordered, priority-tie-broken, greedy weekly bin-packing; detects impossible deadlines with the exact worked-example message format from the task brief and concrete recommendations (raise weekly hours to X, extend to date Y, or drop N lowest-priority tasks).
- **Adaptation** (`lib/roadmap/adaptation.ts`): every recompute merges forward by `skillId` (task ids regenerate every run) so completed/in-progress/skipped status survives a full regenerate; a skill that drops out of scope while completed is preserved in `completedHistory` rather than deleted; a deterministic, per-trigger `RoadmapChangeEvent` summary is produced only when something actually changed.
- **Saved-job aggregation** (`lib/roadmap/saved-job-signals.ts`): personalized skill frequency across a student's own saved jobs, always labeled as such in the UI, never presented as market-wide stats. Required a new `repositories/job-repository.ts#listFullJobDescriptions` bulk-fetch (existing `listJobDescriptions` only returns lightweight summaries).
- **Persistence**: `adaptive_roadmaps` (one per profile, `UNIQUE` on `profile_id`) + `adaptive_roadmap_phases`/`_tasks` (delete-and-reinsert, same sanctioned pattern as `roadmap-repository.ts`) + `adaptive_roadmap_change_events`/`_completed_history` (genuinely **append-only** — `repositories/adaptive-roadmap-repository.ts` only ever inserts new rows into these two, never deletes/rewrites). Migrations `0007_adaptive_roadmap_schema.sql` + `0008_adaptive_roadmap_rls.sql`, same two-file schema-then-RLS pattern as `0005`/`0006`.
- **API**: `GET /api/roadmap/adaptive`, `POST /api/roadmap/adaptive/generate` (body `{trigger}`, the single recompute entrypoint every trigger calls), `PATCH /api/roadmap/adaptive/tasks/[taskId]` (mark complete/in-progress/skipped; reschedules remaining tasks in place when status affects future capacity, without a full regenerate). `services/adaptive-roadmap-service.ts` is the client wrapper.
- **UI**: new protected route `/roadmap` ("Plan" in the navbar) — `components/roadmap/adaptive/*`: header/readiness/feasibility banner, a personalized saved-job-frequency panel, phase/task cards with status controls and prerequisite indicators, a change-history feed, and a completed-history list. `StaleRoadmapBanner` detects profile drift (target careers/date/weekly hours) client-side and prompts a recompute — deliberately **not** wired into `app/api/profile/route.ts` itself. Contextual "Update my plan" links added to the SkillForge assessment-result view and `/jobs/[id]`'s fit results.
- **Deliberate scope decisions** (all documented in `docs/roadmap-engine.md`): curated (not exhaustive) skill-graph coverage; one active roadmap per profile, not multiple snapshots; only 3 of 9 `RoadmapChangeTrigger`s are wired to an automatic/contextual UI trigger today (`new-evidence`/`new-github-project`/`new-resume` work via the API but have no UI entry point yet); no free-drag rescheduling; no analytics dashboard (deferred to Phase 4 per the task brief's own instruction).
- **A real bug caught by manual browser verification this session**: the first version of `AdaptiveRoadmapDashboard` gated its top-level loading spinner on both `isProfileLoading` and its own roadmap-fetch state in one condition — since the roadmap-fetch effect intentionally does nothing when the user isn't authenticated, an unauthenticated visit to `/roadmap` got stuck on an infinite spinner instead of showing the sign-in prompt. Fixed by checking `isProfileLoading`, then `!isAuthenticated`, then the roadmap-fetch loading state as three separate, ordered gates — the same three-stage pattern `JobsDashboard` already used correctly.

---

## Tests

**208 tests, 31 Vitest files, all passing** (including 36 database integration tests), plus Playwright desktop/mobile smoke and axe accessibility coverage. New regression suites cover saved-job insights, real-only readiness history, safe redirects, full application persistence/stage events/ownership, atomic per-user throttling, structured-AI retry/timeout behavior, deterministic assessment grading, recency-aware mastery, resume-layout normalization, and exhaustive career/stage roadmap quality. The detailed historical inventory below remains useful but predates these additions.

Unit (pure functions, no DB) — `tests/unit/`:
- `mastery.test.ts` (11), `pacing.test.ts` (8) — unchanged from Phase 1.
- `matching-engine.test.ts` (5, new) — `matchCareers` bounds/ranking/topN, closing Phase 1's top test-debt item.
- `career-fit.test.ts` (5, new) — `computeCareerFitBreakdown`: empty profile never throws, all components/overall bounded 0-100, richer profile scores higher than empty, full skill coverage hits 100, never divides by zero when a career has no certifications/skills.
- `job-heuristic-extractor.test.ts` (4, new) — heuristic job extraction validates against `JobExtractionSchema`, classifies required-vs-preferred by section heading correctly, never throws on empty input.
- `job-ai-extractor.test.ts` (4, new) — mocks at the `getAnthropicClient()`/`messages.create` boundary (per CLAUDE.md's testing rule, never fakes the extractor's return value directly): a valid first response returns immediately, a schema-invalid response is retried once and can succeed on the retry, retries are exhausted (not infinite) on a persistently invalid response, and a network/API error is never retried.
- `job-fit-scoring.test.ts` (9, new) — `computeJobFitAnalysis`: zero requirements never throws, correctly distinguishes missing/strong evidence, required-skill coverage and overall score respond to profile changes, never divides by zero on an experience-years requirement against an empty profile, education-requirement fuzzy matching; `prioritizeGaps`: empty when everything's a strong match, required-missing outranks preferred-missing, capped at 8 recommendations.
- `resume-file-validation.test.ts` (7) — size cap enforced before content checks, unsupported types rejected, mismatched extension/MIME rejected, and the magic-byte check specifically catches a mislabeled/renamed file (a DOCX's real bytes claiming to be a `.pdf`/`application/pdf`).
- `skill-confidence.test.ts` (8, new) — `computeSkillConfidence`: zero evidence never throws and is "Unverified," a bare self-claim alone stays "Unverified," the exact task-spec worked example (claimed + 88/100 assessed + strong project + moderate professional) lands at "High" not "Very High," "Very High" requires all three non-claimed dimensions independently strong, two merely-moderate independent sources land at "Low," every component score stays bounded 0-100; `listTrackedSkills` unions claimed/GitHub-detected/manually-added skill names correctly.
- `github-client.test.ts` (5, new) — mocks `fetch` directly: successful requests parse cleanly, a 404 becomes a clean `GithubError`, a 403-with-`remaining=0` is recognized as rate-limited with a computed `retryAfterSeconds`, a 403-with-remaining>0 is NOT treated as a rate limit, a network failure is wrapped rather than propagated raw.
- `github-detectors.test.ts` (11, new) — all seven detectors return `detected:false` (not a throw) for an empty repo; a realistic file tree + deps trips README/testing/CI/Docker/database/backend detection with real evidence; a weak circumstantial match (a `tests/` folder with no config/deps) never claims high confidence; `extractManifestDependencies` for `package.json`/`requirements.txt`, malformed JSON handled without throwing; `mapRepoSignalsToSkills` never reads star/fork/commit fields (structural — the function signature has none), dominant-vs-minor language strength, dedup-to-strongest.
- `github-analyze-repo.test.ts` (2) — mocks the `client.ts` functions: a full realistic analysis produces the expected detected signals/skills/summary; a languages/tree API failure degrades to a sparser-but-valid analysis rather than throwing.
- `skill-graph.test.ts` (26, new) — `detectCycle`: acyclic/empty graphs return null, a direct two-node cycle, a longer indirect cycle, a self-referencing node; `buildSkillGraphIndex`: the real curated `SKILL_GRAPH_NODES` build cleanly (no cycles/dangling ids), throws `SkillGraphValidationError` on a dangling prerequisite/cycle/duplicate id, handles an empty node list; `getUnmetPrerequisites`/`getBlockedSkills`/`resolveTransitivePrerequisites`: correctness on a small fixture graph, unknown skill id returns empty rather than throwing; `topologicalOrder`: prerequisite-before-dependent ordering, pulls in un-requested transitive prerequisites, deterministic across repeated calls, empty input, and a full valid ordering over the real curated graph; `graphDepth`: root/hop/out-of-scope-prerequisite cases.
- `priority.test.ts` (15, new) — `tierForScore` documented thresholds; `scoreSkillPriority`: always bounded 0-100, a critical/high-impact gap outranks a low-priority/low-impact one, saved-job frequency and unblock-count and evidence-weakness each independently raise the score, the mastery discount applies whether triggered by SkillForge level or by confidence alone; `findMatchingGap`/`findMatchingJobFrequency`: keyword-match correctness, highest-priority-match tie-break, empty-list cases.
- `saved-job-signals.test.ts` (6, new) — `computeSavedJobSkillFrequency`: empty saved-jobs list, single-job 100% case, correct percentage across multiple jobs, descending sort, a requirement appearing twice on the same job counts once, never divides by zero.
- `scheduler.test.ts` (11, new) — `scheduleTasks`: empty task list, a task that fits within one week, splitting a task across weeks when it exceeds weekly capacity, respecting prerequisites (a dependent never starts before its prerequisite's week finishes), higher-priority work scheduled in earlier weeks, completed/skipped tasks never rescheduled and never consume future capacity, null/zero weekly hours default to an assumed value, the exact impossible-deadline worked example from the task brief (message format + recommendation numbers), a feasible schedule emits no recommendations, deterministic across repeated calls.
- `adaptation.test.ts` (8, new) — `recomputeAdaptiveRoadmap`: first-ever generation emits no change event, a completed task's status survives a full regenerate, a completed skill that drops out of scope lands in `completedHistory` instead of being deleted, no duplicate history entries, an added-skill diff produces a summary naming the trigger, a changed priority tier is detected, a no-op recompute emits no change event, never throws for an empty profile with no target careers.

Integration (real repository/RLS behavior against pglite) — `tests/integration/`:
- `profile-repository.test.ts` (6), `resume-repository.test.ts` (7), `job-repository.test.ts` (6) — unchanged from session 2.
- `adaptive-roadmap-repository.test.ts` (6, new) — save/load round-trip including `prerequisiteTaskIds` resolved back via `skillId`, one-roadmap-per-profile (a second save overwrites rather than duplicating), change events append without losing prior ones, `updateTaskStatus` records `completedHistory` and a later regenerate that drops the skill doesn't lose it, an unknown task id returns null rather than throwing.
- `rls-isolation.test.ts` (8, was 7) — session 3's seven cases plus one new this session: an adaptive roadmap and its tasks (`getAdaptiveRoadmap`/`updateTaskStatus`, both filtering only by the caller's own scoped id) are proven unreadable/unmodifiable by a second user. Per CLAUDE.md's rule, this was required for `adaptive-roadmap-repository.ts`'s new repository functions.

**Test infrastructure:** `tests/integration/db.ts` now applies migrations `0000` → `0008` (`0007_adaptive_roadmap_schema.sql` + `0008_adaptive_roadmap_rls.sql` added this session — a new migration must be added to this list or the harness silently won't see it). `server-only` is aliased to a no-op stub in `vitest.config.mts` (`tests/support/server-only-stub.ts`, unchanged this session) so server-only modules can be unit-tested directly. The non-superuser `app_role` switch is unchanged from Phase 1.

**Not yet covered (tracked as debt):** `lib/gap-analysis/engine.ts` still has zero direct unit coverage — carried over again this session (touched only indirectly via `lib/roadmap/adaptive-input.ts#buildAdaptiveRoadmapInput`, which calls `analyzeGaps` unchanged; still the top test-debt item the next session that actually modifies that file's logic should close first, per CLAUDE.md).

---

## Deployment

Live at https://path-finder-umber.vercel.app/. No Supabase project is currently provisioned for production, so account-backed features remain unavailable by infrastructure, not by an application defect. The app now handles that state deliberately: public discovery stays available, protected routes go to a product-safe availability message, and no deployment instructions or raw authentication errors are shown to visitors. Once a Supabase project exists and its env vars are set in Vercel, run `npm run db:migrate` and `npm run db:seed:reference` against it before the first real user signs up. If GitHub OAuth-connect is wanted in production, also enable GitHub as a Supabase Auth provider and set `GITHUB_TOKEN_ENCRYPTION_KEY` (public username/repo analysis needs neither). `.github/workflows/ci.yml` runs lint/typecheck/tests/build on every PR.

---

## Known Issues

**Closed this session:** Phase 3 — the adaptive skill-graph/scheduler (was session 3's "Next Recommended Phase" #2) — done, see "Adaptive Roadmap Engine" above.

**Carried over, still open:**
1. `lib/resume/pdf-text.ts`/`docx-text.ts` has no timeout/resource ceiling around document parsing.
2. `components/skillforge/skill-detail-view.tsx` (691 lines) mixes data-fetching, several `useMemo` chains into domain engines, and ~10 rendered sections in one file.
3. No unit tests for `lib/gap-analysis/engine.ts` — top test-debt priority the next session that touches it.
4. Anthropic-cost paths now have persistent per-user limits. GitHub's outbound paths still rely on GitHub's own rate-limit responses; host-level IP/WAF controls remain a production-operations improvement.
5. Demo mode is a single shared account with no per-visitor isolation or auto-reset. Documented as an accepted limitation in `docs/security.md`.
6. Production Vercel deployment has not been reconnected to a real Supabase project — see "Deployment" above.
7. `lib/jobs/fit-scoring.ts#estimateYearsOfExperience` is a best-effort estimate from free-text resume dates — genuinely approximate by design.
8. `/jobs` has no URL-import option (paste-only) — a deliberate scope decision, not an oversight.
9. `lib/jobs/heuristic-extractor.ts`'s required-vs-preferred classification depends entirely on section-heading detection.
10. GitHub OAuth-connect (`supabase.auth.linkIdentity` + `app/auth/callback/route.ts`'s token capture) is real code, typechecked and built, but **not live-verified** — no Supabase project with GitHub enabled is configured in this local environment. Public username/repo analysis (the primary path) doesn't share this gap — it needs no auth infrastructure at all.
11. No revocation call to GitHub's own token-revocation endpoint on "Disconnect" — only the local encrypted copy is deleted. Documented as acceptable for a `read:user`-only, non-`repo`-scoped token in `docs/github-integration.md`, but worth adding for defense-in-depth later.
12. The GitHub file-tree fetch (`git/trees/{branch}?recursive=1`) is capped at whatever GitHub returns before truncating (~100k entries) — an enormous monorepo gets a partial (not wrong, just incomplete) signal picture.
13. `lib/evidence/confidence.ts`'s "claimed" dimension treats a skill as binary present/absent — the current `StudentProfile.currentSkills` shape has no per-skill self-rated proficiency level (the task's own worked example implies one, e.g. "Claimed: Advanced"), so "claimed" evidence is presence-only rather than a graded claim. Extending `currentSkills` to carry an optional level would be a real (if small) profile-schema change, deliberately not done this session to avoid scope creep into the resume/profile UI.

**New this session:**
14. Only 3 of the 9 `RoadmapChangeTrigger` values (`target-role-changed`/`deadline-changed`/`weekly-hours-changed` via automatic staleness detection, plus `assessment-passed`/`assessment-failed`/`job-analyzed`/`manual` via explicit UI links) are actually reachable from the UI — `new-evidence`/`new-github-project`/`new-resume` work correctly if called directly against the API but have no button/link anywhere yet. See `docs/roadmap-engine.md`.
15. No free-drag task rescheduling — a deliberate invariant-preserving decision (see `docs/roadmap-engine.md`), but worth restating here so it isn't mistaken for an oversight.
16. `lib/roadmap/adaptive-input.ts#buildAdaptiveRoadmapInput` calls four independent data sources (profile, saved jobs, SkillForge progress, evidence confidence, previous roadmap) via `Promise.all` but doesn't cache/dedupe against calls other routes might make in the same request lifecycle — acceptable at current traffic, worth revisiting if `/roadmap` and another evidence-heavy page are ever loaded in the same server request.
17. The adaptive roadmap's authenticated end-to-end flow (generate → mark task complete → recompute → verify history/change-event persistence → infeasible-deadline banner) was **not live-verified against a real signed-in session** this session — no Supabase project is configured in this local environment (same infrastructure gap every prior session has carried). It IS verified at the unit/integration-test level (73 new tests, including a dedicated repository round-trip test) and the unauthenticated `/roadmap` page was manually browser-tested (see "Verification Status" below) — which is what caught and fixed a real bug (see "Adaptive Roadmap Engine" above).

---

## Bugs Fixed (Phase 1 session)

1. **Résumé/profile date columns were modeled as SQL `date`, but the domain data is free-text partial dates.** `education.start_date`/`end_date`, `experience.start_date`/`end_date`, `projects.date`, `awards.date`, `certifications.date` were originally `date` columns in the Drizzle schema. The very first integration test (`tests/integration/profile-repository.test.ts`) failed on insert with a Postgres date-parse error, because the test used a realistic value like `"2022-08"` — and `EducationRecord.startDate` etc. have always been typed `string | null` in `types/records.ts` precisely because résumés (and this app's own forms) produce exactly that kind of partial date. **Fix:** changed those columns to `text`. Documented in `docs/database.md` so a future session doesn't reintroduce the same mistake.
2. **The RLS integration tests were a false positive on first run.** `tests/integration/db.ts`'s pglite connection is a genuine Postgres superuser by default, and superusers unconditionally bypass row security regardless of `FORCE ROW LEVEL SECURITY` — so the first version of the cross-user isolation tests "passed" for the wrong reason (RLS wasn't actually being exercised). **Fix:** the test harness now creates a non-superuser `app_role`, grants it what it needs, and runs every test query as that role instead — mirroring Supabase's real `postgres` role (table owner, but not a superuser). This is arguably the most important fix in this session: it turned a misleading green checkmark into a test that would actually catch a real regression.

Both verified by a full `npm run lint` + `npm run typecheck` + `npm test` + `npm run build` pass (all clean) after the fixes.

**This session's one notable tooling issue (not a product bug):** `drizzle-kit generate` needs a TTY to resolve ambiguous column-rename detection, which isn't available in this environment. Renaming/dropping `job_matches.fit_score`→`overall_fit_score` (etc.) in the same `generate` pass as adding the new columns triggered that interactive prompt and failed non-interactively. **Fix:** split into two `generate` passes — add new columns first (unambiguous), then drop the old ones in a separate migration (`0003_drop_legacy_job_columns.sql`) once nothing new was being added in the same statement. Documented in `docs/database.md`'s "Migration history" so a future session hitting the same prompt knows the workaround.

---

## Technical Debt

- `repositories/skillforge-repository.ts`'s `loadProgress()` and `listSkillProgress()` duplicate a fair amount of row-to-domain-type mapping logic — worth extracting a shared helper if a third caller ever needs the same shape.
- `repositories/roadmap-repository.ts`'s `saveRoadmap()` does a full delete-and-reinsert of gap items/phases/tasks on every save, inside one transaction — correct and simple at current data volume, but re-evaluate if roadmaps ever need edit history. `repositories/job-repository.ts#updateJobDescription` does the same for requirements, for the same reason.
- `lib/matching/evidence.ts`'s `fuzzyIncludes`/`normalizeText` intentionally duplicate ~15 lines of logic that also exists privately inside `lib/gap-analysis/engine.ts` — a deliberate tradeoff (see "Career Matching" above), not an oversight; revisit only if `gap-analysis/engine.ts` is ever refactored for its own reasons.
- `app/api/jobs/[id]/match/route.ts` fetches the profile twice (once directly for its own 422 check, once inside `buildSkillConfidenceContext`) — a small, deliberate redundancy documented inline rather than restructuring the 422 check around the context-builder's `null` return.
- See the Phase 1 carried-over items (skill-detail-view.tsx size, playbooks/data file scalability) — unchanged this session.
- `app/api/roadmap/adaptive/generate/route.ts` reuses `input.previous` (already fetched inside `buildAdaptiveRoadmapInput`) instead of calling `getAdaptiveRoadmap` a second time — same "avoid the obvious redundancy where it's free to avoid" instinct as the job-fit route above, but this one didn't need a documented tradeoff since there was no reason to duplicate the call.

---

## Decisions Made

**Phase 1:**
- **Supabase (Postgres + Auth) + Drizzle ORM**, not Neon+Prisma or a separately-hosted auth provider — see `docs/database.md` for the comparison.
- **RLS is defense-in-depth, not the primary authorization mechanism** — the application layer (repositories taking a server-verified `userId`) is what's actually relied on day to day; RLS with `FORCE` is what catches a bug in that layer before it becomes a real leak. See `docs/security.md`.
- **`updateProfile`/`saveRoadmap` are full-replace, not diffed** — every write deletes and reinserts a profile's/roadmap's child collections from the submitted arrays in one transaction. Simple and correct at this app's per-user data volume; revisit only if per-record history is ever needed.
- **Onboarding and Accelerate are two separate, equally-valid paths to a complete profile.**
- **Demo mode is one shared account, not a per-visitor sandbox.**

**This session:**
- **A second career-scoring engine, not a rewrite of the first.** `lib/matching/career-fit.ts` was added alongside `lib/matching/engine.ts#matchCareers` rather than extending that function's signature — they answer genuinely different questions (preference fit vs. evidence-backed profile fit) and CLAUDE.md explicitly protects `matchCareers` from casual rewrites. Keeping them separate also means Discover keeps working with zero profile data, exactly as before.
- **Job-fit analyses are persisted snapshots, not recompute-only.** Unlike `topMoves`/`GapAnalysis.targetCareers` (recomputed on read from stored roadmap data), every "Run fit analysis" click writes a new `job_matches` row. Reasoning: a student's profile changes over time as they build evidence for a gap, and being able to compare "my fit score before vs. after adding that project" is a real, intended use of the history endpoint (`GET /api/jobs/[id]/match`) — recompute-only would lose that comparison.
- **Paste-only job-description input, no URL import.** The task spec explicitly said URL scraping shouldn't be a core requirement and should stay optional if built at all; given scraping's fragility (paywalls, JS-rendered postings, ToS variance across job boards), it was left out entirely this session rather than built half-heartedly.
- **Every uploaded resume is its own row (a "version"), not an overwrite.** Mirrors how `job_matches` keeps history — a student's resume evolves, and being able to see/select from past versions (and re-run extraction against one without re-uploading) is more useful than always clobbering the last upload.

**This session:**
- **A new evidence/confidence domain, not a repurposing of SkillForge's own `SkillEvidence`.** The task asked for a `SkillEvidence` model, but that name and a narrower version of the concept already existed for SkillForge's manual per-module evidence links. Rather than overload it, this session added a distinctly-named `SkillEvidenceRecord`/`SkillConfidenceScore` domain (`types/evidence.ts`) that connects to SkillForge (assessed mastery is one input) without merging into or renaming its existing types — protecting the "SkillModule/SkillProgress shapes must not be casually rewritten" rule in `CLAUDE.md`.
- **GitHub OAuth reuses Supabase's existing auth architecture (`linkIdentity`) instead of a second OAuth app.** The task explicitly preferred this ("if current auth architecture supports it cleanly"); it avoids a second set of client-id/secret credentials, a second callback flow, and a second place tokens could leak, at the cost of only being able to request scopes Supabase's `linkIdentity` supports — which is fine, since only `read:user` was ever needed.
- **Manual evidence is the only evidence type persisted; everything else is recomputed.** Same reasoning as `topMoves`: auto-derived evidence (from profile/SkillForge/GitHub) is cheap to recompute and would otherwise go stale the instant any input changes.
- **`RequirementMatch.evidence` changed shape (`string[]` → `SkillEvidenceRecord[]`) rather than adding a parallel field.** This is Phase 2 work, still evolving pre-launch — CLAUDE.md doesn't protect this specific type, and duplicating it (`evidence` + `evidenceRefs`) would've been worse than one clean breaking change with tests updated alongside it.

**This session:**
- **A second, separate roadmap system, not an extension of the narrative `Roadmap`.** `types/adaptive-roadmap.ts`/`AdaptiveRoadmap` was added alongside `types/roadmap.ts`/`Roadmap` rather than adding scheduling fields to the existing type — they answer genuinely different questions (a one-shot AI/fallback narrative vs. a single continuously-recomputed, scheduled plan) and CLAUDE.md explicitly protects the existing roadmap engines from casual rewrites. This also means Accelerate's existing narrative roadmap keeps working completely unchanged.
- **One active adaptive roadmap per profile, not multiple saved snapshots.** Unlike `SavedRoadmap`, `adaptive_roadmaps.profile_id` is `UNIQUE`. The task brief frames this as "the roadmap" (singular, evolving), and completed-task/change history is preserved via genuinely append-only child tables instead of via multiple full snapshots.
- **Automatic recompute triggers are scoped to profile-field changes (via client-side staleness detection), not wired into every mutation route.** Hooking into `app/api/profile/route.ts`, the resume-upload route, the evidence-add route, and the GitHub-import route would touch four already-relied-upon, unrelated routes for triggers (`new-resume`/`new-evidence`/`new-github-project`) that are real and available via the API but not yet worth that blast radius — an explicit "Update my plan" link is the safer, still-real alternative. See `docs/roadmap-engine.md`.
- **`prerequisiteTaskIds` are persisted as `prerequisite_skill_ids` (skill ids, not task ids) and resolved back to sibling task ids at read time.** Task ids are regenerated on every recompute (they have no stable identity across runs — `skillId` is what's stable), so persisting a task-id-based FK would break the moment a roadmap regenerates. Storing the stable `skillId` and resolving at read time avoids that entirely, at the cost of one extra map-lookup pass in the repository — the same tradeoff already made for `findRoadmapConnection`'s keyword matching elsewhere in this codebase (prefer a stable natural key over a synthetic one that churns).

---

## Current Phase

Phase 4 — Product Completeness, **complete in the repository**. Production still requires migrations `0009` and `0010`, a demo reseed, deployment verification, and the authenticated live Playwright journey before this exact state is considered fully proven online.

## Next Recommended Phase

Two reasonable next steps, in priority order:

1. Apply migrations `0009`/`0010`, reseed the demo, and run the authenticated live Playwright journeys after deployment.
2. Close the remaining direct-test gap in `lib/gap-analysis/engine.ts` before changing that engine.
3. Add contextual `new-evidence`/`new-github-project`/`new-resume` adaptive-roadmap refresh links; those triggers remain backend-supported but not surfaced everywhere.

Before any of these: provision a real Supabase project for the Vercel deployment (still not done — see "Deployment"), live-verify the GitHub OAuth-connect path (carried over from session 3), and live-verify the adaptive roadmap's full authenticated flow (carried over from this session — see Known Issue #17).

## Important Files

Read these first in a fresh session, in this order: `CLAUDE.md` → this file → `docs/database.md` → `docs/security.md` → `docs/evidence-model.md` → `docs/github-integration.md` → `docs/skill-graph.md` → `docs/roadmap-engine.md` → `docs/architecture.md` → `docs/implementation-plan.md` → `types/profile.ts` + `types/roadmap.ts` + `types/adaptive-roadmap.ts` + `types/skill-graph.ts` + `types/skillforge.ts` + `types/job.ts` + `types/evidence.ts` + `types/github.ts` → `lib/gap-analysis/engine.ts` → `lib/roadmap/adaptation.ts` (the newest orchestration point, same deterministic discipline) → `lib/evidence/confidence.ts` → `repositories/profile-repository.ts` (the template every other repository follows) → `lib/db/with-user-context.ts` (the RLS-enforcement seam — read this before adding any new repository function).

## Verification Status

Run 2026-08-09 (session 7), this exact repository state before deployment:

```text
npm run lint             → clean
npm run typecheck        → clean
npm test                 → 219 passed (32 files, including 36 integration)
npm run build            → clean (Next.js 16.3.0, 42 routes/pages)
npm run test:e2e         → 6 passed desktop/mobile public, accessibility, and navigation checks; 6 authenticated/demo checks skipped because Supabase credentials are absent locally
```

Manual browser checks covered the open Workspace disclosure at 1440×900 and the labeled navigation panel at 1024×768. Both layouts had zero horizontal overflow; the tablet menu exposed every primary and Workspace destination with accessible names.

Run 2026-08-09 (session 6), this exact repository state before deployment:

```text
npm run lint             → clean
npm run typecheck        → clean
npm test                 → 219 passed (32 files, including 36 integration)
npm run test:e2e         → 5 passed desktop/mobile public + axe checks; 5 authenticated demo checks skipped because production auth credentials are absent locally
npm run build            → clean (Next.js 16.3.0, 42 routes/pages)
```

Manual responsive screenshots additionally verified the branded navbar and landing page at 1440×900 and 390×844, plus the authentication-unavailable state at 900×900. Requests to `/applications` and the other protected product routes now receive a server-side `307` to `/login?redirectTo=…`; the browser regression test asserts that no `Not authenticated.` API error or Supabase environment-variable name reaches the page.

Run 2026-08-09 (session 5), this exact repository state before deployment:

```text
npm run lint             → clean
npm run typecheck        → clean
npm test                 → 208 passed (31 files, including 36 integration)
npm run test:e2e         → 5 passed desktop/mobile public + axe checks; 5 real-demo checks skipped locally because Supabase/demo credentials are intentionally absent
npm run build            → clean (Next.js 16.3.0, 42 routes/pages)
npm audit --omit=dev     → 0 vulnerabilities
```

The local browser run verifies loading/empty/auth/error rendering on protected journeys at desktop and mobile sizes plus automated WCAG A/AA serious/critical checks on the landing page. The authenticated demo journey is implemented but must be rerun with `E2E_DEMO=1` against the deployed seeded account after migrations/reseed. The older session-4 verification notes below are historical context, not the current checkpoint.

Run 2026-08-08 (session 4), this exact repository state:

```
$ npm run lint         → clean, no output
$ npx tsc --noEmit     → clean, no output
$ npm test             → 179 passed (22 test files)
$ npm run build        → clean (Next.js 16.2.11, Turbopack, all routes generated, including
                          /roadmap, /api/roadmap/adaptive, /api/roadmap/adaptive/generate,
                          /api/roadmap/adaptive/tasks/[taskId])
```

**Manually browser-tested this session** (via a local dev server, unauthenticated — no Supabase project is configured in this local environment, so a signed-in walkthrough wasn't possible, same gap every prior session has carried): `/roadmap` in its unauthenticated state, `/jobs`, and `/skillforge` — all render without console or server errors. This caught and fixed a real bug: `AdaptiveRoadmapDashboard`'s first version showed an infinite loading spinner instead of the sign-in prompt for an unauthenticated visitor (see "Adaptive Roadmap Engine" above for the root cause and fix).

**Not verified this session** (same infrastructure gap as sessions 2-3): the adaptive roadmap's full signed-in flow (generate → mark complete → recompute → verify history/change-event persistence → infeasible-deadline banner rendering with a real profile); the GitHub OAuth-connect flow (carried over from session 3); a live public-username/repo GitHub API analysis or live Anthropic call. All new logic is covered by unit tests (pure-function composition, no mocking needed since the adaptive engine has no AI/network calls in its core path) and a dedicated repository-level integration/RLS test against pglite. A live Supabase + Anthropic smoke test, plus an authenticated in-browser walkthrough of `/roadmap`, remains the responsible next verification step before calling this phase fully proven in production.
