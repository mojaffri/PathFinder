import type { StudentProfile } from "@/types/profile";
import type { ResolvedCareer } from "@/types/career";
import type { GapAnalysis } from "@/types/roadmap";
import type { JobDescription } from "@/types/job";
import type { SkillProgress } from "@/types/skillforge";
import type { AdaptiveRoadmap } from "@/types/adaptive-roadmap";
import { resolveCareers } from "@/types/career";
import { CAREERS } from "@/data/careers";
import { SKILL_GRAPH_NODES } from "@/data/skill-graph";
import { analyzeGaps } from "@/lib/gap-analysis/engine";
import { getProfileByUserId } from "@/repositories/profile-repository";
import { listFullJobDescriptions } from "@/repositories/job-repository";
import { listSkillProgress } from "@/repositories/skillforge-repository";
import { getAdaptiveRoadmap } from "@/repositories/adaptive-roadmap-repository";
import type { SkillConfidenceContext } from "@/lib/evidence/confidence";
import { buildSkillConfidenceContext } from "@/lib/evidence/build-context";
import { profileToRoadmapRequest } from "./profile-to-request";

export interface AdaptiveRoadmapInput {
  userId: string;
  profile: StudentProfile;
  resolvedCareers: ResolvedCareer[];
  gapAnalysis: GapAnalysis;
  savedJobs: JobDescription[];
  skillForgeProgress: Record<string, SkillProgress>;
  confidenceContext: SkillConfidenceContext;
  previous: AdaptiveRoadmap | null;
}

const SKILL_FORGE_MODULE_IDS = [...new Set(SKILL_GRAPH_NODES.map((n) => n.skillForgeModuleId).filter((id): id is string => id !== null))];

/**
 * Composes everything the adaptive roadmap engine needs into one shape —
 * mirrors `lib/evidence/build-context.ts#buildSkillConfidenceContext`'s role
 * as the single assembly point other engines (job-fit, skill-confidence) all
 * share, so this system stays consistent with them rather than re-deriving
 * its own copy of profile/evidence composition logic.
 */
export async function buildAdaptiveRoadmapInput(userId: string): Promise<AdaptiveRoadmapInput | null> {
  const profile = await getProfileByUserId(userId);
  if (!profile) return null;

  const resolvedCareers = resolveCareers(CAREERS, profile.targetCareers);
  const gapAnalysis = analyzeGaps(profileToRoadmapRequest(profile), resolvedCareers);

  const [savedJobs, skillForgeProgress, confidenceContext, previous] = await Promise.all([
    listFullJobDescriptions(userId),
    listSkillProgress(userId, SKILL_FORGE_MODULE_IDS),
    buildSkillConfidenceContext(userId),
    getAdaptiveRoadmap(userId),
  ]);

  return {
    userId,
    profile,
    resolvedCareers,
    gapAnalysis,
    savedJobs,
    skillForgeProgress,
    confidenceContext: confidenceContext ?? { profile, skillForgeModules: [], skillForgeProgress: {}, githubRepos: [], manualEvidence: [] },
    previous,
  };
}
