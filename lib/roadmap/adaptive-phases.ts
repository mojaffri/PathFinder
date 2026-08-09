import type { AdaptiveTask, AdaptivePhase } from "@/types/adaptive-roadmap";
import { graphDepth, type SkillGraphIndex } from "./skill-graph";

const PHASE_META = [
  { key: "foundations", title: "Foundations" },
  { key: "core-competencies", title: "Core Competencies" },
  { key: "applied-advanced", title: "Applied & Advanced" },
] as const;

/**
 * Groups tasks into phases by their dependency depth within the current
 * working set (BFS depth from `lib/roadmap/skill-graph.ts#graphDepth`) —
 * depth 0 (no in-scope prerequisites) is "Foundations", depth 1 is "Core
 * Competencies", depth 2+ collapses into "Applied & Advanced". Unlike the
 * narrative `Roadmap`'s fixed 3-phase structure, an empty phase is simply
 * omitted rather than always rendered.
 */
export function groupTasksIntoPhases(tasks: AdaptiveTask[], index: SkillGraphIndex): AdaptivePhase[] {
  const workingSet = new Set(tasks.map((t) => t.skillId));
  const buckets = new Map<number, AdaptiveTask[]>();

  for (const task of tasks) {
    const depth = graphDepth(index, task.skillId, workingSet);
    const bucket = Math.min(depth, PHASE_META.length - 1);
    const list = buckets.get(bucket) ?? [];
    list.push(task);
    buckets.set(bucket, list);
  }

  const phases: AdaptivePhase[] = [];
  PHASE_META.forEach((meta, i) => {
    const list = buckets.get(i);
    if (!list || list.length === 0) return;
    list.sort((a, b) => b.priorityScore - a.priorityScore || a.skillId.localeCompare(b.skillId));
    phases.push({ key: meta.key, title: meta.title, tasks: list });
  });

  return phases;
}
