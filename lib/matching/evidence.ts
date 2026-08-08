import type { StudentProfile } from "@/types";

/**
 * Small fuzzy text-matching helpers shared by `career-fit.ts` and
 * `lib/jobs/fit-scoring.ts`. Deliberately NOT imported into
 * `lib/gap-analysis/engine.ts` (which keeps its own private copies) — that
 * file is flagged in CLAUDE.md as not to be casually restructured, and
 * duplicating ~15 lines of normalization logic is a smaller risk than
 * touching it.
 */

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function fuzzyIncludes(haystack: string[], needle: string): boolean {
  const n = normalizeText(needle);
  if (!n) return false;
  return haystack.some((h) => {
    const nh = normalizeText(h);
    return nh.length > 0 && (nh.includes(n) || n.includes(nh));
  });
}

/** All skill-like text across skills + experience/project bullets, for fuzzy "do they already have this" checks. */
export function demonstratedSkillText(profile: StudentProfile): string[] {
  const fromExperience = profile.experience.flatMap((e) => [e.summary ?? "", ...e.bullets]);
  const fromProjects = profile.projects.flatMap((p) => [p.title, p.summary ?? "", ...p.bullets, ...p.technologies]);
  return [...profile.currentSkills, ...fromExperience, ...fromProjects];
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}
