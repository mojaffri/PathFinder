import { MASTERY_LEVEL_ORDER } from "./mastery";
import type { ReadinessCheck, ReadinessGap, SkillModule, SkillProgress } from "@/types";

/**
 * "Guided freedom, not gatekeeping" (spec rule 10): this NEVER returns
 * something the UI should use to disable a control. It only surfaces
 * background gaps in a skill's declared prerequisites so the student can
 * make an informed choice — "You're free to start this. One heads-up..." —
 * before diving into a diagnostic, assessment, or project.
 */
export function checkReadiness(
  module: SkillModule,
  allModules: SkillModule[],
  getProgress: (skillId: string) => SkillProgress,
): ReadinessCheck {
  const gaps: ReadinessGap[] = [];

  for (const prereqId of module.prerequisites) {
    const prereqModule = allModules.find((m) => m.id === prereqId);
    if (!prereqModule) continue;

    const progress = getProgress(prereqId);
    const level = progress.mastery.level;
    if (MASTERY_LEVEL_ORDER.indexOf(level) >= MASTERY_LEVEL_ORDER.indexOf("working")) continue;

    const totalItems = prereqModule.learningResources.length + prereqModule.practiceExercises.length;
    const completedItems = progress.completedResourceIds.length + progress.completedExerciseIds.length;
    const remainingFraction = totalItems > 0 ? 1 - completedItems / totalItems : 1;
    const estimatedReviewHours = Math.min(4, Math.max(1, Math.round(prereqModule.estimatedHours * remainingFraction * 0.15)));

    gaps.push({
      skillId: prereqModule.id,
      skillName: prereqModule.name,
      reason: `Your current progress suggests you haven't consistently demonstrated ${prereqModule.name} yet (currently "${level}").`,
      estimatedReviewHours,
    });
  }

  return { ready: gaps.length === 0, gaps };
}
