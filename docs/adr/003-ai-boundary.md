# ADR-003: Restrict AI to unstructured or subjective tasks

**Status:** Accepted

## Context

Resumes, job descriptions, and open responses are difficult to parse with rules alone. Ranking, evidence confidence, and schedules need consistency more than linguistic flexibility.

## Decision

Use AI for unstructured extraction, bounded narrative generation, and subjective grading. Keep matching, scoring, evidence aggregation, mastery, dependencies, feasibility, and scheduling deterministic.

## Alternatives considered

- AI everywhere: faster to prototype, but unreliable and hard to audit.
- No AI: predictable, but materially worse at varied document extraction and written-response feedback.
- Manual-only structured forms: reliable, but creates too much user friction.

## Tradeoffs

The split requires explicit interfaces between AI output and domain logic. It reduces provider dependence and keeps core decisions testable.
