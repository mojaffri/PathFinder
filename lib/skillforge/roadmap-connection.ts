import { MASTERY_LEVEL_ORDER } from "./mastery";
import type { GapAnalysis, GapItem, SkillModule, SkillProgress } from "@/types";

/**
 * The single most important connection in SkillForge: given a module and the
 * student's actual, already-generated gap analysis, find the real `GapItem`
 * that justifies it. If a live roadmap gap matches, the student sees a "why"
 * grounded in their own roadmap ("your roadmap identifies X..."); if they
 * haven't generated a roadmap yet, or nothing matches, they still get an
 * honest, module-authored explanation instead of a broken/empty section.
 */
export interface RoadmapConnection {
  gap: GapItem | null;
  whyText: string;
}

export function findRoadmapConnection(module: SkillModule, gapAnalysis: GapAnalysis | null): RoadmapConnection {
  if (gapAnalysis) {
    const match = gapAnalysis.gaps.find((gap) => {
      const haystack = `${gap.title} ${gap.description}`.toLowerCase();
      return module.relatedGapKeywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
    });

    if (match) {
      return {
        gap: match,
        whyText: `Your roadmap flags "${match.title}" as a ${match.priority}-priority gap: ${match.description}`,
      };
    }
  }

  return { gap: null, whyText: module.whyItMatters };
}

/**
 * The reverse direction of `findRoadmapConnection`: given the student's live
 * gap analysis and their matched SkillForge modules, which roadmap gaps has
 * the student actually demonstrated? Reuses the exact same
 * `relatedGapKeywords` fuzzy match, just inverted — a gap counts as
 * demonstrated only when a matched module has reached Proficient or higher,
 * never on completion alone (mirrors the "no fake progress" rule already
 * enforced in `recomputeMastery`).
 */
export function getDemonstratedGapIds(
  gapAnalysis: GapAnalysis,
  items: { module: SkillModule; progress: SkillProgress }[],
): Set<string> {
  const demonstratedModules = items.filter(
    ({ progress }) => MASTERY_LEVEL_ORDER.indexOf(progress.mastery.level) >= MASTERY_LEVEL_ORDER.indexOf("proficient"),
  );

  const demonstrated = new Set<string>();
  for (const gap of gapAnalysis.gaps) {
    const haystack = `${gap.title} ${gap.description}`.toLowerCase();
    const matched = demonstratedModules.some(({ module }) =>
      module.relatedGapKeywords.some((keyword) => haystack.includes(keyword.toLowerCase())),
    );
    if (matched) demonstrated.add(gap.id);
  }
  return demonstrated;
}
