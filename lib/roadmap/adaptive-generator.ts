import type { SkillNode } from "@/types/skill-graph";
import type { AdaptiveTask } from "@/types/adaptive-roadmap";
import type { SavedJobSkillFrequency } from "@/types/adaptive-roadmap";
import type { MasteryLevel } from "@/types/skillforge";
import { SKILL_GRAPH_NODES } from "@/data/skill-graph";
import { SKILL_MODULES } from "@/data/skillforge-modules";
import { computeSkillConfidence } from "@/lib/evidence/confidence";
import { MASTERY_LEVEL_ORDER } from "@/lib/skillforge/mastery";
import { findMatchingGap, findMatchingJobFrequency, scoreSkillPriority } from "./priority";
import { buildSkillGraphIndex, getBlockedSkills, type SkillGraphIndex } from "./skill-graph";
import type { AdaptiveRoadmapInput } from "./adaptive-input";

const MASTERED_LEVEL: MasteryLevel = "proficient";
const REDUCED_ESTIMATE_LEVEL: MasteryLevel = "familiar";
const HIGH_CONFIDENCE_LEVELS = new Set(["high", "very-high"]);

function skillForgeLevel(node: SkillNode, input: AdaptiveRoadmapInput): MasteryLevel | null {
  if (!node.skillForgeModuleId) return null;
  return input.skillForgeProgress[node.skillForgeModuleId]?.mastery.level ?? null;
}

function isMastered(node: SkillNode, input: AdaptiveRoadmapInput): boolean {
  const level = skillForgeLevel(node, input);
  if (level && MASTERY_LEVEL_ORDER.indexOf(level) >= MASTERY_LEVEL_ORDER.indexOf(MASTERED_LEVEL)) return true;
  const confidence = computeSkillConfidence(node.name, input.confidenceContext);
  return HIGH_CONFIDENCE_LEVELS.has(confidence.confidence);
}

function buildReason(node: SkillNode, reasons: string[]): string {
  const meaningful = reasons.filter((r) => !r.includes("already strong"));
  if (meaningful.length === 0) {
    return `${node.name} is a foundational skill for your target career path.`;
  }
  const sentence = meaningful.slice(0, 2).join("; and ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

function buildCompletionCriteria(node: SkillNode): string[] {
  const criteria = [`Complete the core learning material for ${node.name}`];
  if (node.skillForgeModuleId) {
    criteria.push(`Pass the SkillForge assessment for ${node.name}`);
  } else {
    criteria.push(`Practice ${node.name} until you can apply it without guidance`);
  }
  criteria.push(`Produce a real, checkable artifact that demonstrates ${node.name}`);
  return criteria;
}

function findLearningResource(node: SkillNode): AdaptiveTask["learningResource"] {
  if (!node.skillForgeModuleId) return null;
  const skillForgeModule = SKILL_MODULES.find((m) => m.id === node.skillForgeModuleId);
  const resource = skillForgeModule?.learningResources.find((r) => r.depth === "core");
  if (!resource) return null;
  return { title: resource.title, url: resource.url };
}

/**
 * Determines the working set of unmastered skills to build tasks for: every
 * skill-graph node connected to a target career, a real gap, or a saved-job
 * requirement, PLUS every unmet prerequisite those skills transitively need —
 * real dependency-aware task generation, not just leaf skills. Mastered
 * skills are excluded entirely (never given a fresh task); the adaptation
 * layer (`lib/roadmap/adaptation.ts`) is what preserves a previously-
 * completed skill's history if it drops out of scope here.
 */
function resolveWorkingSet(
  index: SkillGraphIndex,
  input: AdaptiveRoadmapInput,
  savedJobSkillFrequency: SavedJobSkillFrequency[],
): Set<string> {
  const targetCareerIds = new Set(input.resolvedCareers.map((rc) => rc.career?.id).filter((id): id is string => !!id));

  const candidateIds = new Set<string>();
  for (const node of SKILL_GRAPH_NODES) {
    const relevantToTarget = Object.keys(node.importanceByCareer).some((id) => targetCareerIds.has(id));
    const matchesGap = findMatchingGap(node, input.gapAnalysis.gaps) !== null;
    const matchesJob = findMatchingJobFrequency(node, savedJobSkillFrequency) !== null;
    if (relevantToTarget || matchesGap || matchesJob) candidateIds.add(node.id);
  }

  const workingSet = new Set<string>();
  const visited = new Set<string>();
  function includeSkill(skillId: string) {
    if (visited.has(skillId)) return;
    visited.add(skillId);
    const node = index.nodesById.get(skillId);
    if (!node) return;
    if (isMastered(node, input)) return;
    workingSet.add(skillId);
    for (const prereqId of node.prerequisites) includeSkill(prereqId);
  }
  for (const id of candidateIds) includeSkill(id);

  return workingSet;
}

export function generateAdaptiveTasks(
  input: AdaptiveRoadmapInput,
  savedJobSkillFrequency: SavedJobSkillFrequency[],
  index: SkillGraphIndex = buildSkillGraphIndex(),
): AdaptiveTask[] {
  const workingSet = resolveWorkingSet(index, input, savedJobSkillFrequency);
  const now = new Date().toISOString();

  const taskIdBySkillId = new Map<string, string>();
  for (const skillId of workingSet) taskIdBySkillId.set(skillId, crypto.randomUUID());

  const tasks: AdaptiveTask[] = [];
  for (const skillId of workingSet) {
    const node = index.nodesById.get(skillId);
    if (!node) continue;

    const matchedGap = findMatchingGap(node, input.gapAnalysis.gaps);
    const jobFrequency = findMatchingJobFrequency(node, savedJobSkillFrequency);
    const blockedSkillsCount = getBlockedSkills(index, skillId).length;
    const confidenceScore = computeSkillConfidence(node.name, input.confidenceContext);
    const masteryLevel = skillForgeLevel(node, input);

    const priority = scoreSkillPriority(node, { matchedGap, jobFrequency, blockedSkillsCount, confidenceScore, masteryLevel });

    const reduced = masteryLevel !== null && MASTERY_LEVEL_ORDER.indexOf(masteryLevel) >= MASTERY_LEVEL_ORDER.indexOf(REDUCED_ESTIMATE_LEVEL);
    const estimatedHours = reduced ? Math.max(1, Math.round(node.estimatedHours * 0.6)) : node.estimatedHours;

    tasks.push({
      id: taskIdBySkillId.get(skillId)!,
      skillId: node.id,
      skillName: node.name,
      title: node.prerequisites.length === 0 ? `Learn ${node.name}` : `Build proficiency in ${node.name}`,
      reason: buildReason(node, priority.reasons),
      estimatedHours,
      prerequisiteTaskIds: node.prerequisites
        .filter((p) => workingSet.has(p))
        .map((p) => taskIdBySkillId.get(p))
        .filter((id): id is string => id !== undefined),
      priorityScore: priority.score,
      priorityTier: priority.tier,
      scheduledStartDate: null,
      scheduledTargetDate: null,
      status: "not-started",
      completionCriteria: buildCompletionCriteria(node),
      learningResource: findLearningResource(node),
      assessmentSkillForgeModuleId: node.skillForgeModuleId,
      evidenceGoal: matchedGap?.evidenceOfCompletion ?? `A deployed project, repository, or work sample that clearly demonstrates ${node.name}`,
      sourceGapTitle: matchedGap?.title ?? null,
      sourceJobRequirementLabels: jobFrequency ? [jobFrequency.skill] : [],
      completedAt: null,
      createdAt: now,
    });
  }

  return tasks;
}
