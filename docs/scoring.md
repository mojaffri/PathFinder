# Scoring systems

PathFinder keeps numerical decisions deterministic so the same inputs produce the same outputs and a user can inspect why a result changed.

## Career matching

`lib/matching/` compares questionnaire answers with the curated career dataset across interests, work style, academic comfort, environment, values, and education preferences. Dimension weights and penalties are explicit TypeScript data. Results include contribution-level explanations rather than only a percentage.

The catalog currently contains 46 careers across 9 categories. The quality suite exercises every career at every one of 13 canonical education stages (598 combinations).

## Job fit

`lib/jobs/fit-scoring.ts` scores the validated requirements extracted from a saved job. Required and preferred requirements remain separate. Each requirement receives an evidence-aware match state; the overall score and component scores are derived from those records rather than from an LLM opinion.

Fit snapshots are persisted in `job_matches`. A later improvement to the profile does not rewrite what the system concluded at the time of the original analysis.

## Evidence confidence

`lib/evidence/confidence.ts` aggregates four evidence dimensions:

- claimed: profile or resume assertions;
- assessed: SkillForge performance;
- demonstrated: projects and deterministic GitHub signals;
- professional: experience, certifications, or verified artifacts.

Stronger and verified evidence contributes more than a keyword claim. Confidence is recomputed from its source records so it cannot drift from the underlying evidence. The full formula and worked example are in [evidence-model.md](evidence-model.md).

## SkillForge mastery

Mastery separates knowledge, ability, evidence, and interview readiness. Resource completion is capped; it cannot produce resume-ready status by itself. Recent graded attempts are recency-weighted, old attempts decay, and inconsistent attempts reduce confidence. Passing and level thresholds are explicit in `lib/skillforge/`.

## Readiness and roadmap priority

Readiness combines persisted evidence, assessment, roadmap, and gap signals. The adaptive roadmap assigns task priority from gap severity, saved-job recurrence, evidence confidence, and dependency position. Scheduling then applies prerequisites, weekly availability, estimated effort, and the optional target date.

AI may explain the result, but it cannot change the score, priority, dependency graph, feasibility calculation, or scheduled dates.

## Saved-job insights

Skill frequency is computed only across the signed-in user's saved jobs. Required and preferred frequency are retained separately and combined with that user's evidence coverage. The UI explicitly labels this scope; it is not global labor-market research.

## Non-goals

- Scores do not predict an offer or hiring probability.
- GitHub stars, forks, followers, and commit volume do not increase engineering-skill scores.
- Missing time-series records are not backfilled or interpolated.
- LLM confidence is not treated as evidence confidence.
