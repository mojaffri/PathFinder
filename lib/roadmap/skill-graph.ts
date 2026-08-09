import type { SkillNode } from "@/types/skill-graph";
import { SKILL_GRAPH_NODES } from "@/data/skill-graph";

/**
 * Deterministic traversal over the curated skill dependency graph
 * (`data/skill-graph.ts`). Mirrors the discipline of the other deterministic
 * engines in this codebase (`lib/gap-analysis/engine.ts`,
 * `lib/evidence/confidence.ts`): pure functions, no AI, no I/O.
 *
 * A malformed graph (a dangling prerequisite id, or a cycle) fails loudly at
 * INDEX-BUILD time rather than relying on a defensive `visited` set inside a
 * traversal to silently save it — see `docs/implementation-plan.md`'s Phase 3
 * risk note about `lib/skillforge/diagnosis.ts`'s BFS.
 */

export class SkillGraphValidationError extends Error {}

export interface SkillGraphIndex {
  nodesById: Map<string, SkillNode>;
  /** skillId -> ids of skills that list it as a prerequisite (direct dependents). */
  dependents: Map<string, string[]>;
}

function detectCycleInternal(nodesById: Map<string, SkillNode>): string[] | null {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const id of nodesById.keys()) color.set(id, WHITE);

  const stack: string[] = [];

  function visit(id: string): string[] | null {
    color.set(id, GRAY);
    stack.push(id);
    const node = nodesById.get(id);
    for (const prereqId of node?.prerequisites ?? []) {
      const prereqColor = color.get(prereqId);
      if (prereqColor === GRAY) {
        const cycleStart = stack.indexOf(prereqId);
        return [...stack.slice(cycleStart), prereqId];
      }
      if (prereqColor === WHITE) {
        const found = visit(prereqId);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(id, BLACK);
    return null;
  }

  for (const id of nodesById.keys()) {
    if (color.get(id) === WHITE) {
      const found = visit(id);
      if (found) return found;
    }
  }
  return null;
}

/** Exported standalone (in addition to being run inside `buildSkillGraphIndex`) so a malformed fixture can be tested directly without needing a full index build to fail loudly. */
export function detectCycle(nodes: SkillNode[]): string[] | null {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  return detectCycleInternal(nodesById);
}

export function buildSkillGraphIndex(nodes: SkillNode[] = SKILL_GRAPH_NODES): SkillGraphIndex {
  const nodesById = new Map<string, SkillNode>();
  for (const node of nodes) {
    if (nodesById.has(node.id)) {
      throw new SkillGraphValidationError(`Duplicate skill graph node id: "${node.id}"`);
    }
    nodesById.set(node.id, node);
  }

  for (const node of nodes) {
    for (const prereqId of node.prerequisites) {
      if (!nodesById.has(prereqId)) {
        throw new SkillGraphValidationError(
          `Skill node "${node.id}" declares an unknown prerequisite "${prereqId}".`,
        );
      }
    }
  }

  const cycle = detectCycleInternal(nodesById);
  if (cycle) {
    throw new SkillGraphValidationError(`Cycle detected in skill graph: ${cycle.join(" -> ")}`);
  }

  const dependents = new Map<string, string[]>();
  for (const node of nodes) {
    for (const prereqId of node.prerequisites) {
      const list = dependents.get(prereqId) ?? [];
      list.push(node.id);
      dependents.set(prereqId, list);
    }
  }

  return { nodesById, dependents };
}

/** Prerequisites of `skillId` not yet present in `masteredSkillIds`. Unknown `skillId` returns an empty array rather than throwing — callers may pass ids sourced from fuzzy matches. */
export function getUnmetPrerequisites(index: SkillGraphIndex, skillId: string, masteredSkillIds: Set<string>): SkillNode[] {
  const node = index.nodesById.get(skillId);
  if (!node) return [];
  return node.prerequisites
    .filter((id) => !masteredSkillIds.has(id))
    .map((id) => index.nodesById.get(id))
    .filter((n): n is SkillNode => n !== undefined);
}

/** Skills that directly list `skillId` as a prerequisite — i.e. what closing this gap unblocks. */
export function getBlockedSkills(index: SkillGraphIndex, skillId: string): SkillNode[] {
  const ids = index.dependents.get(skillId) ?? [];
  return ids.map((id) => index.nodesById.get(id)).filter((n): n is SkillNode => n !== undefined);
}

/** Every prerequisite transitively required to reach `skillId`, deepest-first-independent (order not guaranteed — use `topologicalOrder` for a schedulable sequence). */
export function resolveTransitivePrerequisites(index: SkillGraphIndex, skillId: string): string[] {
  const seen = new Set<string>();
  const stack = [...(index.nodesById.get(skillId)?.prerequisites ?? [])];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    const node = index.nodesById.get(id);
    if (node) stack.push(...node.prerequisites);
  }
  return [...seen];
}

/**
 * Deterministic topological ordering (Kahn's algorithm) restricted to
 * `skillIds` plus everything they transitively depend on. Ties are broken by
 * the order `skillIds` were given, then by id, so the same input always
 * produces the same output — required for the scheduler to be deterministic.
 */
export function topologicalOrder(index: SkillGraphIndex, skillIds: string[]): string[] {
  const working = new Set<string>();
  for (const id of skillIds) {
    if (!index.nodesById.has(id)) continue;
    working.add(id);
    for (const prereqId of resolveTransitivePrerequisites(index, id)) working.add(prereqId);
  }

  const inputOrder = new Map<string, number>();
  skillIds.forEach((id, i) => {
    if (!inputOrder.has(id)) inputOrder.set(id, i);
  });
  const rank = (id: string) => inputOrder.get(id) ?? skillIds.length;

  const inDegree = new Map<string, number>();
  for (const id of working) {
    const node = index.nodesById.get(id);
    const unresolvedPrereqCount = (node?.prerequisites ?? []).filter((p) => working.has(p)).length;
    inDegree.set(id, unresolvedPrereqCount);
  }

  const ready = [...working].filter((id) => inDegree.get(id) === 0);
  const result: string[] = [];

  while (ready.length > 0) {
    ready.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    const id = ready.shift()!;
    result.push(id);
    for (const dependentId of index.dependents.get(id) ?? []) {
      if (!working.has(dependentId)) continue;
      const remaining = (inDegree.get(dependentId) ?? 0) - 1;
      inDegree.set(dependentId, remaining);
      if (remaining === 0) ready.push(dependentId);
    }
  }

  return result;
}

/** BFS depth of `skillId` within `skillIds`' working subgraph (0 = no unresolved prerequisites in scope) — used to bucket tasks into phases. */
export function graphDepth(index: SkillGraphIndex, skillId: string, workingSet: Set<string>): number {
  const node = index.nodesById.get(skillId);
  if (!node) return 0;
  const prereqsInScope = node.prerequisites.filter((p) => workingSet.has(p));
  if (prereqsInScope.length === 0) return 0;
  return 1 + Math.max(...prereqsInScope.map((p) => graphDepth(index, p, workingSet)));
}
