# ADR-002: PostgreSQL persistence

**Status:** Accepted

## Context

Profiles, requirements, evidence, assessments, applications, and activity history have relational ownership and snapshot semantics. The product also needs transactions, indexes, and enforceable user isolation.

## Decision

Use Supabase Postgres for persistence, Supabase Auth for identity, and Drizzle for schema/query ownership. Access Postgres through repositories and user-scoped transactions.

## Alternatives considered

- Browser storage: low setup, but no multi-device persistence or credible isolation.
- Document database: flexible, but weak for ownership joins, requirement rows, and transactional updates.
- Hosted Postgres plus separate auth: viable, but more integration surface for this project.

## Tradeoffs

Direct Postgres access requires explicit connection management and RLS context. It provides relational integrity, migrations, efficient aggregates, and a portable SQL data model.
