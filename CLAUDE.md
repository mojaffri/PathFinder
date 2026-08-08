@AGENTS.md

# PathFinder — Project Overview

PathFinder is a STEM Career & Academic Roadmap Engine built with Next.js (App Router, TypeScript, Tailwind v4). It helps students figure out which STEM career fits them (Discover) and then builds a concrete, personalized plan to become competitive for it (Accelerate). The app is intentionally **STEM-only** — no business/marketing/law/sales career paths are ever added, matched, or recommended.

## How it works

**Auth & storage**: There is no real backend yet. A single student profile lives in `localStorage` per browser, behind a thin CRUD layer (`services/profile-service.ts`, `services/roadmap-service.ts` on top of `lib/storage/local-storage.ts`) so it can be swapped for Supabase later without touching UI code. "Sign out" just clears a session flag, not the saved profile.

**Discover flow** (`app/discover`, `components/discovery/questionnaire-wizard.tsx`): An adaptive multi-step questionnaire (basics → environment → optional lab-focus/remote-focus follow-ups → category/subject/work-style ratings → priorities). Answers are scored against a curated ~35-40 career dataset (`data/careers.ts`) by a **deterministic, explainable weighted-scoring engine** (`lib/matching/engine.ts`) — no LLM involved in matching, so results are reproducible and debuggable.

**Accelerate flow** (`app/accelerate`): Two entry paths into the same structured profile shape:
- **Resume upload** — PDF → text (`lib/resume/pdf-text.ts`, via `unpdf`) → structured extraction (AI-based `lib/resume/ai-extractor.ts` when an API key is present, otherwise a regex/heuristic parser `lib/resume/heuristic-extractor.ts`) → an editable review UI (`components/profile/structured-sections.tsx`) where the student confirms/edits/removes each extracted record before it becomes profile data.
- **Manual entry** — the same structured form (`components/profile/profile-form.tsx`), built from reusable `RecordSection` components (`components/profile/record-section.tsx`).

Both paths converge on the same structured types in `types/records.ts` (`EducationRecord`, `ExperienceRecord`, `ProjectRecord`, `AwardRecord`, `CertificationRecord`) — long-form content (bullets, summaries) is always a textarea/list, never a chip; only genuinely short categorical values (skills, interests) are chips.

**Roadmap generation** (`app/api/roadmap/route.ts`, `lib/roadmap/`): The full structured profile is first run through a **deterministic gap-analysis engine** (`lib/gap-analysis/engine.ts`) that compares the student against what the target career actually rewards and produces prioritized (critical/high/medium/low), hour-costed gaps. That gap analysis is the authoritative foundation for both generation paths:
- If an Anthropic API key is configured, `lib/roadmap/ai-generator.ts` turns the gaps + full profile into a rich roadmap via Claude, validated against a zod schema (`lib/roadmap/schema.ts`).
- If the key is missing or the call fails, `lib/roadmap/fallback.ts` builds a complete roadmap directly from the gap analysis — this path must always work and must never be allowed to regress, since it's the guaranteed fallback.

Every recommendation/milestone carries a real `estimatedHours` figure. Actual pacing ("Expected duration: 2 weeks at 20 hours/week") is derived from the student's `weeklyHoursAvailable` by a pure utility (`lib/roadmap/pacing.ts`) — never hardcoded or guessed by the AI.

**Key invariants to preserve when making changes**:
- Never expose the Anthropic API key client-side — all AI calls happen server-side (`lib/ai/anthropic-client.ts`).
- Never recommend or route toward non-STEM industries.
- Never fabricate resume achievements/metrics — use bracket placeholders (e.g. `[quantify impact]`) for anything not evidenced.
- Keep career matching deterministic/explainable — do not replace it with an LLM call.
- Treat resume-extracted data as unverified until the student confirms it in the review UI.

## Durable AI and assessment conventions

- All provider SDK access belongs in `lib/ai/*`; feature code must use `requestStructuredAI()` and must not instantiate Anthropic directly.
- Every AI feature requires a tool/JSON schema, Zod validation, timeout, malformed-output retry, typed failure, metadata-only telemetry, and a non-crashing fallback.
- Never log prompts, resumes, student answers, or generated content. AI telemetry is operational metadata only.
- SkillForge grades deterministic formats without AI. Open responses use the versioned rubric documented in `docs/assessments.md`; only validated structured results may affect mastery.
- Skill mastery is deterministic and derives from repeated/recency-weighted attempts, projects, evidence, and interview state. Do not let AI assign mastery levels directly.
- Regression tests use Node's built-in runner through `npm test`; CI must not call a live AI provider.

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
