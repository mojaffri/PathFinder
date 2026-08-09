# Skill Graph

The skill dependency graph powers the adaptive roadmap engine (`docs/roadmap-engine.md`). It is a **separate, broader catalog** from SkillForge's own curated `SkillModule` content (`types/skillforge.ts`, `data/skillforge-modules.ts`): SkillForge modules are deep, guided-practice content units for a small set of skills (10 as of this writing); `SkillNode`s are lightweight graph nodes used only for dependency ordering, priority scoring, and scheduling, spanning a much wider set of skills — including ones SkillForge doesn't have a module for. A node may optionally point at a real SkillForge module via `skillForgeModuleId` when one exists; that's the only connection between the two catalogs.

## Data model

`types/skill-graph.ts#SkillNode`:

```ts
interface SkillNode {
  id: string;
  name: string;
  category: CareerCategory;
  prerequisites: string[];                          // SkillNode ids
  estimatedHours: number;                            // to reach working competency
  importanceByCareer: Partial<Record<string, RatingScale>>; // real Career.id keys
  skillForgeModuleId: string | null;                 // real SkillModule.id, if assessable
  relatedGapKeywords: string[];                      // fuzzy-matched against GapItem/JobRequirement text
}
```

Curated data lives in `data/skill-graph.ts` (`SKILL_GRAPH_NODES`). Four nodes reuse a real `data/skillforge-modules.ts` id as both their own `id` and their `skillForgeModuleId` (`statistics-fundamentals`, `python-engineering-data-analysis`, `applied-statistics-messy-data-modeling`, `dsa-technical-interviews`) — those are the only skills with a genuinely assessable SkillForge module behind them today.

## Coverage (deliberate scope decision)

~25 nodes covering the chains the adaptive-roadmap feature was built around:

- `html-css` → `javascript` → `typescript` → `react` → `nextjs`
- `git-version-control` → `testing-fundamentals`/`docker` → `cicd`; `docker` → `cloud-deployment-basics`
- `sql` → `postgresql` → `orm-data-access` → `backend-persistence`
- `python-fundamentals` → `rest-apis` → `fastapi` → `production-backend-engineering`
- `data-structures-algorithms` → `dsa-technical-interviews` / `system-design`
- `statistics-fundamentals` + `python-engineering-data-analysis` → `applied-statistics-messy-data-modeling` → `machine-learning-fundamentals`

This is **not** a graph across all 9 `CareerCategory` values in `data/careers.ts` — it's scoped to the software/backend/data chains the task brief itself used as examples. Extending coverage to other categories (law, healthcare, business) is additive: append new `SkillNode`s to `data/skill-graph.ts`, same growth pattern as `lib/roadmap/playbooks.ts` being keyed per career id and grown over time. Until that happens, a student whose target career has no matching nodes simply gets an adaptive roadmap driven entirely by their gap analysis and saved jobs (still real, just without skill-graph-specific tasks).

## Traversal (`lib/roadmap/skill-graph.ts`)

Pure, deterministic functions — no AI, no I/O, same discipline as `lib/gap-analysis/engine.ts` and `lib/evidence/confidence.ts`:

- `buildSkillGraphIndex(nodes)` — validates unique ids, validates every prerequisite id resolves to a real node, and **detects cycles via DFS at build time**, throwing `SkillGraphValidationError` with the offending chain. This fails loudly rather than relying on a traversal's defensive `visited` set to silently save it (the risk `docs/implementation-plan.md`'s Phase 3 section flagged about `lib/skillforge/diagnosis.ts`'s BFS).
- `getUnmetPrerequisites(index, skillId, masteredSkillIds)` — direct prerequisites not yet mastered.
- `getBlockedSkills(index, skillId)` — direct dependents; "what does closing this skill unblock."
- `resolveTransitivePrerequisites(index, skillId)` — full transitive prerequisite set.
- `topologicalOrder(index, skillIds)` — Kahn's algorithm restricted to the given subset plus its transitive prerequisites. Deterministic tie-break: order of the input array, then id — required so the scheduler produces the same schedule for the same input every time.
- `graphDepth(index, skillId, workingSet)` — BFS depth within a given working set, used to bucket tasks into phases (`lib/roadmap/adaptive-phases.ts`).

## Cycle detection

`detectCycle(nodes)` is exported standalone (in addition to running inside `buildSkillGraphIndex`) so a malformed fixture can be tested directly. It uses a standard three-color DFS (white/gray/black) and returns the exact cycle chain (e.g. `["a", "b", "a"]`) rather than just a boolean, so an error message can show precisely what's wrong. See `tests/unit/skill-graph.test.ts` for cycle/dangling-prerequisite/duplicate-id fixtures.

## Limitations

- Curated, not comprehensive — see "Coverage" above.
- `importanceByCareer` weights are hand-authored judgment calls (1-5), not derived from any external labor-market data source — same "curated, explainable, not scraped" approach as `data/careers.ts` itself.
- A node has exactly one `estimatedHours` value regardless of a student's starting point; `lib/roadmap/adaptive-generator.ts` applies a flat reduction (not a graph-level concept) when SkillForge mastery is already `familiar`+.
