import "server-only";
import { getProfileByUserId } from "@/repositories/profile-repository";
import { listSkillProgress } from "@/repositories/skillforge-repository";
import { listRepos } from "@/repositories/github-repository";
import { listManualEvidence } from "@/repositories/evidence-repository";
import { getAllSkillModules } from "@/lib/skillforge/catalog";
import type { SkillConfidenceContext } from "@/lib/evidence/confidence";

/**
 * Assembles a `SkillConfidenceContext` from every source this app already
 * has for a given user — the one place that composes profile + SkillForge
 * progress + analyzed GitHub repos + manual evidence, so both
 * `app/api/skills/confidence/route.ts` and the job-fit engine (which links
 * requirement matches to real evidence — see `lib/jobs/fit-scoring.ts`)
 * build the exact same picture. Returns `null` if the user has no profile
 * yet (nothing to compute confidence against).
 */
export async function buildSkillConfidenceContext(userId: string): Promise<SkillConfidenceContext | null> {
  const profile = await getProfileByUserId(userId);
  if (!profile) return null;

  const skillForgeModules = getAllSkillModules();
  const [skillForgeProgress, githubRepos, manualEvidence] = await Promise.all([
    listSkillProgress(userId, skillForgeModules.map((m) => m.id)),
    listRepos(userId),
    listManualEvidence(userId),
  ]);

  return { profile, skillForgeModules, skillForgeProgress, githubRepos, manualEvidence };
}
