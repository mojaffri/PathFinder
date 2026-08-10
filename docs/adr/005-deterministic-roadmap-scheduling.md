# ADR-005: Deterministic roadmap scheduling

**Status:** Accepted

## Context

A roadmap must honor prerequisites, effort, weekly capacity, and a target date. Generated prose alone cannot guarantee feasible ordering or stable updates after progress changes.

## Decision

Generate task candidates from real gaps and saved-job signals, compute priority explicitly, order prerequisites as a graph, and schedule tasks with deterministic capacity/date logic. AI may improve narrative wording only.

## Alternatives considered

- LLM-generated calendar: natural language is attractive, but dates and dependencies drift.
- Static templates: predictable, but do not adapt to individual evidence and saved jobs.
- Manual drag-and-drop planning: useful later, but too much initial work for the user.

## Tradeoffs

The algorithm needs cycle handling and feasibility tests. It produces explainable plans that can be regenerated without inventing different history.
