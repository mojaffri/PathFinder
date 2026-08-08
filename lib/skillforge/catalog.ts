import { CAREERS } from "@/data/careers";
import { SKILL_MODULES } from "@/data/skillforge-modules";
import { resolveCareers } from "@/types";
import type { SkillModule } from "@/types";

const PRIORITY_RANK: Record<SkillModule["priority"], number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function getAllSkillModules(): SkillModule[] {
  return SKILL_MODULES;
}

export function getSkillModule(skillId: string): SkillModule | null {
  return SKILL_MODULES.find((m) => m.id === skillId) ?? null;
}

/**
 * Resolves a student's target career titles (free text, exactly as stored on
 * `StudentProfile.targetCareers`) against the existing career taxonomy —
 * never a second one — and returns every module relevant to them. A module
 * tagged to the student's exact career ranks above one that only matches
 * their broader category, so a dedicated match always wins over a fallback.
 */
export function getSkillModulesForCareers(targetCareerTitles: string[]): SkillModule[] {
  const resolved = resolveCareers(CAREERS, targetCareerTitles);
  const careerIds = new Set(resolved.map((rc) => rc.career?.id).filter((id): id is string => Boolean(id)));
  const categories = new Set(resolved.map((rc) => rc.career?.category).filter((c): c is SkillModule["category"] => Boolean(c)));

  if (careerIds.size === 0 && categories.size === 0) return [];

  const scored = SKILL_MODULES.map((module) => {
    const exactMatch = module.targetCareerIds.some((id) => careerIds.has(id));
    const categoryMatch = categories.has(module.category);
    return { module, exactMatch, categoryMatch };
  }).filter((s) => s.exactMatch || s.categoryMatch);

  return scored
    .sort((a, b) => {
      if (a.exactMatch !== b.exactMatch) return a.exactMatch ? -1 : 1;
      return PRIORITY_RANK[b.module.priority] - PRIORITY_RANK[a.module.priority];
    })
    .map((s) => s.module);
}
