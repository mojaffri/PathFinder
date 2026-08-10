# ADR-006: Model skills with evidence and confidence

**Status:** Accepted

## Context

A flat skill tag cannot distinguish “listed on a resume” from “demonstrated in a project” or “passed a recent assessment.” Treating them equally produces misleading fit and readiness.

## Decision

Aggregate claimed, assessed, demonstrated, and professional evidence with explicit strength and verification. Keep source records addressable and recompute confidence from them.

## Alternatives considered

- Boolean skill possession: simple, but loses provenance and uncertainty.
- User-entered proficiency percentages: precise-looking but unsupported.
- AI-estimated proficiency: subjective and difficult to audit.

## Tradeoffs

The model is more complex and incomplete evidence can lower visible confidence. That conservatism is intentional: recommendations remain tied to facts the user can inspect and improve.
