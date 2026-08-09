import type { CareerCategory } from "./career";
import type { RatingScale } from "./profile";

/**
 * The skill dependency graph is a separate, broader catalog from
 * SkillForge's own curated `SkillModule` catalog (`types/skillforge.ts`).
 * SkillForge modules are deep, guided-practice content units for a small set
 * of skills; `SkillNode`s are lightweight graph nodes spanning a much wider
 * set of skills (including ones SkillForge doesn't have a module for yet),
 * used only for dependency ordering and adaptive-roadmap scheduling. A node
 * MAY point at a real SkillForge module via `skillForgeModuleId` when one
 * exists — that's the only connection between the two catalogs.
 */
export interface SkillNode {
  id: string;
  name: string;
  category: CareerCategory;
  /** SkillNode ids that should be developed before this one. */
  prerequisites: string[];
  /** Hours to reach working competency — same unit/pacing convention as `SkillModule.estimatedHours` and `GapItem.estimatedHours`. */
  estimatedHours: number;
  /** Real `Career.id` keys from `data/careers.ts` — how much this skill matters for a given target career. Absent = not specifically relevant. */
  importanceByCareer: Partial<Record<string, RatingScale>>;
  /** Real `SkillModule.id` from `data/skillforge-modules.ts` when this skill has an assessable SkillForge module, else null. */
  skillForgeModuleId: string | null;
  /** Keywords fuzzy-matched against `GapItem.title`/`description` and `JobRequirement.label` text to connect this node to a student's real gaps and saved jobs. */
  relatedGapKeywords: string[];
}
