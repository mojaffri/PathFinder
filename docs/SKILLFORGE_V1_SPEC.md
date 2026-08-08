# SkillForge V1 — Product Specification

SkillForge is PathFinder's **adaptive competency engine**. Where Discover answers "where should I go" and Accelerate answers "what's my plan," SkillForge answers "how do I actually get good at this" — it takes a student from their current demonstrated ability to genuine, evidenced practical proficiency in a skill relevant to their target career.

This document describes the intended V1 product. For what is actually implemented right now vs. still missing, see [`project-state.md`](./project-state.md) — that file is the authoritative status; this file is the authoritative *design intent*.

## Core philosophy

> **SkillForge recommends. The student decides. Demonstrated ability determines whether the recommendation was right.**

SkillForge is an intelligent coach, not a gatekeeper. It never hard-locks a student behind a prerequisite unless an actual external requirement makes it impossible or unsafe (which, for V1's scope — study skills, not licensure — never happens). A prerequisite recommendation is never a prerequisite requirement. Students can skip recommended material, attempt advanced skills early, test themselves before learning anything, start projects early, retry assessments, and explore outside the recommended sequence — all without friction or penalty.

The AI has freedom to choose the most effective teaching and assessment approach for a given skill rather than forcing every skill into one rigid curriculum shape — a legal-writing skill and a Python-data-analysis skill shouldn't be squeezed into identical templates just because the surrounding system is generic.

## What SkillForge should do

1. Determine what the student actually knows.
2. Determine what they can actually do.
3. Identify gaps.
4. Dynamically teach missing material.
5. Adapt teaching to the student.
6. Practice concepts.
7. Assess application.
8. Increase difficulty when the student demonstrates strong ability.
9. Slow down and provide additional support when they struggle.
10. Produce evidence of competency.
11. Track confidence in the competency estimate.
12. Feed demonstrated progress back into the PathFinder roadmap.

## Career-agnostic architecture

SkillForge never introduces a second career taxonomy, a second "how many hours can you study" setting, or a second storage system. It consumes what already exists:

```
Target Career (data/careers.ts)
  → Career Playbook (lib/roadmap/playbooks.ts)
    → competitiveness factors / competencies
      → Student Profile (types/profile.ts, types/records.ts)
        → Gap Analysis (lib/gap-analysis/engine.ts)
          → prioritized GapItems
            → SkillForge SkillModules (data/skillforge-modules.ts)
              → learn / practice / build / prove
```

A `SkillModule.targetCareerIds` array references real `Career.id`s; `lib/skillforge/catalog.ts` resolves a student's free-text `targetCareers` through the same `resolveCareers()` used everywhere else in the app. `lib/skillforge/roadmap-connection.ts` fuzzy-matches a module against the student's actual, already-generated `GapAnalysis` so the "why is this here" explanation cites the student's own roadmap, not generic copy, whenever one exists.

`weeklyHoursAvailable` from the student's profile is the single source of truth for pacing everywhere in SkillForge — every recommended activity's "expected duration" runs through the same `calculateExpectedDuration()` utility the roadmap uses (`lib/roadmap/pacing.ts`). There is no separate SkillForge availability setting.

## Core learning loop: Learn → Practice → Build → Prove

The canonical loop is Learn, then Practice, then Build, then Prove — but a student can enter at any point:

- **Start Learning** — go through the curated material first.
- **Practice First** — skip straight to exercises.
- **Test Me First** — take a diagnostic before touching any material.
- **Start Project** — jump straight to the build stage.

SkillForge states which entry point it recommends, based on the student's demonstrated ability so far, but every entry point stays clickable regardless of that recommendation.

## Skill detail experience

Every skill's detail view shows, together: skill name, target career, why it matters (grounded in the student's roadmap when possible), roadmap connection, current mastery level, the four dimension states (Knowledge/Ability/Evidence/Interview), estimated effort, weekly-availability-adjusted expected duration, and a single **Next Best Action**.

Worked example (from the original spec, still the reference case):

```
Skill: Python for Engineering Data Analysis
Career: Chemical Engineer
Why: Your roadmap identifies data analysis as a high-value technical
     competency for your target path.
Current: Working
Recommended next action: Complete the applied data analysis challenge.
```

And the pacing example that must always compute correctly: a 20-hour skill against 10 hours/week of availability resolves to "~2 weeks" via the shared pacing utility — never a hardcoded or AI-guessed number.

## Intelligent readiness check (non-blocking)

When a student is about to start a skill, a diagnostic, an assessment, or a project, SkillForge checks their demonstrated progress on that skill's declared prerequisite modules. If they look ready, nothing is shown. If a background gap is detected, a warning is shown — **never a block**:

> "You're free to start this. One heads-up: based on your current SkillForge progress, you may be missing some background knowledge that usually makes this easier."
>
> Potential gap: SQL window functions
> Why: Your recent assessment suggests you haven't consistently demonstrated this concept.
> Estimated review: 1–2 hours
>
> [Review Recommended Skill]  [Start Anyway]

The goal is transparency, not restriction. Clicking "Start Anyway" is always a fully supported path with no penalty.

## Test Me First

An optional diagnostic entry point, intentionally shorter than the full mastery assessment, so a student who already knows the material from school, an internship, self-study, research, a bootcamp, or a personal project isn't forced through beginner content. If the student performs strongly, SkillForge records demonstrated competency, updates their mastery state, and recommends skipping unnecessary content. If they perform poorly, SkillForge diagnoses the underlying gap and recommends the smallest useful prerequisite review — the student can act on that recommendation or ignore it and continue.

## Learn stage

Each skill's Learn stage is a small, focused package, never a sprawling resource list: a concise explanation, a short list of learning objectives, key concepts, worked examples, common mistakes, and a curated set of resources sized to the minimum material needed to reach the target competency, plus clearly separated optional "go deeper" resources for students who want more. External resources are stored as real data (title/type/url/estimated time) rather than hardcoded into UI components, and are never fabricated — a resource with no verified URL is represented without one rather than inventing a link.

**V1 implementation note:** module content (explanations, resources, exercises, questions) is hand-authored and curated in `data/skillforge-modules.ts`, not generated fresh per student at runtime. "Dynamic" in V1 means *dynamically selected and sequenced* based on the student's demonstrated state, not *dynamically generated* text. Runtime AI generation of lesson content is a deliberate V2 direction, not a V1 requirement — V1 uses AI only for grading (see AI Evaluation below).

## Practice stage

Practice exercises test application, not memorization, and are career-aware by construction: a module's exercises are authored against the specific reasoning that career actually requires (e.g. debugging/implementation for software engineering, process/data-analysis scenarios for chemical engineering, financial-analysis scenarios for finance, clinical/scientific reasoning for pre-med, legal reasoning and fact-pattern analysis for pre-law, prioritization/analytics scenarios for product). This career-awareness comes from each module being authored against its actual target careers' playbooks and competitiveness factors — not from a hardcoded per-field template engine.

## Build / Project Forge

Each project challenge specifies: title, objective, why it matters, target career, skills developed, estimated effort, prerequisites/recommended preparation, requirements (a concrete checklist), stretch goals, deliverables, evaluation criteria, and portfolio guidance. Projects are meant to produce real evidence — a repo, a document, a model, a memo — not a completion checkmark.

**Absolute rule, enforced everywhere in the app, including here:** SkillForge never fabricates project results, metrics, business impact, or responsibilities. If a student hasn't supplied a real outcome, the outcome stays an unverified placeholder (matching the same discipline `lib/resume/*` already applies to resume bullets) rather than being invented.

## Prove / mastery assessment

The mastery assessment determines whether a student can actually apply a skill, assessed across whatever mix of conceptual understanding, application, reasoning, problem solving, technical/domain accuracy, and communication is relevant to that specific skill. The result is always structured, never a bare "Passed": knowledge, ability, strengths, weaknesses, and a recommended next step. Multiple assessment formats are supported per skill (`self-rating`, `checklist`, `artifact-review` as configuration; free-response Q&A as the AI-graded format) — a skill's assessment type is chosen to fit what actually proves competence in that field, not forced into one universal quiz format.

## AI evaluation

AI grading runs exclusively server-side (`lib/skillforge/ai-evaluator.ts`, called from `app/api/skillforge/evaluate/route.ts`) — the Anthropic API key is never exposed client-side, matching the existing `lib/ai/anthropic-client.ts` pattern used by roadmap generation. Requests and responses are zod-validated (`lib/skillforge/evaluation-schema.ts`), using the same structured tool-use extraction pattern as `lib/roadmap/ai-generator.ts`.

For each question, the evaluator must return one of four verdicts — **correct**, **partially-correct**, **incorrect**, or **insufficient-evidence** — never rewarding confident-sounding but wrong or vague answers, and explaining specifically what was missed when a student is wrong. It returns a knowledge score, an ability score, named strengths and weaknesses, a single weakest concept (used for failure diagnosis), and one concrete recommended next step.

**AI failure fallback:** if the API key is missing, the request fails, or the response doesn't validate, the evaluator returns `null` — never a crash, never a fabricated grade. The route handler always returns HTTP 200 with `{ evaluation: null }` in that case. The student's raw answers are still persisted (see Persistence below) so nothing is lost and the attempt can be resubmitted for grading later.

## Failure diagnosis

A poor assessment result is never just labeled "failed." SkillForge determines: what was attempted, where the student struggled, what specific concept or misconception caused it, which existing skill (if any) addresses that concept, what targeted practice would help, and whether the student should retry immediately or review first.

Reference example: a student attempting "Machine Learning Model Evaluation" who can't explain precision vs. recall should get something like *"Your issue doesn't appear to be machine learning as a whole. Your response suggests a gap in classification metrics, particularly precision vs recall,"* with a recommended 20-minute review, a few targeted exercises, and a retry path — never "redo the entire skill from scratch."

## Root-cause prerequisite backtracking

SkillForge reasons backward through a skill's declared dependency chain to find the **smallest useful missing competency**, checked nearest-first:

1. If the weak concept belongs to the skill itself, the recommendation is a targeted review within that same skill — no backtracking needed.
2. Otherwise, walk the `prerequisites` chain breadth-first (nearest module first) and recommend the first prerequisite module whose own concept list actually covers the weak concept.
3. Deeper ancestors are only ever recommended if a closer module doesn't cover it. A concept found nowhere in the chain falls back to the evaluator's own generic explanation instead of guessing a skill to blame.

Worked example matching the reference spec: a "Machine Learning Evaluation" skill's own concept list includes "Classification Metrics" (same-skill diagnosis case, no backtracking); a weak "Statistics Fundamentals"-level concept surfaced through a downstream skill correctly backtracks to the `statistics-fundamentals` module rather than being misdiagnosed as "redo the whole downstream skill."

## Adaptive mastery — six levels, not percentage-primary

```
Exposure → Familiar → Working → Proficient → Interview Ready → Resume Ready
```

Progression is **evidence-based, not completion-based**. A student who skips learning material entirely and passes the diagnostic or assessment is allowed to advance — demonstrated ability is trusted over assumed prerequisites. A student who completes every lesson but cannot demonstrate the skill on a diagnostic or assessment does not automatically advance just because checkboxes are ticked ("no fake progress" — opening a lesson, watching a resource, or clicking "complete" never by itself constitutes mastery; it's tracked as completion, kept separate from the mastery calculation, and only ever caps mastery at a low ceiling on its own).

## Four-dimension model

Every skill tracks four dimensions:

- **Knowledge** — do they understand the concepts.
- **Ability** — can they actually apply them.
- **Evidence** — do they have something credible to show for it. Always surfaced as a qualitative label (None/Weak/Moderate/Strong), never a raw percentage, since a number here would imply false precision.
- **Interview** — can they explain/defend it under questioning.

Worked example:

```
Python
Knowledge: Strong        Ability: Proficient
Evidence: Developing     Interview: Weak
Overall: Not Resume Ready
Reason: You understand Python and can apply it, but you don't yet have
        enough credible project evidence or interview performance to
        support a strong resume claim.
```

## Confidence-aware competency

SkillForge does not pretend to know a student's skill level with certainty from a single data point. Each dimension's confidence (Low/Medium/High) reflects how much evidence actually backs it — deliberately computed from *how many* AI-evaluated attempts exist, not from the AI's own self-reported confidence, so one lucky or unlucky answer can never look as certain as a consistent track record.

## Weekly time & Next Best Action

Every recommended activity carries a real effort estimate and, combined with `weeklyHoursAvailable`, a realistic expected duration — never a vague label, never an overload. At every point in a skill's state, SkillForge computes one clear, clickable **Next Best Action** ("Take the diagnostic," "Review classification metrics," "Attempt the project," "Complete one targeted practice drill," "Test your knowledge," "Practice defending your project," "Build stronger evidence") so a student is never left wondering what to do next.

## Evidence, portfolio, and resume integrity

Evidence entries (projects, writing samples, certificates, portfolio links) feed the Evidence dimension and are meant to become real portfolio/resume material later. The same anti-fabrication discipline that governs `lib/resume/*` and `lib/roadmap/*` applies here without exception: no invented metrics, business impact, or responsibilities; unverified outcomes stay as placeholders the student must fill in themselves.

## Persistence

Everything SkillForge persists — per-skill progress, every diagnostic/assessment attempt (including raw responses when grading failed), evidence, interview self-ratings — lives in one `SkillForgeState` row per student, keyed by `userId`, through the same `lib/storage/local-storage.ts` abstraction every other PathFinder service uses. This shape is deliberately a one-row-per-user table already, so a future Supabase migration means rewriting `services/skillforge-service.ts` alone, not the UI that calls it.

## UI design principles

SkillForge should feel premium, modern, focused, intelligent, calm, and execution-oriented — an extension of PathFinder's existing visual system, not a bolted-on module. Avoid: generic LMS appearance, excessive badges, meaningless progress bars, huge AI-generated paragraphs, unnecessary gamification, and excessive modal dialogs. Prefer clear cards, strong hierarchy, concise explanations, and obviously clickable actions.

## Explicit V1 exclusions

- No full free-form AI content-generation engine (lesson/practice/assessment content is curated, not generated per-request — see the Learn stage note above).
- No interview simulator (types exist in `types/skillforge.ts` for `InterviewModule`/`InterviewSession`/`InterviewEvaluation`, but there is no session UI, no AI-driven interview flow).
- No GitHub integration.
- No external code execution / sandboxed grading.
- No automated adaptive-difficulty content re-leveling beyond the mastery-level ladder itself (i.e. SkillForge does not yet author *harder or easier variants* of a question on the fly — it recommends different existing content based on demonstrated level).

These are deliberate scope boundaries so V1 stays a clean, extensible foundation rather than a half-finished version of a much larger system.
