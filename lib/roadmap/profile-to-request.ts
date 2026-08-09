import type { StudentProfile } from "@/types/profile";
import type { RoadmapRequest } from "./schema";

/**
 * Server-side equivalent of `components/roadmap/roadmap-generator.tsx`'s
 * client-side `toRoadmapRequestBody` — maps a persisted `StudentProfile`
 * into the `RoadmapRequest` shape `analyzeGaps` expects, so the adaptive
 * roadmap engine can reuse `lib/gap-analysis/engine.ts` unchanged instead of
 * re-deriving gap analysis with new logic.
 */
export function profileToRoadmapRequest(profile: StudentProfile): RoadmapRequest {
  return {
    name: profile.name,
    age: profile.age,
    educationStage: profile.educationStage,
    school: profile.school,
    major: profile.major,
    gpa: profile.gpa,
    education: profile.education,
    targetIndustry: profile.targetIndustry,
    targetCareers: profile.targetCareers,
    currentSkills: profile.currentSkills,
    interests: profile.interests,
    experience: profile.experience,
    projects: profile.projects,
    awards: profile.awards,
    certifications: profile.certifications,
    careerGoals: profile.careerGoals,
    weeklyHoursAvailable: profile.weeklyHoursAvailable,
  };
}
