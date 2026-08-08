import type { DiagnosisResult, SkillModule } from "@/types";

/**
 * Root-cause backtracking (spec rules 8-9): given a weak concept id an
 * evaluation flagged, find the SMALLEST useful thing to review.
 *
 * 1. If the concept belongs to the skill itself, recommend a targeted review
 *    within the same skill — no backtracking needed ("your issue doesn't
 *    appear to be X as a whole, it's a gap in this specific concept").
 * 2. Otherwise walk the prerequisite chain breadth-first (nearest first) and
 *    recommend the NEAREST prerequisite module that actually teaches that
 *    concept — never jump straight to the deepest ancestor when a closer
 *    module already covers it.
 * 3. If no module anywhere declares that concept, return null — the caller
 *    falls back to the evaluation's own generic weakness text.
 */
export function diagnoseWeakConcept(
  module: SkillModule,
  allModules: SkillModule[],
  weakestConceptId: string | null,
): DiagnosisResult | null {
  if (!weakestConceptId) return null;

  const ownConcept = module.concepts.find((c) => c.id === weakestConceptId);
  if (ownConcept) {
    return {
      conceptId: ownConcept.id,
      conceptTitle: ownConcept.title,
      recommendedSkillId: module.id,
      recommendedSkillName: module.name,
      withinSameSkill: true,
      explanation: `Your issue doesn't appear to be ${module.name} as a whole — your response suggests a specific gap in ${ownConcept.title}.`,
      estimatedReviewMinutes: 30,
    };
  }

  const visited = new Set<string>([module.id]);
  let frontier = module.prerequisites;

  while (frontier.length > 0) {
    for (const id of frontier) {
      if (visited.has(id)) continue;
      visited.add(id);

      const prereqModule = allModules.find((m) => m.id === id);
      if (!prereqModule) continue;

      const concept = prereqModule.concepts.find((c) => c.id === weakestConceptId);
      if (concept) {
        return {
          conceptId: concept.id,
          conceptTitle: concept.title,
          recommendedSkillId: prereqModule.id,
          recommendedSkillName: prereqModule.name,
          withinSameSkill: false,
          explanation: `Your issue doesn't appear to be ${module.name} as a whole — your response suggests a gap in ${concept.title}, which is foundational material from "${prereqModule.name}".`,
          estimatedReviewMinutes: 60,
        };
      }
    }

    frontier = frontier
      .flatMap((id) => allModules.find((m) => m.id === id)?.prerequisites ?? [])
      .filter((id) => !visited.has(id));
  }

  return null;
}
