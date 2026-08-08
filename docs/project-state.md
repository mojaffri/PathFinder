# PathFinder — Project State

Read this after [`CLAUDE.md`](../CLAUDE.md) and before touching code. This file describes what's actually true right now; `CLAUDE.md` describes durable rules that don't change week to week. See also [`architecture.md`](./architecture.md) (diagrams), [`database.md`](./database.md) (schema), [`security.md`](./security.md) (auth/RLS model), and [`implementation-plan.md`](./implementation-plan.md) (phased roadmap).

## Last Updated

2026-08-08 (session 3) — Evidence-backed skills + GitHub integration built this session, finishing the rest of Phase 2: a new cross-cutting `SkillEvidenceRecord`/`SkillConfidenceScore` domain model with a deterministic, quality-weighted (not count-based) confidence engine; GitHub repository analysis (deterministic detectors for testing/CI/Docker/database/backend signals, never stars/forks/commits) via both a public-username/repo path (no auth) and an OAuth-connect path reusing Supabase's existing GitHub sign-in provider (`supabase.auth.linkIdentity`, no separate OAuth app); a `/projects` project-analyzer page; and the job-fit engine's `RequirementMatch.evidence` upgraded from plain strings to the same structured, clickable evidence records. The adaptive roadmap/skill-graph (Phase 3) remains explicitly out of scope. This supersedes session 2's checkpoint (résumé upgrade + career-fit engine + job analysis), which is otherwise unchanged and summarized below.

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

The four deterministic domain engines (`lib/matching/engine.ts`, `lib/gap-analysis/engine.ts`, `lib/skillforge/mastery.ts`, `lib/roadmap/pacing.ts`) are **unchanged** from before this phase — this phase only replaced the persistence/auth boundary around them, per `CLAUDE.md`'s rule that they're not casually rewritten.

`proxy.ts` (not `middleware.ts` — Next.js 16 renamed the file convention; see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`) refreshes the Supabase session on every request and server-side redirects unauthenticated visitors away from protected routes.

---

## Implemented Features

**Everything from Phase 1 and session 2 still works**, unchanged: Discover, Accelerate, roadmap generation, SkillForge's full guided-freedom loop, real accounts/auth, onboarding, demo mode, resume upgrade, career-fit scoring, job analysis. See `docs/architecture.md` §1 and session 2's summary further down.

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

**Supabase Postgres**, schema owned by Drizzle (`lib/db/schema/*.ts`, 30 tables — 27 as of session 2 plus `github_connections`/`github_repos`/`skill_evidence_records`, new this session; `projects` also gained a real `github_url` column, see `docs/database.md`'s "Migration history"). `localStorage` is not used anywhere in the app. Full schema, ER diagram, and design rationale: [`database.md`](./database.md).

Key structural decisions:
- `profiles.user_id` references Supabase's own `auth.users` — there is no separate app-level `users` table.
- `careers` and `skill_modules` are seeded JSONB reference tables (`npm run db:seed:reference`), not normalized.
- Every résumé-style date field (`education.start_date`, etc.) is `text`, not SQL `date` — a real bug caught by Phase 1's own tests (see "Bugs Fixed" in the Phase 1 summary below).
- `applications` remains schema-only (tables + RLS), unused until Phase 4. `job_descriptions`/`job_requirements`/`job_matches`/`github_connections`/`github_repos`/`skill_evidence_records` are all implemented and in active use.
- `skill_evidence_records` stores **only manually-added** evidence — every auto-derived piece (from the profile, SkillForge progress, or an analyzed GitHub repo) is recomputed on read, never persisted redundantly. See `docs/evidence-model.md`.

---

## Authentication

Real Supabase Auth. See [`security.md`](./security.md) for the full model — the one detail worth restating here because it's easy to get wrong when extending this code: **the app talks to Postgres directly via Drizzle, not through Supabase's PostgREST API**, so RLS policies only actually apply because (a) they're declared with `FORCE ROW LEVEL SECURITY` and (b) `lib/db/with-user-context.ts` manually sets the `request.jwt.claim.sub` session variable that PostgREST would otherwise have set automatically from the caller's verified JWT. Getting either of those wrong makes RLS silently decorative. A real test proves it isn't: `tests/integration/rls-isolation.test.ts`.

---

## AI Integration

Unchanged from before this phase — see `docs/security.md`'s secrets table and `CLAUDE.md`'s AI usage rules. Three AI-backed services (resume extraction, roadmap generation, SkillForge grading), each with a guaranteed deterministic/heuristic fallback. Not verified against a live `ANTHROPIC_API_KEY` this session (none is configured in this local environment).

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

## Tests

**76 tests, 12 files, all passing** (was 28/4 at the end of Phase 1):

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
- `github-analyze-repo.test.ts` (2, new) — mocks the `client.ts` functions: a full realistic analysis produces the expected detected signals/skills/summary; a languages/tree API failure degrades to a sparser-but-valid analysis rather than throwing.

Integration (real repository/RLS behavior against pglite) — `tests/integration/`:
- `profile-repository.test.ts` (6), `resume-repository.test.ts` (7), `job-repository.test.ts` (6) — unchanged from session 2.
- `rls-isolation.test.ts` (7, was 5) — session 2's five cases plus two new ones this session: an analyzed GitHub repository (`getRepo`/`deleteRepo`, filtering only by id) and manually-added skill evidence (`listManualEvidence`, filtered by `profile_id`) are both proven unreadable/unmodifiable by a second user. Per CLAUDE.md's rule, this was required for `github-repository.ts`'s/`evidence-repository.ts`'s new repository functions.

**Test infrastructure:** `tests/integration/db.ts` now applies migrations `0000` → `0006` (`0005_evidence_and_github_schema.sql` + `0006_evidence_and_github_rls.sql` added this session — a new migration must be added to this list or the harness silently won't see it). `server-only` is now aliased to a no-op stub in `vitest.config.mts` (`tests/support/server-only-stub.ts`) so server-only modules (`lib/github/client.ts`, `lib/github/token-crypto.ts`, etc.) can be unit-tested directly without the real package throwing outside a Next.js server-component build — a reusable pattern for any future server-only file that needs direct unit coverage. The non-superuser `app_role` switch is unchanged from Phase 1.

**Not yet covered (tracked as debt):** `lib/gap-analysis/engine.ts` still has zero direct unit coverage — still the top test-debt item the next session that touches that file should close first, per CLAUDE.md.

---

## Deployment

Live at https://path-finder-umber.vercel.app/ — **not yet redeployed with this phase's changes** (no Supabase project has been provisioned for the production deployment as part of this session; that's a manual step requiring real credentials, which this session couldn't do). Once a Supabase project exists and its env vars are set in Vercel, run `npm run db:migrate` and `npm run db:seed:reference` against it before the first real user signs up. If GitHub OAuth-connect is wanted in production, also enable GitHub as a Supabase Auth provider and set `GITHUB_TOKEN_ENCRYPTION_KEY` (public username/repo analysis needs neither). `.github/workflows/ci.yml` runs lint/typecheck/tests/build on every PR.

---

## Known Issues

**Closed this session:** GitHub project analysis (was session 2's "Next Recommended Phase" #1) — done, see "GitHub Integration" above. `projects.github_url` being schema-only/unwired is also closed (now real).

**Carried over, still open:**
1. `lib/resume/pdf-text.ts`/`docx-text.ts` has no timeout/resource ceiling around document parsing.
2. `components/skillforge/skill-detail-view.tsx` (691 lines) mixes data-fetching, several `useMemo` chains into domain engines, and ~10 rendered sections in one file.
3. No unit tests for `lib/gap-analysis/engine.ts` — top test-debt priority the next session that touches it.
4. No rate limiting anywhere (`/api/skillforge/evaluate`, `/api/jobs`, and now every `/api/github/*` route are all real per-request costs — Anthropic spend or GitHub API quota — with no throttle on a single account's volume).
5. Demo mode is a single shared account with no per-visitor isolation or auto-reset. Documented as an accepted limitation in `docs/security.md`.
6. Production Vercel deployment has not been reconnected to a real Supabase project — see "Deployment" above.
7. `lib/jobs/fit-scoring.ts#estimateYearsOfExperience` is a best-effort estimate from free-text resume dates — genuinely approximate by design.
8. `/jobs` has no URL-import option (paste-only) — a deliberate scope decision, not an oversight.
9. `lib/jobs/heuristic-extractor.ts`'s required-vs-preferred classification depends entirely on section-heading detection.

**New this session:**
10. GitHub OAuth-connect (`supabase.auth.linkIdentity` + `app/auth/callback/route.ts`'s token capture) is real code, typechecked and built, but **not live-verified** — no Supabase project with GitHub enabled is configured in this local environment. Public username/repo analysis (the primary path) doesn't share this gap — it needs no auth infrastructure at all.
11. No revocation call to GitHub's own token-revocation endpoint on "Disconnect" — only the local encrypted copy is deleted. Documented as acceptable for a `read:user`-only, non-`repo`-scoped token in `docs/github-integration.md`, but worth adding for defense-in-depth later.
12. The GitHub file-tree fetch (`git/trees/{branch}?recursive=1`) is capped at whatever GitHub returns before truncating (~100k entries) — an enormous monorepo gets a partial (not wrong, just incomplete) signal picture.
13. `lib/evidence/confidence.ts`'s "claimed" dimension treats a skill as binary present/absent — the current `StudentProfile.currentSkills` shape has no per-skill self-rated proficiency level (the task's own worked example implies one, e.g. "Claimed: Advanced"), so "claimed" evidence is presence-only rather than a graded claim. Extending `currentSkills` to carry an optional level would be a real (if small) profile-schema change, deliberately not done this session to avoid scope creep into the resume/profile UI.

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

---

## Current Phase

Phase 2 — Flagship Intelligence, **complete**: résumé upgrade, centralized deterministic career-fit scoring, job-description analyzer + deterministic job-fit engine (session 2), plus evidence-backed skills + GitHub integration (this session). Phase 3 (adaptive skill graph/scheduler) untouched — explicitly out of scope per this session's own instructions ("do not build the full roadmap scheduler in this phase").

## Next Recommended Phase

Two reasonable next steps, in priority order:

1. **Close the remaining test-debt gap:** `lib/gap-analysis/engine.ts` still has zero direct unit coverage — the last major deterministic engine without it, now that `matching/engine.ts`, `matching/career-fit.ts`, `jobs/fit-scoring.ts`, and `evidence/confidence.ts` all have real coverage.
2. **Phase 3 — Adaptive System** per `docs/implementation-plan.md`: formalize the SkillForge prerequisite graph, add a deterministic weekly scheduler reusing `lib/roadmap/pacing.ts`'s duration math. This session's evidence/GitHub work is a natural input to Phase 3 (a skill demonstrated via a strong analyzed repo could inform scheduling priority) but that connection is not built yet — Phase 3 should decide deliberately whether/how to wire it in, not inherit it accidentally.

Before either: provision a real Supabase project for the Vercel deployment (still not done — see "Deployment"), and live-verify the GitHub OAuth-connect path against a real Supabase project with GitHub enabled (see "GitHub Integration" above — the only piece of this session's work that couldn't be exercised end-to-end locally).

## Important Files

Read these first in a fresh session, in this order: `CLAUDE.md` → this file → `docs/database.md` → `docs/security.md` → `docs/evidence-model.md` → `docs/github-integration.md` → `docs/architecture.md` → `docs/implementation-plan.md` → `types/profile.ts` + `types/roadmap.ts` + `types/skillforge.ts` + `types/job.ts` + `types/evidence.ts` + `types/github.ts` → `lib/gap-analysis/engine.ts` → `lib/evidence/confidence.ts` (the newest deterministic engine, same discipline) → `repositories/profile-repository.ts` (the template every other repository follows) → `lib/db/with-user-context.ts` (the RLS-enforcement seam — read this before adding any new repository function).

## Verification Status

Run 2026-08-08 (session 3), this exact repository state:

```
$ npm run lint         → clean, no output
$ npx tsc --noEmit     → clean, no output
$ npm test             → 106 passed (16 test files)
$ npm run build        → clean (Next.js 16.2.11, Turbopack, all routes generated, including
                          /projects, /projects/[id], /api/github/*, /api/skills/*)
```

**Not verified this session** (no real Supabase or Anthropic credentials configured in this local environment, and no live GitHub OAuth app/provider to exercise — same infrastructure gap every prior session has carried): the full signed-in GitHub-connect (`linkIdentity` → `app/auth/callback` token capture → encrypted storage) flow; a live public-username/repo GitHub API analysis (mocked in tests, never hit the real API this session); the `/projects` page's actual rendered UI in a browser (no dev server was run — this was a code+test+build verification session, not a manual in-browser one). All new logic is covered by unit tests (mocking `fetch`/the Anthropic client boundary, never faking a function's return value directly, per CLAUDE.md's testing rule) and repository-level integration/RLS tests against pglite. A live Supabase + Anthropic + GitHub smoke test, plus an actual in-browser walkthrough of `/projects`, remains the responsible next verification step before calling this phase fully proven in production.
