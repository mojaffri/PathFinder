@AGENTS.md

# PathFinder — Project Overview

PathFinder is a career-readiness platform built with Next.js (App Router, TypeScript, Tailwind v4). It helps people figure out which career fits them (Discover), builds a concrete personalized plan to become competitive for it (Accelerate), and gives them a way to actually build and prove the underlying competencies (SkillForge). The long-term goal (see `docs/implementation-plan.md`) is a full career-readiness loop: structured profile → resume parsing → target role selection → deterministic readiness scoring → job-description-specific gap analysis → evidence-backed skills → GitHub project analysis → adaptive roadmaps → assessments → application tracking.

**Scope note (corrected 2026-08-08):** PathFinder is *not* STEM-only. `data/careers.ts` spans 9 categories — engineering, software-tech, data-ai, biotech-life-sciences, healthcare, science-research, **law**, **business-finance**, and **humanities-social-sciences** — and the live Discover questionnaire, AI roadmap prompt, and career-matching engine all treat every category as a first-class target. An earlier version of this file and `README.md` described the app as STEM-only; that was stale against the actual product and has been corrected. Do not reintroduce a STEM-only restriction without an explicit product decision to narrow scope.

For what's actually built right now vs. planned, always read **`docs/project-state.md`** — that file changes frequently and is the authoritative status; this file is durable engineering guidance that shouldn't need to change often. Diagrams live in `docs/architecture.md`; the database schema and migration workflow are in `docs/database.md`; the auth/RLS model is in `docs/security.md`; the phased build-out plan is `docs/implementation-plan.md`.

## Core engineering principles (non-negotiable)

- **Deterministic where it matters, AI where it helps.** Career matching (`lib/matching/engine.ts`), gap analysis (`lib/gap-analysis/engine.ts`), SkillForge mastery scoring (`lib/skillforge/mastery.ts`), and pacing math (`lib/roadmap/pacing.ts`) are pure, explainable functions — never replace them with an LLM call for convenience, even a "small" one. AI is used only where genuine unstructured interpretation or subjective judgment helps: resume text → structured fields, gap analysis + profile → narrative roadmap, and open-response answers → a graded evaluation. When a future feature needs to *parse* unstructured input (a job description, a GitHub README) before scoring it, follow the same split: AI parses into structured data, deterministic code does the actual scoring/ranking.
- **Every AI path has a real, fully-functional fallback**, not a degraded error state. Resume extraction and roadmap generation return `null` on provider failure and fall back to their heuristic/deterministic implementations. SkillForge grades fixed-choice questions deterministically and uses AI only for genuinely open responses; if that AI is unavailable, the route returns `{ evaluation: null }` and the raw answer is still persisted. New AI integrations must preserve useful non-AI behavior.
- **Zod validation at every external-data boundary.** Every AI response (structured tool-use output) and every API route's request body is parsed through a zod schema before use. This isn't optional cleanup — a schema-invalid AI response is treated as equivalent to an AI failure (fall through to the deterministic path), never coerced or partially trusted.
- **Anti-fabrication discipline, enforced structurally, not by prompting alone.** Never invent resume achievements, metrics, project outcomes, or business impact. Bracket placeholders (e.g. `[quantify impact]`, `[Target company or company type]`) are the correct representation for anything not evidenced — this applies to resume extraction, roadmap generation, and SkillForge evidence/project content alike.
- **Resume-extracted (and any AI-extracted) data is unverified until the user confirms it.** The review UI (`components/accelerate/extracted-data-review.tsx` → `components/profile/profile-form.tsx` → `components/profile/record-section.tsx`) must let every extracted field be edited or removed before it becomes profile data — do not add a path that persists AI-extracted data directly.
- **Normalize every resume extraction before validation/persistence.** Both AI and heuristic results pass through `normalizeResumeExtraction()` so layout artifacts, orphan project lines/URLs, and duplicate bullets obey one record contract.
- **Never expose the Anthropic API key client-side.** Provider access is server-only through `lib/ai/anthropic-provider.ts`/`structured-output.ts`; legacy job/GitHub extractors still use the server-only `lib/ai/anthropic-client.ts` wrapper. None may be imported from a `"use client"` component. The same rule applies to `SUPABASE_SERVICE_ROLE_KEY` (`lib/supabase/admin.ts`) and `DATABASE_URL` (`lib/db/client.ts`).
- **One persistence boundary.** `repositories/*.ts` are the only files allowed to import `lib/db/schema`/`lib/db/with-user-context.ts` — every other file goes through `services/*` (client-side fetch wrappers) → `app/api/*` route handlers → repositories. There is no `localStorage` anywhere in the app anymore (the old `lib/storage/*` files were deleted in the Phase 1 migration); do not add a new file that touches `window.localStorage` or imports Drizzle outside `repositories/*`.
- **Theme state is cookie-backed.** The document theme lives on `<html data-theme>`, is applied before paint by the small script in `app/layout.tsx`, and is persisted only in the `pathfinder-theme` cookie by `components/layout/theme-toggle.tsx`. Keep this flow free of `localStorage` so it respects the app-wide persistence boundary and avoids a flash of the wrong theme.
- **The shared public demo is fictional and read-only.** `scripts/seed-demo.ts` deletes the existing demo profile (and its cascading domain records) before recreating the showcase dataset, while `lib/supabase/middleware.ts` rejects authenticated demo-account API mutations. Never seed the demo from a developer's real profile, projects, repositories, resume, jobs, or activity, and never add a mutation path that bypasses the read-only boundary.
- **Every repository function takes a server-verified `userId`, never a client-supplied one**, and every query it runs is scoped to that user — see "Authentication conventions" and `docs/security.md`. This is the primary authorization mechanism; Row Level Security is the backstop, not a substitute for it.
- **Strict TypeScript, no suppressions.** Never weaken `tsconfig.json`'s `strict: true`, add `@ts-ignore`/`eslint-disable` to hide a real error, or delete a failing check to make a build pass. Fix the root cause.
- **No unnecessary rewrites.** The deterministic engines and the AI-fallback pattern in this codebase have been read line-by-line and audited for correctness (see `docs/project-state.md`) — they are not a prototype to be redesigned, they are the app's core differentiator. Extend them; don't replace them because a different pattern is more familiar or fashionable.
- **Roadmap sequencing is education-stage-aware.** Route guidance through `lib/roadmap/stage-strategy.ts`; program-variable admissions tests require verification, retired credentials must not appear, and substantial actions should create demonstrated skill, credible evidence, real opportunity access, or required readiness.
- **Roadmap language is reader-first.** Generated titles and descriptions must use clear professional language that a student can act on without knowing internal product or recruiting jargon. Treat career names as labels, not noun phrases to splice into generic sentences; prefer “your target field” or a concrete action when a role title would make the grammar awkward. Quality tests cover every career/stage combination and every career's reviewable-work goal.

## Technology stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Zod · `@anthropic-ai/sdk` through the server-only provider/structured-output layer in `lib/ai/` · `unpdf` for PDF text extraction · ESLint 9 · **Supabase Postgres + Supabase Auth** (`@supabase/supabase-js`, `@supabase/ssr`) · **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`, `postgres`) for schema/migrations/queries · **Vitest** (`@electric-sql/pglite` for integration tests against an in-memory Postgres).

## High-level directory structure

```
app/                    Routes: /, /discover, /accelerate, /onboarding, /dashboard, /profile, /saved,
                        /skillforge, /jobs, /login, /signup, /auth/callback, /api/*. Every page.tsx is a
                        thin server-component shell delegating to a client component — do not add
                        server-side data fetching to a page.tsx; put it behind a service call from the
                        client component. `/jobs` is in `proxy.ts`'s protected-route list (signed-in only).
components/             UI, grouped by feature: accelerate, auth, dashboard, discovery, landing, layout,
                        onboarding, profile, roadmap, saved, skillforge, ui (a small hand-rolled
                        design-system, no business logic).
context/, hooks/        ProfileContext + useProfile() — the ONLY app-wide state; backed by a real Supabase
                        session now (see Authentication conventions). Roadmaps and SkillForge progress are
                        loaded ad hoc per-component from services/*, not through Context.
lib/
  matching/             `engine.ts` — deterministic, questionnaire-preference-based career matching
                        (Discover; never casually rewritten, see below). `career-fit.ts` — a SEPARATE
                        deterministic engine scoring a student's confirmed profile (not questionnaire
                        answers) against a career with component scores + evidence; additive, not a
                        replacement for `engine.ts`. `evidence.ts` — shared fuzzy-text-matching helpers
                        used by `career-fit.ts` and `lib/jobs/fit-scoring.ts` (deliberately NOT merged into
                        `gap-analysis/engine.ts`'s own private copies of similar logic — see below).
  gap-analysis/         Deterministic gap-analysis engine — the authoritative input to BOTH roadmap
                        generation paths (AI and fallback). Read this file before touching either.
  jobs/                 Job-description analysis: `schema.ts` (zod, shared by AI + heuristic paths),
                        `ai-extractor.ts` (AI, retries once on a schema-invalid response),
                        `heuristic-extractor.ts` (no-AI-key fallback, section-header/keyword based),
                        `fit-scoring.ts` (deterministic — requirement-by-requirement matching, component
                        scores, `prioritizeGaps()`, requirement evidence sourced from
                        `lib/evidence/confidence.ts#gatherEvidenceForSkill`). Same AI-parses/
                        deterministic-scores split as `gap-analysis/engine.ts`; no LLM anywhere in
                        `fit-scoring.ts`.
  evidence/             `confidence.ts` — deterministic, quality-weighted skill-confidence scoring
                        (`SkillEvidenceRecord`/`SkillConfidenceScore`, `types/evidence.ts`) across four
                        dimensions (claimed/assessed/demonstrated/professional). A DIFFERENT, broader
                        concept than SkillForge's own `SkillEvidence`/`skill_evidence` (see Domain
                        boundaries below) — don't conflate the two. `build-context.ts` composes profile +
                        SkillForge progress + GitHub repos + manual evidence into the one shape both this
                        engine and `jobs/fit-scoring.ts` consume. See `docs/evidence-model.md`.
  github/                Repository analysis: `client.ts` (thin REST wrapper, rate-limit/error handling,
                        `GithubError`), `detectors.ts` (deterministic testing/CI/Docker/database/backend
                        signal detection from file-tree paths + parsed manifests — NEVER stars/forks/
                        commits), `manifest-parse.ts`, `map-to-skills.ts` (signals → named skill evidence),
                        `analyze-repo.ts` (orchestrates the above), `narrative.ts` (the one AI call in this
                        pipeline — a summary sentence over already-computed facts, deterministic template
                        fallback), `token-crypto.ts` (AES-256-GCM for a connected account's OAuth token).
                        See `docs/github-integration.md`.
  roadmap/              AI + fallback roadmap generation (the narrative `Roadmap`), pacing math, per-career
                        playbooks, target-resume benchmark. `pacing.ts` is the ONLY place "expected duration"
                        is computed for that narrative roadmap — never hardcode or re-derive a duration
                        elsewhere. `skill-graph.ts`/`priority.ts`/`adaptive-generator.ts`/`adaptive-phases.ts`/
                        `scheduler.ts`/`adaptation.ts`/`adaptive-input.ts`/`saved-job-signals.ts`/
                        `profile-to-request.ts` (Phase 3) are the SEPARATE, deterministic adaptive roadmap
                        engine (`types/adaptive-roadmap.ts`, `docs/roadmap-engine.md`) — a single,
                        continuously-recomputed scheduled plan, not the narrative `Roadmap` above. Never merge
                        the two systems; they answer different questions and CLAUDE.md protects both.
  skillforge/           Mastery math (`mastery.ts` — also owns `recomputeMastery()`/`freshProgress()`, pure
                        and storage-agnostic, imported directly by `repositories/skillforge-repository.ts`),
                        readiness checks, root-cause diagnosis, next-best-action, roadmap connection.
  resume/               PDF (`pdf-text.ts`) + DOCX (`docx-text.ts`) text extraction, `file-validation.ts`
                        (size/extension/MIME/magic-byte checks), AI (retries once on malformed) + heuristic
                        structured extraction, `validate-extraction.ts` (runtime-validates whichever path's
                        output before it's ever persisted/returned), shared zod schema.
  ai/                   Server-only Anthropic client — see "Never expose the API key" above.
  supabase/             Server/browser/admin Supabase clients + `middleware.ts` (session refresh, used by
                        `proxy.ts`; also owns `PROTECTED_PREFIXES`) + `storage.ts` (resume file storage —
                        private bucket, auto-created on first upload, signed-URL-only downloads) +
                        `config.ts` (`isSupabaseConfigured()`). See Authentication conventions.
  db/                   `schema/*.ts` (Drizzle table definitions, one file per domain group), `client.ts`
                        (lazy Postgres connection + test-injection seam), `with-user-context.ts` (the
                        RLS-enforcement seam — read before adding any repository function).
  api/                  `with-db-error-handling.ts` — every DB-backed route handler wraps its body in this.
repositories/           Owns Drizzle + `withUserContext()`. One module per entity group (profile, roadmap,
                        adaptive-roadmap, skillforge, career-match, activity, resume, job, github, evidence)
                        — see "One persistence boundary" above. `profile-repository.ts#ensureProfileId(tx,
                        userId)` is the shared helper any repository call needs when its feature can
                        legitimately happen before a full profile exists (resume upload, pasting a job
                        description) — call it from inside your own `withUserContext` transaction, don't
                        duplicate the lazy-create logic. `evidence-repository.ts` persists ONLY manual
                        `skill_evidence_records` rows — auto-derived evidence is never written here, see
                        `lib/evidence/confidence.ts`. `adaptive-roadmap-repository.ts` follows the same
                        delete-and-reinsert pattern as `roadmap-repository.ts` for phases/tasks, but its
                        `change_events`/`completed_history` child tables are genuinely APPEND-ONLY — never
                        add a code path that deletes or rewrites an existing row in either.
                        Phase 4 adds `application-repository.ts` (compact pipeline + stage events),
                        `analytics-repository.ts` (bounded/batched read model), and `rate-limit-repository.ts`
                        (atomic per-profile serverless throttling), all under the same ownership/RLS rules.
services/               Client-side fetch wrappers over `app/api/*` (profile, roadmap, skillforge, resume,
                        job, github, evidence) — no Drizzle/DB imports here, ever; these run in the browser.
drizzle/                `migrations/*.sql` (schema + hand-written RLS policies, applied by `scripts/
                        migrate.ts` in filename order — NOT drizzle-kit's own migrator), `test-support/
                        auth-stub.sql` (Supabase `auth.users`/`auth.uid()` stand-in for tests/non-Supabase
                        Postgres).
scripts/                `migrate.ts`, `seed-reference-data.ts` (careers + SkillForge modules — run before
                        anyone can save a career match or SkillForge progress), `seed-demo.ts` (the shared
                        "Try Demo" account, built entirely through the app's own real engines).
data/                   Curated, hand-authored, code-shipped datasets: careers.ts (~24 careers, 9
                        categories), skillforge-modules.ts (skill catalog), ai-advantage.ts. Seeded into
                        `careers`/`skill_modules` reference tables, not normalized.
types/                  Shared domain types — the actual source of truth for every data shape in the app.
                        `job.ts` adds `JobDescription`/`JobRequirement`/`JobFitAnalysis`/`RequirementMatch`;
                        `career.ts` adds `CareerFitBreakdown`/`CareerFitComponentScore`; `resume.ts` adds
                        `ResumeVersion`/`ResumeUploadResult`; `evidence.ts` adds `SkillEvidenceRecord`/
                        `SkillConfidenceScore`/`SkillConfidenceLevel` (NOT the same as `skillforge.ts`'s own
                        `SkillEvidence`/`ConfidenceLevel` — see Domain boundaries below); `github.ts` adds
                        `RepoAnalysis`/`GithubRepoRecord`/`DetectedSignal`.
tests/                  `unit/` (pure functions, no DB) and `integration/` (real repository/RLS tests
                        against an in-memory Postgres — see `tests/integration/db.ts`). `server-only` is
                        aliased to a no-op stub in `vitest.config.mts` so server-only modules can be unit-
                        tested directly (see `tests/support/server-only-stub.ts`).
docs/                   project-state.md (current status — read every session), architecture.md (diagrams),
                        database.md (schema + migration workflow), security.md (auth/RLS model),
                        evidence-model.md (skill-confidence formula), github-integration.md (repo-analysis
                        detectors, OAuth token handling), implementation-plan.md (phased plan),
                        SKILLFORGE_V1_SPEC.md (design intent).
```

## Domain boundaries

- **Discover** (career matching) and **Accelerate** (roadmap generation) share the same underlying `Career`/`CareerCategory` taxonomy (`types/career.ts`, `data/careers.ts`) and the same `StudentProfile`/`types/records.ts` structured shapes — never introduce a second career taxonomy or a second structured-record shape for a new feature; extend the existing ones.
- **SkillForge** deliberately does not introduce its own career taxonomy or its own "hours available" setting — it resolves a student's `targetCareers` through the same `resolveCareers()` used everywhere else, and reuses `weeklyHoursAvailable` + `calculateExpectedDuration()` for all pacing. It reads a student's actual `GapAnalysis` (via `lib/skillforge/roadmap-connection.ts`) to ground its "why" text and to mark roadmap gaps as demonstrated — this feedback loop is a real, load-bearing connection between the two systems, not a cosmetic cross-link.
- **Career playbooks** (`lib/roadmap/playbooks.ts`) are keyed by individual career id, not by `CareerCategory` — a category (e.g. "healthcare") can contain careers with genuinely different credential paths (MCAT vs. PCAT vs. DAT), and a category-wide playbook silently mis-recommends the wrong exam. Keep new playbook entries keyed by career id.
- **Two genuinely different `SkillEvidence` concepts exist — do not conflate or merge them.** `types/skillforge.ts#SkillEvidence`/`skill_evidence` is a manual link a student attaches to ONE curated `SkillModule`'s progress while working through the guided SkillForge loop (project/writing-sample/certificate/portfolio-link/other + a strength rating). `types/evidence.ts#SkillEvidenceRecord`/`skill_evidence_records` is a broader, cross-cutting model covering ANY named skill (not just the curated catalog), aggregating profile skills/experience/projects, analyzed GitHub repos, SkillForge's own assessed mastery (one INPUT, not a merge target), and manual entries into a deterministic confidence score (`lib/evidence/confidence.ts`). They're connected (assessed evidence reads SkillForge progress) but intentionally separate types/tables — a future session adding evidence-related fields should extend the one that actually matches the feature's scope, not whichever is more convenient to import.
- **`ProjectRecord.githubUrl`** (`types/records.ts`) is the one link between a profile's resume-entered projects and GitHub repository analysis (`types/github.ts#GithubRepoRecord`, matched by `htmlUrl`) — `lib/evidence/confidence.ts`'s demonstrated-evidence dimension and `/projects/[id]`'s detail view both key off this field. Don't introduce a second project-to-repo linking mechanism; `github_repos.linked_project_id` is a secondary, repo-side pointer for display/picker purposes only, not the source of truth the confidence engine reads.

## Database conventions

Real database: Supabase Postgres, schema owned by Drizzle. Full ER design and rationale: `docs/database.md`.
- Every table an authenticated user's data lives in is scoped by a real `profile_id` foreign key (`profiles.user_id` references Supabase's own `auth.users` — there is no separate app-level `users` table), and every route handler verifies the session owns the resource before reading/writing it, via `getServerUser()`.
- Every user-owned table also has a **`FORCE ROW LEVEL SECURITY`** policy (`drizzle/migrations/0001_rls_policies.sql`) as a backstop — not the primary mechanism, but not optional either. See "Authentication conventions" and `docs/security.md` for why `FORCE` specifically matters here.
- Curated content (`careers`, `skill_modules`) is seeded as `jsonb`-backed reference tables mirroring `data/*.ts` (`npm run db:seed:reference`) — do not normalize their internals into columns prematurely; there's no query need for it yet.
- AI-or-fallback-generated narrative content (roadmap phase resources, certification guidance, etc.) stays JSONB — only normalize a field into its own table/columns when something needs to query or join on it (`gap_items`, `roadmap_phases`/`roadmap_tasks`, and `assessment_attempts` are normalized for exactly this reason).
- Every résumé-style date field (`education.start_date`, `experience.end_date`, `projects.date`, `awards.date`, `certifications.date`) is `text`, not SQL `date` — a real bug this codebase already hit once (partial dates like `"2022-08"` fail Postgres's `date` parser). Only `profiles.target_date` and `applications.applied_at` are real `date` columns, since those are fed exclusively by an HTML `<input type="date">`. Do not "fix" the text columns back to `date`.
- Schema changes: edit `lib/db/schema/*.ts`, then `npm run db:generate` (drizzle-kit) followed by `npm run db:migrate` (the project's own runner, `scripts/migrate.ts` — not drizzle-kit's migrator, since it also needs to run hand-written RLS SQL in the same sequence). **`drizzle-kit generate` will emit a `CREATE TABLE "auth"."users"` statement** (because `lib/db/schema/auth.ts` stubs it for FK typing) — always strip that statement before the migration ever touches a real Supabase database, which already owns that table.
- `activity_events` is the structured source for longitudinal analytics and auditability. Log meaningful state changes (evidence, assessment, roadmap task, readiness, job analysis, application stage, resume), never clicks or document bodies. Analytics must not synthesize missing history.
- Expensive external/AI endpoints consume `api_usage_windows` through `enforceRateLimit()` after verifying the session and before the external call. Do not replace this with an in-memory map; serverless instances do not share memory.

## Authentication conventions

Real Supabase Auth: email/password, magic link, Google/GitHub OAuth. OAuth buttons are advertised only when the corresponding `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH` / `NEXT_PUBLIC_ENABLE_GITHUB_AUTH` flag is `true` and the provider is already active in Supabase; never expose a provider button that leads to a disabled-provider error. `proxy.ts` (Next.js 16's renamed `middleware.ts`) refreshes the session and server-side redirects unauthenticated requests away from protected routes — this is enforced before any page renders, not just hidden client-side.

`useProfile()`'s public shape is `profile`, `isAuthenticated`, `isLoading`, `createProfile`, `updateProfile`, `completeOnboarding`, `signOut`, `deleteProfile` (clears data, keeps the account), `deleteAccount` (irreversible — deletes the Supabase user itself), `refreshProfile`.

**The one detail most likely to be gotten wrong when extending this code:** the app talks to Postgres **directly** via Drizzle (`postgres.js`), not through Supabase's PostgREST API. PostgREST would normally forward a caller's verified JWT and enforce RLS automatically; a direct connection does not. That's why every RLS policy is declared with `FORCE ROW LEVEL SECURITY` (Postgres otherwise skips RLS for a table's owner, which the app's connecting role typically is) and why `lib/db/with-user-context.ts` manually sets the `request.jwt.claim.sub` session variable — mirroring exactly what PostgREST would have set — inside a transaction before every repository query. Skip either piece and RLS becomes silently decorative. `tests/integration/rls-isolation.test.ts` is the regression test for this; if you touch `with-user-context.ts` or the RLS migration, that suite must still pass.

## AI usage rules / deterministic-vs-AI decision rule

Ask this before adding any new scoring, ranking, matching, or "how am I doing" feature: **can this be computed from structured data the app already has, with an explainable formula?** If yes, it must be deterministic, following the existing pattern (a pure function, documented weights/thresholds, unit-testable, no AI call in the scoring path itself). AI is reserved for: (1) turning unstructured text into structured data (resumes, job descriptions, eventually READMEs), (2) generating narrative/prose content on top of already-computed structured results (the roadmap's writing, not its gap analysis), and (3) grading open-ended free-response answers where there's no deterministic way to check correctness. When in doubt, match the `lib/gap-analysis/engine.ts` → `lib/roadmap/ai-generator.ts` split: deterministic analysis first, AI narrative second, and the AI is instructed never to contradict or recompute the deterministic input.

## Testing requirements

**Vitest is configured** (`vitest.config.mts`, `npm test` / `npm run test:unit` / `npm run test:integration`). Two kinds of tests, kept in separate directories:
- `tests/unit/*` — pure functions, no DB, no network. `mastery.test.ts`, `pacing.test.ts`, `matching-engine.test.ts`, `career-fit.test.ts`, `job-fit-scoring.test.ts`, `job-heuristic-extractor.test.ts`, `job-ai-extractor.test.ts`, `resume-file-validation.test.ts`, `skill-confidence.test.ts`, `github-client.test.ts`, `github-detectors.test.ts`, and `github-analyze-repo.test.ts` exist; `lib/gap-analysis/engine.ts` is the one remaining deterministic engine with **no** coverage — top-priority test debt, required before that file's logic is next changed. Required cases for any deterministic scoring function: empty input, single item, multiple items, and the specific documented invariants in that file's comments (e.g. "no fake progress" in `mastery.ts`, "long-term credentials never crowd Phase A" in `gap-analysis/engine.ts`, the exact worked example in `docs/evidence-model.md` for `confidence.ts`). Server-only modules (`server-only` package) can be unit-tested directly — it's aliased to a no-op stub in `vitest.config.mts`, so don't strip `import "server-only"` from a file just to make it testable.
- `tests/integration/*` — real repository/RLS behavior against an in-memory Postgres (`@electric-sql/pglite`), injected into `lib/db/client.ts` via the test-only `__setTestDb()` seam (see `tests/integration/db.ts`). Repository code under test runs completely unmodified. **When adding a new repository function that touches user-owned data, add or extend an RLS isolation test** (`rls-isolation.test.ts`) proving a second user can't read/write it — this is the one category of bug that's easy to introduce silently (a repository query that forgets a `WHERE profile_id = ...` clause looks correct until RLS is the only thing left blocking it).
- Test AI integrations at the provider boundary (`AIProvider.generateStructured` or the legacy Anthropic client), including malformed output, timeout, and missing-configuration behavior. Do not mock a feature function's final return value in a way that bypasses its prompt/schema validation.
- CI (`.github/workflows/ci.yml`) runs lint → typecheck → unit → integration → build on every PR, with no Supabase secrets configured — the integration suite must keep working against pglite alone; never make it depend on a real `DATABASE_URL` being present.

## Security expectations

- Server-only secrets (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DEMO_USER_PASSWORD`, `GITHUB_TOKEN`, `GITHUB_TOKEN_ENCRYPTION_KEY`) are read only in server-only modules (several marked with the `server-only` package), never in anything importable from a `"use client"` file. A connected student's GitHub OAuth token is additionally AES-256-GCM-encrypted at rest (`lib/github/token-crypto.ts`) and never returned from any API route — see `docs/github-integration.md`.
- Every file upload (resume PDFs today; eventually other artifacts) needs a size cap enforced as early as possible (before the request body is fully buffered where feasible) and a content-type check — accept that a client-declared MIME type is not proof of file content, and don't treat it as one.
- Every API route authorizes the request via `getServerUser()` (does this session's user own this resource?), not just checks that a session exists — see `docs/security.md`.
- Any auth redirect target must pass through `lib/security/safe-redirect.ts`; query-string redirect destinations are untrusted. Structured logs must never include resume/job text, uploaded documents, OAuth tokens, or request bodies.
- Never trust a client-supplied `userId`/`profileId` anywhere, even in a request body that also happens to carry other legitimate data (e.g. `POST /api/roadmaps`'s body includes a `userId` field on the `SavedRoadmap` object — the route handler overwrites it with the server-verified id before ever calling a repository; follow this pattern for any new route accepting a body shape that happens to contain an id-like field).

## Coding conventions

- Prefer editing existing files; the codebase is intentionally small and cohesive per domain.
- Long-form content (bullets, summaries, descriptions) is always a textarea/list in the data model, never a chip/tag; only genuinely short categorical values (skills, interests) are chips (`components/ui/tag-list-input.tsx`, `toggle-chip.tsx`).
- New structured record types (education/experience/project/award/certification-like) should reuse `components/profile/record-section.tsx`'s generic pattern rather than hand-rolling another CRUD list UI.
- Business logic (calling into `lib/*` domain engines) belongs in a hook or `services/*` call, not directly inside a large page-level component's `useMemo` chain — `components/skillforge/skill-detail-view.tsx` is the current counter-example flagged for refactor in `docs/project-state.md`; don't add a second one.

## Commands

```bash
npm run build              # production build — MUST pass before any change is considered done, see below
npm run lint                # eslint
npm run typecheck           # tsc --noEmit
npm test                    # vitest run (unit + integration)
npm run test:unit           # pure-function tests only, no DB
npm run test:integration    # repository/RLS tests against in-memory Postgres (pglite)
npm run test:e2e            # Playwright desktop/mobile smoke + axe; real demo journeys run when E2E_DEMO=1
npm run dev                 # local dev server
npm run db:generate         # drizzle-kit generate — schema change -> new migration file
npm run db:migrate          # apply pending migrations (scripts/migrate.ts, not drizzle-kit's migrator)
npm run db:seed:reference   # seed careers + SkillForge modules (run once per fresh DB, before anything else)
npm run db:seed:demo        # seed/refresh the shared "Try Demo" account
```

## Important files/modules (read first in a fresh session)

`docs/project-state.md` → `docs/database.md` → `docs/security.md` → `docs/evidence-model.md` → `docs/github-integration.md` → `docs/skill-graph.md` → `docs/roadmap-engine.md` → `docs/architecture.md` → `docs/implementation-plan.md` → `types/profile.ts` + `types/roadmap.ts` + `types/adaptive-roadmap.ts` + `types/skill-graph.ts` + `types/skillforge.ts` + `types/evidence.ts` → `lib/gap-analysis/engine.ts` (the single most important piece of business logic in the app) → `lib/roadmap/adaptation.ts` (the adaptive roadmap engine's orchestration point) → `repositories/profile-repository.ts` (the template every other repository follows) → `lib/db/with-user-context.ts` (the RLS-enforcement seam).

## Things that must not be casually rewritten

- `lib/gap-analysis/engine.ts`, `lib/matching/engine.ts`, `lib/skillforge/mastery.ts`, `lib/roadmap/pacing.ts` — deterministic, audited, and load-bearing. Extend with new cases; don't restructure the scoring approach without a strong reason documented in `docs/project-state.md`. `lib/matching/career-fit.ts`, `lib/jobs/fit-scoring.ts`, `lib/evidence/confidence.ts`, and the adaptive roadmap engine (`lib/roadmap/{skill-graph,priority,adaptive-generator,scheduler,adaptation}.ts`) follow the same discipline going forward, now that they exist — deterministic, documented weights/thresholds, unit-tested, no AI in the scoring/scheduling path.
- `lib/roadmap/fallback.ts` — must always work and must never regress, since it's the guaranteed no-AI-key path.
- `repositories/*.ts`'s exclusive ownership of Drizzle/`withUserContext()` — don't add a second file that imports `lib/db/schema` directly.
- `lib/db/with-user-context.ts` and the `FORCE ROW LEVEL SECURITY` policies in `drizzle/migrations/0001_rls_policies.sql` — together they're what makes RLS real rather than decorative (see Authentication conventions above). Don't remove `FORCE` from a policy or stop setting `request.jwt.claim.sub` without understanding exactly what that turns off.
- The `SkillModule`/`SkillProgress`/`MasteryDimensionScores` shapes in `types/skillforge.ts` — SkillForge's UI, repository layer, and decision engines (`next-action.ts`, `readiness.ts`, `diagnosis.ts`) all depend on the current shape; a field rename ripples through all of them.

## Known architectural constraints

- No CI-verified real Supabase project (CI's integration tests run against pglite, not a live Supabase instance) — see `docs/project-state.md` "Known Issues" for the full, current list (kept there, not here, since that list changes).
- Every AI-backed feature must keep working with `ANTHROPIC_API_KEY` unset, and every DB-backed feature must keep working (returning a clear 503, never crashing) with `DATABASE_URL` unset — both verified manually and both now have at least partial automated coverage (the AI paths via existing fallback logic reviewed in earlier sessions; the DB path via `DatabaseNotConfiguredError` + `getDb()`'s lazy-init pattern, not yet under an automated test).

## Instructions for future Claude sessions

1. Read `docs/project-state.md` first, every session — it is the authoritative, current-as-of-last-update status and supersedes any stale impression from this file's examples or from an old chat transcript.
2. If you make a meaningful architectural or feature change, update `docs/project-state.md` before finishing. If you change a durable convention, a required command, or a domain boundary, update this file too.
3. Do not claim something is implemented in either file unless you've actually verified it in the code — this codebase has already had one documentation file (`docs/CURRENT_STATE.md`, now retired) go stale enough to actively mislead a fresh session; don't repeat that.

---

## Known environment quirk

OneDrive occasionally re-syncs a stray duplicate `pathfinder/pathfinder/` scaffold folder (with its own `node_modules`) inside this repo. It pollutes `eslint`/`tsc`/`next build` output if present. Check for it and delete it before running any validation command:

```bash
rm -rf pathfinder/pathfinder 2>/dev/null; true
```

---

# Mandatory build-validation loop

**This is a hard requirement, not a suggestion: after every code change (every edit, every batch of related edits, every file you touch), you must run a production build and confirm it succeeds before considering the change done.**

Workflow for every change:

1. Make the code change.
2. Check for and remove the stray `pathfinder/pathfinder/` folder if present (see above) — it will otherwise produce false failures.
3. Run the build:
   ```bash
   npm run build
   ```
4. **If the build fails**: read the actual error, fix the root cause in source (never suppress errors, never add `// @ts-ignore`/`eslint-disable` to hide a real problem, never delete the failing check), then run `npm run build` again.
5. Repeat step 4 until `npm run build` succeeds cleanly.
6. Only once the build is green, also run:
   ```bash
   npm run lint
   npx tsc --noEmit
   ```
   and fix anything they surface the same way — fix and re-run, don't report and move on.

Do not tell the user a change is complete, and do not move on to the next task, while `npm run build` is failing. A change that doesn't build is not done. If a build failure turns out to be pre-existing and unrelated to your change, say so explicitly rather than silently ignoring it — but still attempt a fix before treating it as out of scope.
