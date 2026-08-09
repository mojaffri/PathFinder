# Adaptive Roadmap Engine

Phase 3's flagship feature: a single, continuously-recomputed plan for one student, driven by a real skill dependency graph (`docs/skill-graph.md`), a deterministic weekly scheduler, and real signals (gap analysis, saved jobs, SkillForge mastery, evidence confidence). This is a **separate system** from the narrative `Roadmap`/`SavedRoadmap` (`types/roadmap.ts`, `lib/roadmap/{ai-generator,fallback}.ts`) — that system is untouched. Where `Roadmap` is a one-shot AI/fallback narrative from a questionnaire, `AdaptiveRoadmap` (`types/adaptive-roadmap.ts`) is a single evolving plan per profile, made of concrete, schedulable tasks.

## Pipeline

```
buildAdaptiveRoadmapInput(userId)         lib/roadmap/adaptive-input.ts
  → profile, resolvedCareers, gapAnalysis (reuses analyzeGaps — unchanged)
  → savedJobs (repositories/job-repository.ts#listFullJobDescriptions)
  → skillForgeProgress, confidenceContext (reuses buildSkillConfidenceContext)
  → previous AdaptiveRoadmap, if any

recomputeAdaptiveRoadmap(previous, input, trigger)   lib/roadmap/adaptation.ts
  → generateAdaptiveTasks(input, jobFrequency, index)   lib/roadmap/adaptive-generator.ts
  → merge forward: carry completed/in-progress/skipped status by skillId
  → scheduleTasks(mergedTasks, weeklyHours, targetDate)  lib/roadmap/scheduler.ts
  → groupTasksIntoPhases(scheduledTasks, index)          lib/roadmap/adaptive-phases.ts
  → diff previous vs. next → RoadmapChangeEvent (or null if nothing changed)

saveAdaptiveRoadmap(userId, roadmap, changeEvent)   repositories/adaptive-roadmap-repository.ts
  → delete-and-reinsert phases/tasks; APPEND-ONLY change_events and completed_history
```

## Task generation (`lib/roadmap/adaptive-generator.ts`)

1. **Candidate skills** = union of: skill-graph nodes whose `importanceByCareer` matches a target career id, nodes fuzzy-matched (`lib/matching/evidence.ts#fuzzyIncludes`) against a `GapItem.title`/`description`, and nodes fuzzy-matched against a saved-job requirement label.
2. A node is **mastered** (excluded from the working set) if its linked SkillForge module's mastery level is `proficient`+ (`MASTERY_LEVEL_ORDER`), or its `computeSkillConfidence` confidence is `high`/`very-high`.
3. Every unmastered candidate pulls in its **unmet prerequisites** recursively (`getUnmetPrerequisites`) — real dependency-aware generation, not just leaf skills.
4. Each node becomes one `AdaptiveTask`: `estimatedHours` is reduced ~40% if SkillForge level is already `familiar`+; `completionCriteria`/`evidenceGoal`/`learningResource` are deterministic templates (assessment-linked when `skillForgeModuleId` is set); `reason` is built from `SkillPriorityScore.reasons` — **never AI-authored**.

Tasks are grouped into phases by BFS depth in the working subgraph (`graphDepth`): depth 0 → "Foundations," depth 1 → "Core Competencies," depth 2+ → "Applied & Advanced." Unlike the narrative `Roadmap`'s fixed 3-phase structure, an empty phase is simply omitted.

## Priority formula (`lib/roadmap/priority.ts`)

Deterministic weighted sum, clamped 0-100 — documented the same way as `lib/evidence/confidence.ts`'s weights:

| Signal | Contribution |
|---|---|
| Matched gap priority baseline | critical 25 / high 18 / medium 10 / low 4 / none 0 |
| Matched gap impact | `impact × 8`, capped at 40 |
| Saved-job frequency | `(percentage / 100) × 20` |
| Unblock boost | `min(blockedSkillsCount × 5, 15)` — closes a prerequisite other skills are waiting on |
| Evidence weakness | `(100 − confidenceScore) / 100 × 15` (or a flat 15 if there's no evidence at all) — weaker existing evidence raises priority |

A **mastery discount** (×0.2) applies when SkillForge level is already `proficient`+ or confidence is already `high`+ — the skill stays visible (for traceability) but doesn't compete for a student's hours. Tier thresholds mirror `GapPriority`: ≥75 critical, ≥55 high, ≥30 medium, else low.

## Scheduling (`lib/roadmap/scheduler.ts`)

Fully deterministic — **never asks an LLM for a calendar date**, per the task brief. `completed`/`skipped` tasks are frozen (kept at their existing dates, consume no future capacity). `not-started`/`in-progress` tasks are topologically ordered by `prerequisiteTaskIds` (ties broken by priority score, then skill id) and greedily bin-packed into weekly buckets starting today, splitting a task across weeks when it doesn't fit remaining capacity. Weekly capacity defaults to 5 hours (flagged `isAssumedAvailability`) when the student hasn't set `weeklyHoursAvailable`.

**Impossible-deadline detection**: when `requiredWeeks > availableWeeks` (weeks between today and `targetDate`), `feasible: false` and the message matches the brief's own worked-example phrasing: *"At X hours/week, the current roadmap requires approximately Y weeks but your target date is Z weeks away."* Recommendations include the weekly-hour value that would actually fit the deadline, the target date that would fit at the current pace, and — if scope reduction would close the gap — the specific lowest-priority tasks that could be dropped.

## Adaptation (`lib/roadmap/adaptation.ts`)

Every recompute merges forward by **`skillId`** (the stable identity — task ids regenerate every run): a previously `completed`/`in-progress`/`skipped` task's status, `completedAt`, and original `createdAt` carry onto the matching fresh task. A completed skill that drops out of scope entirely (e.g., the student's target career changed) is **never silently dropped** — it's appended to `completedHistory` (a genuinely append-only table; see below) if not already recorded.

A `RoadmapChangeEvent` is produced only when something actually changed (added/removed/changed-tier skill sets are non-empty), with a deterministic, per-trigger template summary (e.g. *"Your roadmap changed because you passed a SkillForge assessment — the SQL task was removed; PostgreSQL was added. Your next priority is Docker."*). The underlying facts (what changed, why) are always computed here, never by an LLM — task-brief section 7 explicitly forbids AI from determining dependencies, priority, dates, or skill state. An AI polish pass over the deterministic summary's prose is a reasonable future addition (same null-on-failure fallback contract as `lib/roadmap/ai-generator.ts`) but is **not implemented** — the deterministic string is what ships today.

## Which triggers are automatic vs. user-initiated

The single entrypoint, `POST /api/roadmap/adaptive/generate`, accepts any `RoadmapChangeTrigger`. Not every trigger listed in `types/adaptive-roadmap.ts` fires automatically:

- **Automatic (client-side staleness check)**: `target-role-changed`, `deadline-changed`, `weekly-hours-changed` — `components/roadmap/adaptive/stale-roadmap-banner.tsx` compares the loaded roadmap's snapshot against the *live* `useProfile()` profile on every visit to `/roadmap` and prompts a recompute if they've drifted. This is deliberately **not** wired into `app/api/profile/route.ts` itself — no edits to that already-relied-upon route.
- **Explicit user action**: `assessment-passed`/`assessment-failed` (an "Update my plan" link on the SkillForge assessment-result view, `components/skillforge/skill-check-panel.tsx`), `job-analyzed` (same link on `/jobs/[id]`'s fit results), and `manual` (the "Recompute" button on `/roadmap` itself, and the empty-state "Generate my plan" button).
- **Not yet wired to any UI surface**: `new-evidence`, `new-github-project`, `new-resume`. The trigger type and backend support are real (any caller can POST `{trigger: "new-evidence"}` and it works correctly), but no contextual link surfaces it yet from `/projects` or the resume upload flow — left for a future session rather than adding UI wiring that wasn't reviewed as part of this scope.

This is a deliberate scope decision: hooking automatic recompute into every mutation path across the app (profile updates, resume uploads, evidence additions, GitHub imports) would touch many already-relied-upon routes for comparatively low additional value over an explicit, cheap "Update my plan" action — see `docs/project-state.md`'s "Decisions Made" for the same reasoning applied elsewhere in this codebase.

## Persistence

One active `adaptive_roadmaps` row per profile (`UNIQUE` on `profile_id`) — unlike the narrative roadmap's multiple saved snapshots, this is a single evolving plan. `adaptive_roadmap_phases`/`adaptive_roadmap_tasks` are delete-and-reinsert on every save (the same sanctioned pattern as `roadmap-repository.ts`/`job-repository.ts`). `adaptive_roadmap_change_events` and `adaptive_roadmap_completed_history` are **genuinely append-only** — `repositories/adaptive-roadmap-repository.ts#saveAdaptiveRoadmap` only ever inserts new rows into them (a new change event; completed-history entries not already recorded by skill id), never deletes or rewrites existing ones. A task's `prerequisiteTaskIds` are stored as `prerequisite_skill_ids` (text array) and resolved back to sibling task ids at read time via `skillId` — avoids self-referential FK complexity across a table that's fully replaced on every save.

## UI

`/roadmap` (`components/roadmap/adaptive/*`) — header (target careers/date/weekly capacity/readiness %), an infeasible-deadline banner with concrete recommendations, a "what your saved jobs actually ask for" panel (always labeled "Across your N saved jobs" — personalized data, never general labor-market stats, per task-brief section 6), phases of task cards (status controls, prerequisite indicators, completion criteria, evidence goal, scheduled week range), a change-history feed, and a completed-history list. No free-drag rescheduling — a task's schedule only changes by re-running the deterministic scheduler (mark-complete, mark-skip, or a full recompute), which is what `PATCH /api/roadmap/adaptive/tasks/[taskId]` does when the new status affects future capacity.

## Limitations

- Skill-graph coverage is curated (software/backend/data chains) — see `docs/skill-graph.md`. A target career with no matching nodes still gets a real adaptive roadmap, just driven entirely by gap analysis and saved jobs.
- Automatic trigger wiring covers profile-field changes and two contextual "Update my plan" links (assessment result, job-fit result) — `new-evidence`/`new-github-project`/`new-resume` triggers work end-to-end via the API but have no UI entry point yet.
- No free-drag rescheduling (see above) — a deliberate invariant-preserving decision, not an oversight.
- In-progress tasks are scheduled as if not yet started — no partial-hours-logged tracking in this version.
- No analytics dashboard over `change_events`/`completed_history` yet — deliberately deferred to Phase 4 per the task brief's own instruction not to build major analytics/application-tracking work in this phase. The data is captured (append-only) specifically so that phase can build on it.
- The optional AI "polish" pass over change summaries described above is not implemented — every change summary shipped today is the deterministic template string.
