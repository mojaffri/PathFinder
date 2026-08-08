# PathFinder / SkillForge — Current State

**Last updated:** 2026-07-29, as a pre-context-clear checkpoint. This file describes the exact state of the repository at that moment — read it before writing any SkillForge code. Where this file and the code disagree, the code is right; re-run the verification commands below to refresh this file.

For SkillForge's target design, see [`SKILLFORGE_V1_SPEC.md`](./SKILLFORGE_V1_SPEC.md). This file is about what's actually built.

---

## Completed

These are implemented, wired end-to-end, and confirmed by a passing `npm run build` + `npx tsc --noEmit` + `npm run lint`.

**Discover, Accelerate, roadmap generation, playbooks, gap analysis** (pre-existing, unrelated to this session's SkillForge work — untouched and still working):
- `app/discover`, `components/discovery/*`, `lib/matching/engine.ts` — 4-step questionnaire, deterministic scoring against `data/careers.ts` (46 careers, 9 categories).
- `app/accelerate`, `components/accelerate/*`, `components/profile/*` — resume upload + manual entry, cascading target-field → target-career selection.
- `app/api/roadmap/route.ts`, `lib/roadmap/*` — deterministic gap analysis + AI/fallback roadmap generation, per-career playbooks (`lib/roadmap/playbooks.ts`, one entry per career id, exhaustive by construction).

**SkillForge type system** — `types/skillforge.ts`:
- Original V1 shape: `SkillModule`, `SkillProgress`, `MasteryLevel` (6-level ladder), `MasteryDimensionScores`, `EvidenceStrength`, `LearningResource`, `PracticeExercise`, `ProjectChallenge`, `SkillEvidence`, `SkillDependency`, `SkillForgeState`, `InterviewModule`/`InterviewSession`/`InterviewEvaluation`/`InterviewQuestion` (types only).
- Guided-freedom extensions added this session: `SkillConcept`, `LearnOverview`, `AssessmentQuestion`, `SkillDiagnostic` (the "Test Me First" content), `QuestionVerdict`/`QuestionEvaluation`/`SkillEvaluationResult` (AI grading output shape), `ConfidenceLevel`, `SkillAttempt`/`SkillAttemptResponse` (persisted diagnostic/assessment attempts), `ReadinessGap`/`ReadinessCheck`, `DiagnosisResult`, `NextBestAction`/`NextBestActionType`. `MasteryResult` now carries `confidence: Record<"knowledge"|"ability", ConfidenceLevel>`. `SkillModule` now requires `concepts`, `learnOverview`, `diagnostic`; `SkillAssessment` now requires `questions`; `LearningResource` now requires `depth: "core"|"deeper"`.

**SkillForge storage & mastery math** — `services/skillforge-service.ts`, `lib/skillforge/mastery.ts`:
- Same array-keyed-by-`userId` pattern as `roadmap-service.ts`, on `lib/storage/local-storage.ts` + `lib/storage/keys.ts` (`skillforge` key).
- `recomputeMastery()` redesigned this session to implement the spec's "no fake progress" rule: resource/exercise completion alone caps knowledge/ability at a low ceiling (25/20 points); real credit comes from `Math.max()` against AI-evaluated attempt scores and (for ability) reviewed/submitted project status. A student who tests out via a diagnostic with zero resources checked can reach a high mastery level; a student who checks every box but never demonstrates anything cannot.
- `computeConfidence(evaluatedAttemptCount)` in `lib/skillforge/mastery.ts`: 0-1 evaluated attempts → low, 2 → medium, 3+ → high. Deliberately count-based, not the AI's self-reported confidence.
- `recordAttempt(userId, module, stage, responses, evaluation)` persists a diagnostic/assessment attempt; `evaluation: null` (AI unavailable) still persists the raw `responses` so nothing is lost.
- All original mutators (`markResourceCompleted`, `markExerciseCompleted`, `setProjectChallengeStatus`, `addEvidence`, `removeEvidence`, `setInterviewSelfRating`) preserved and updated to call the new `recomputeMastery`.

**SkillForge AI evaluation backend** — `lib/skillforge/evaluation-schema.ts`, `lib/skillforge/ai-evaluator.ts`, `app/api/skillforge/evaluate/route.ts`:
- Mirrors `lib/roadmap/ai-generator.ts` / `lib/roadmap/schema.ts` / `app/api/roadmap/route.ts` exactly: zod-validated request, structured tool-use extraction (`tool_choice: {type:"tool"}`), zod-validated response, `evaluateSkillResponses()` returns `null` on any failure (no key, network error, bad response) rather than throwing.
- Route handler always returns HTTP 200 with `{ evaluation: SkillEvaluationResult | null }` — a `null` evaluation is an expected, handleable state, not an error.
- **Not yet called by any UI** — see Partially Completed below. Reachable directly via `POST /api/skillforge/evaluate` today (e.g. with curl) but there is no client code that calls it yet.

**SkillForge decision engines** — `lib/skillforge/readiness.ts`, `lib/skillforge/diagnosis.ts`, `lib/skillforge/next-action.ts`:
- `checkReadiness(module, allModules, getProgress)` — non-blocking prerequisite-gap detector; returns `ReadinessGap[]`, never something a UI should use to disable a control.
- `diagnoseWeakConcept(module, allModules, weakestConceptId)` — same-module-first, then breadth-first-nearest-prerequisite concept backtracking. Statically verified against the actual `data/skillforge-modules.ts` content (see Architecture → Content below) but never exercised end-to-end with a real AI evaluation, because no UI calls it yet.
- `computeNextBestAction(module, progress, readiness, allModules)` — deterministic decision ladder (diagnostic → learn → practice → build → evidence → interview → assessment → advance).
- **Not yet called by any UI** — implemented and type-correct, unit-testable in isolation, but zero render path currently invokes them.

**SkillForge content catalog** — `data/skillforge-modules.ts`:
- 10 `SkillModule` entries (the original 9 plus a new `statistics-fundamentals` module added this session as a genuinely shared prerequisite). Every module has `concepts` (2-3 each), `learnOverview`, `diagnostic.prompts` (2 each), `assessment.questions` (2-3 each), resource `depth` tags, and `conceptId` on at least one exercise per module.
- `statistics-fundamentals` is a real prerequisite of `financial-modeling-fundamentals` and `applied-statistics-messy-data-modeling` (`prerequisites: ["statistics-fundamentals"]`), and both of those modules' assessments include one question deliberately tagged with a concept id (`descriptive-statistics`, `probability-basics`) that exists ONLY in `statistics-fundamentals`, not in the module's own `concepts` array — a concrete, statically-verified case for the backtracking engine to resolve correctly if/when it's wired up and a real evaluation flags that concept as weak.
- `applied-statistics-messy-data-modeling` also has an own-module concept `classification-metrics` (precision/recall) matching the spec's own "same-skill diagnosis" worked example.

**SkillForge dashboard/detail UI (original V1 shape, pre-guided-freedom)** — `app/skillforge/page.tsx`, `app/skillforge/skills/[skillId]/page.tsx`, `components/skillforge/{skillforge-dashboard,skill-card,mastery-badge,mastery-dimensions,skill-detail-view}.tsx`, navbar link in `components/layout/navbar.tsx`:
- Dashboard: target career, current roadmap phase, evidence/interview readiness stat cards, highest-priority skill, top weekly moves, skills-in-progress grid, all-matched-skills grid.
- Detail page: mastery + dimensions, effort/timing, prerequisites list, Learn (checkable resource list — does NOT yet render `learnOverview`), Practice (checkable exercises), Build (project status dropdown), "Prove it" (still the OLD shape — description/passingCriteria text + an evidence-adding list, does NOT yet render `assessment.questions` or call the evaluate API), Interview (self-rating), full mastery ladder.
- This UI compiles and runs correctly against the new, larger `SkillModule` type (extra required fields don't break code that only reads a subset), but it does not exercise any of the guided-freedom features below.

---

## Partially Completed

**Guided Freedom UI** — nothing in `components/skillforge/skill-detail-view.tsx` or `skillforge-dashboard.tsx` currently:
- Shows the 4 entry-point buttons (Start Learning / Practice First / Test Me First / Start Project).
- Renders a Next Best Action banner (`computeNextBestAction` is implemented but uncalled).
- Shows the non-blocking readiness warning (`checkReadiness` is implemented but uncalled).
- Renders `learnOverview` (explanation/objectives/keyConcepts/examples/commonMistakes) anywhere.
- Distinguishes resource `depth: "core"` vs `"deeper"` visually (the field exists on the data but the UI renders all resources identically).
- Offers a "Test Me First" diagnostic flow at all (`module.diagnostic.prompts` is authored data with zero UI consumer).
- Calls `POST /api/skillforge/evaluate` from anywhere (no `fetch` to that route exists in any client component).
- Shows AI evaluation results, failure diagnosis, or the Review/Retry/Continue-Anyway action set.
- Shows dimension confidence (`mastery.confidence`) — `components/skillforge/mastery-dimensions.tsx` still renders the original 4-row Knowledge/Ability/Evidence/Interview display with no confidence indicator.

**Consequence:** because nothing in the running app can currently create a `SkillAttempt`, the entire evaluated-attempt branch of `recomputeMastery()` (AI-evaluated knowledge/ability scores, confidence calculation) is implemented but currently unreachable by an actual user — `progress.attempts` will always be `[]` in practice today. The "no fake progress" completion-cap behavior IS live and testable today (checking every resource/exercise box still can't exceed a "familiar"-ish ceiling), but the "test out via demonstrated ability" half of that rule has no way to fire yet.

**Interview readiness** — types (`InterviewModule`, `InterviewSession`, `InterviewEvaluation`, `InterviewQuestion`) and the `SkillForgeState.interviewSessions`/`interviewEvaluations` persistence slots exist; there is no simulator UI and no data. This is explicitly V1-scope-excluded per the spec (not a bug), but flagged here so it isn't mistaken for "coming soon."

---

## Missing

V1-spec requirements with no implementation at all yet:

- Guided-entry buttons, Next Best Action banner, readiness warning card, Test Me First flow, upgraded Prove-It Q&A flow, failure-diagnosis card with Review/Try-Targeted-Drill/Retry/Continue-Anyway actions — all UI-layer, all blocked on wiring the already-built engines/API into `skill-detail-view.tsx` (and likely a new shared `SkillCheckPanel`-style component for the diagnostic/assessment Q&A interaction, since both stages share the same shape).
- Any client-side error/retry handling for a failed or unavailable AI evaluation (the backend supports it — `evaluation: null` — but there's no UI state machine consuming that yet).
- End-to-end / browser verification of scenarios A-G from the original SkillForge V1 build prompt (student-already-knows-it, underprepared-student-warned, ignores-warning-then-succeeds, poor-performance-diagnosis, refresh-persists, AI-failure-doesn't-crash, limited-availability-scales-duration) — not run this session, since the UI needed to exercise them doesn't exist yet.
- Learn-stage `learnOverview` rendering and resource depth grouping in the UI (data exists, UI doesn't consume it).

---

## Known Bugs

None found. `npm run build`, `npx tsc --noEmit`, and `npm run lint` all pass cleanly as of this checkpoint (see Current Verification below). The gaps above are unimplemented UI, not defects in what exists.

One thing worth a second look next session rather than a "bug": `computeNextBestAction` and `diagnoseWeakConcept` take an `allModules: SkillModule[]` parameter that should be `getAllSkillModules()` from `lib/skillforge/catalog.ts` when eventually wired up — confirm that's what gets passed once the UI work starts, rather than a partial/filtered list, or backtracking will silently miss real prerequisite matches.

---

## Architecture

**Directories relevant to SkillForge:**
- `types/skillforge.ts` — all SkillForge types.
- `data/skillforge-modules.ts` — the 10-module content catalog.
- `services/skillforge-service.ts` — persistence + mastery mutation.
- `lib/skillforge/` — `mastery.ts` (mastery math), `catalog.ts` (module lookup/matching), `roadmap-connection.ts` (gap-analysis fuzzy match), `dashboard.ts` (dashboard aggregation), `readiness.ts`, `diagnosis.ts`, `next-action.ts` (guided-freedom engines), `evaluation-schema.ts` + `ai-evaluator.ts` (AI grading).
- `app/skillforge/` — dashboard page + `skills/[skillId]/page.tsx` detail route (async `params`, per Next.js 16).
- `app/api/skillforge/evaluate/route.ts` — the one SkillForge API route.
- `components/skillforge/` — `skillforge-dashboard.tsx`, `skill-detail-view.tsx`, `skill-card.tsx`, `mastery-badge.tsx`, `mastery-dimensions.tsx`.

**Storage:** one `SkillForgeState` per `userId` in `localStorage` under `STORAGE_KEYS.skillforge` (`lib/storage/keys.ts`), read/written via `lib/storage/local-storage.ts`'s `readJSON`/`writeJSON` — the only file that touches `window.localStorage` directly.

**AI integration:** `lib/ai/anthropic-client.ts` (`getAnthropicClient()`, server-only, reads `ANTHROPIC_API_KEY`) is shared between roadmap generation and SkillForge grading. **No `.env` file exists in this environment** — `ANTHROPIC_API_KEY` is unset, so `getAnthropicClient()` returns `null` and both `generateRoadmapWithAI()` and `evaluateSkillResponses()` currently always fall through to their non-AI paths in this environment. This has not been tested against a live key this session.

**Roadmap integration:** `lib/skillforge/catalog.ts` resolves a student's `targetCareers` through `resolveCareers()` (same taxonomy as everywhere else) to select relevant `SkillModule`s; `lib/skillforge/roadmap-connection.ts` fuzzy-matches a module's `relatedGapKeywords` against the student's live `GapAnalysis` (from their most recent `SavedRoadmap`) to ground the "why" text; `calculateExpectedDuration()` from `lib/roadmap/pacing.ts` is reused as-is for every duration estimate.

---

## Current Verification

Run 2026-07-29, in this exact repository state, after removing the stray OneDrive `pathfinder/` scaffold folder (none was present):

```
$ npx tsc --noEmit
(no output — clean)

$ npm run lint
> pathfinder@0.1.0 lint
> eslint
(no output — clean)

$ npm run build
> pathfinder@0.1.0 build
> next build

▲ Next.js 16.2.11 (Turbopack)
✓ Compiled successfully in 3.2s
✓ TypeScript checked
✓ Generated all static/dynamic routes, including:
  ƒ /api/skillforge/evaluate
  ○ /skillforge
  ƒ /skillforge/skills/[skillId]
```

No test runner is configured in `package.json` (`scripts` has only `dev`/`build`/`start`/`lint`) — there is no `npm test` to run.

**Not verified this session:** any actual browser interaction with SkillForge's guided-freedom features, since the UI for them doesn't exist yet. The original (pre-guided-freedom) SkillForge dashboard/detail flow was browser-verified in a prior session (before this checkpoint) and should still work, since it wasn't touched — but re-verify before relying on that claim, since `recomputeMastery()`'s internals did change this session even though its external behavior for resource/exercise completion should be unaffected.

---

## Current Git State

- Branch: `main`.
- One commit exists: `008fa43 Initial commit`.
- **Everything else — the entire `app/`, `components/`, `lib/`, `services/`, `types/`, `data/`, `hooks/`, `context/`, config files, and this session's SkillForge work — is uncommitted.** `git status` shows all of it as untracked (`??`) except `.gitignore`, which is modified. Nothing has been committed since the initial scaffold commit.
- No branches other than `main` exist locally.

**Before doing anything else destructive or history-rewriting in a future session:** this represents all work to date on the entire app, not just SkillForge — treat it as uncommitted, unsaved work, not as disposable scratch state.
