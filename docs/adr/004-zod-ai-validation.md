# ADR-004: Validate structured AI output with Zod

**Status:** Accepted

## Context

Provider responses are external, probabilistic input. TypeScript types disappear at runtime and cannot prevent malformed fields from reaching scoring or persistence.

## Decision

Define a Zod schema for every structured AI response. Bound requests, use structured tool/schema output, validate before domain use, retry one malformed response, then fall back or return a typed failure.

## Alternatives considered

- Type assertions: concise but provide no runtime guarantee.
- Ad hoc property checks: repetitive and easy to leave incomplete.
- Persist raw output for later parsing: risks storing unusable or unsafe shapes.

## Tradeoffs

Schemas add maintenance when prompts evolve. They create a single auditable contract and prevent provider output from silently changing application state.
