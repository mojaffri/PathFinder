import type { ProfileFormValues } from "@/components/profile/profile-form";
import { EDUCATION_STAGES, type EducationStage, type ResumeProfileData } from "@/types";
import { syncPrimaryEducation } from "@/lib/profile-sync";

function normalizeEducationStage(value: string | null): EducationStage | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  // Extractors are prompted to return one of our exact enum values; exact match first.
  const exact = EDUCATION_STAGES.find((stage) => stage.value === lower);
  if (exact) return exact.value;
  // Loose fallback for the heuristic path's less precise output.
  const loose = EDUCATION_STAGES.find((stage) => lower.includes(stage.value.replace(/-/g, " ")));
  return loose?.value ?? null;
}

/** Merges resume-extracted data on top of the student's existing profile fields (if any). */
export function mapResumeDataToProfileValues(
  resumeData: ResumeProfileData,
  base: ProfileFormValues,
): ProfileFormValues {
  const education = resumeData.education.length > 0 ? resumeData.education : base.education;
  const primary = syncPrimaryEducation(education);

  return {
    ...base,
    educationStage: normalizeEducationStage(resumeData.educationStage) ?? base.educationStage,
    education,
    school: primary.school || base.school,
    major: primary.major || base.major,
    gpa: primary.gpa.raw !== null ? primary.gpa : base.gpa,
    currentSkills: resumeData.skills.length > 0 ? resumeData.skills : base.currentSkills,
    experience: resumeData.experience.length > 0 ? resumeData.experience : base.experience,
    projects: resumeData.projects.length > 0 ? resumeData.projects : base.projects,
    awards: resumeData.awards.length > 0 ? resumeData.awards : base.awards,
    certifications: resumeData.certifications.length > 0 ? resumeData.certifications : base.certifications,
  };
}
