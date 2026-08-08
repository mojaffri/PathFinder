# PathFinder — Evidence Model

How PathFinder turns "I know Python" from a self-report into a graded, explainable confidence score. This is the design reference for `types/evidence.ts` and `lib/evidence/confidence.ts`. For GitHub-specific signal extraction, see [`github-integration.md`](./github-integration.md).

---

## Why this exists, and how it's different from SkillForge's `SkillEvidence`

`types/skillforge.ts` already exports a `SkillEvidence` type and a `skill_evidence` table — **do not confuse the two.** That one is narrow: a manual link (a project URL, a writing sample) a student attaches to ONE curated `SkillModule`'s progress while working through the guided SkillForge loop.

This domain (`types/evidence.ts`'s `SkillEvidenceRecord`, `skill_evidence_records` table) is broader and answers a different question: **for any named skill — not just SkillForge's curated catalog — how much should PathFinder (or a recruiter reading a job-fit report) actually trust that this student has it?** It pulls together everything already in the app:

- Profile skill tags (self-reported)
- Resume/profile work experience and certifications
- Resume/profile projects, including GitHub-analyzed repositories
- SkillForge's own assessed mastery (when the skill matches a curated module)
- Coursework (education major/degree, weak signal)
- Anything a student manually adds

The two systems are connected (SkillForge's assessed mastery is one INPUT to this model — see "The `assessed` dimension" below) but not merged, per the project's rule against SkillForge introducing a second parallel data model.

## What's persisted vs. recomputed

Only **manually-added evidence** is persisted, in `skill_evidence_records`. Everything else — the claimed/professional/demonstrated/assessed evidence derived from the profile, SkillForge progress, and analyzed GitHub repos — is recomputed fresh on every call to `lib/evidence/confidence.ts`, the same way this app already handles `deriveTopMoves()` and `getDemonstratedGapIds()`. This is a deliberate choice: a cached confidence score would go stale the moment a student adds a project, finishes a SkillForge assessment, or re-analyzes a repo, and computing it is cheap (pure functions over data already fetched for the page).

## The four dimensions

| Dimension | What counts | Source types | Max weight |
|---|---|---|---|
| **Claimed** | The skill is listed as a profile tag — nothing more. | `resume` | 10 |
| **Professional** | The skill appears in real work-experience bullets/summary, or a certification. | `experience`, `certification` | 25 |
| **Demonstrated** | The skill is used in a project (resume-entered or GitHub-analyzed), a linked GitHub repo's own detected signals, or coursework (weakest of this group). | `project`, `github_repo`, `coursework`, `publication` | 35 |
| **Assessed** | SkillForge's own graded mastery for a matching curated module. | `assessment` | 30 |

Each dimension gets its own 0-100 **score**, independent of its weight — this is the "consider evidence quality, not just count" requirement. Within a dimension, more of the *same* weak signal never compounds; what can raise a dimension's score is either a genuinely stronger single piece of evidence (a GitHub repo detector flags strong test coverage vs. just a language match) or **independent corroboration** — two different employers both citing the same skill is treated as `strong` professional evidence, one employer alone as `moderate`. This is the one place repetition matters, and it's bounded (2+ is the same as 20+; there is no unbounded "more evidence = infinitely more confident").

## The formula

```
overallScore = Σ (dimension.weight × dimension.score) / Σ dimension.weight
```

Weights sum to 100, so `overallScore` is already 0-100. A confidence *level* is then assigned:

| `overallScore` | Level |
|---|---|
| 0-14 | Unverified |
| 15-39 | Low |
| 40-64 | Moderate |
| 65-87 | High |
| 88-100 **and** ≥3 of {assessed, demonstrated, professional} individually score ≥70 | Very High |
| 88-100 but the above gate fails | High (capped) |

**Why the extra gate on Very High:** a naive weighted average can be pushed above 88 by one dominant dimension (e.g. a perfect SkillForge assessment alone, weight 30, contributes up to 30 points — not enough alone to reach 88, but combined with a merely decent secondary signal it could). Very High is reserved for genuinely broad, independently-strong evidence — the confidence a recruiter should read as "this is about as solid as self-reported-plus-portfolio evidence gets," not "one really good data point."

### Worked example (matches the task's own illustrative case)

> Python — Claimed: yes · Assessment: 88/100 · Project evidence: Strong · Professional evidence: Moderate

- `claimed` = 100 (weight 10) → 10.0
- `assessed` = 88 (SkillForge's exact knowledge+ability average is used directly here, not bucketed — weight 30) → 26.4
- `demonstrated` = 100 ("strong" project evidence — weight 35) → 35.0
- `professional` = 60 ("moderate" — one employer, weight 25) → 15.0

`overallScore` = 86.4 → **High** (88+ gate not met, and even if it were, only 2 of 3 independent dimensions clear 70). This exact scenario is a regression test — see `tests/unit/skill-confidence.test.ts`.

A **bare self-claim with nothing else** scores 10 → **Unverified**. This is intentional: "avoid pretending subjective inference is certainty" means a resume tag alone should never read as more than unverified, no matter how many times it's repeated (repeating a `resume`-type claim doesn't add evidence records — there's only ever at most one `claimed` evidence entry per skill).

## Evidence strength, not just presence

Every `SkillEvidenceRecord` carries an `evidenceStrength` (`weak`/`moderate`/`strong`) AND a plain-language `explanation` — never a bare boolean. For GitHub-sourced evidence specifically, strength comes from the deterministic repo detectors (see `github-integration.md`), not from stars/forks/commit count, which the task explicitly excludes from any quality signal.

## Verification status

Every automatically-derived record is `verificationStatus: "self-reported"` (or `"unverified"` for an ungraded SkillForge attempt) — including GitHub-sourced evidence, since an analyzed repo is still the student's own account, not third-party-attested. `"verified"` exists in the type for a future real verification integration (e.g. a certification credential-ID check) but nothing in this phase sets it. This is a deliberate honesty constraint, not an oversight.

## What this model intentionally does NOT do

- It does not grade *how good* a student's code is — the demonstrated dimension is about whether objective signals exist (tests, the skill's actual use, detected frameworks), never a qualitative code-quality judgment.
- It does not use AI to invent evidence strength — every score in this file comes from `lib/evidence/confidence.ts`'s deterministic formula. AI is used elsewhere in the evidence pipeline only to write the human-readable project summary sentence (`lib/github/narrative.ts`), never to decide a score.
- It does not treat SkillForge's curated catalog as the only place a skill can come from — a skill only PathFinder's catalog doesn't know about (e.g. "Gaussian-process optimization") still gets a full confidence report from the other three dimensions.
