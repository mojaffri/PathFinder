import { buildGpaInfo } from "@/lib/gpa";
import { EMPTY_GPA, type EducationRecord, type GpaInfo } from "@/types";

/**
 * Derives the top-level school/major/gpa "quick access" fields from the
 * primary (first) education record. Keeps the structured `education[]` list
 * as the source of truth while existing UI that reads `profile.major` etc.
 * directly keeps working.
 */
export function syncPrimaryEducation(education: EducationRecord[]): {
  school: string;
  major: string;
  gpa: GpaInfo;
} {
  const primary = education[0];
  if (!primary) {
    return { school: "", major: "", gpa: EMPTY_GPA };
  }
  return {
    school: primary.institution ?? "",
    major: primary.major ?? "",
    gpa: primary.gpa !== null ? buildGpaInfo(primary.gpa, primary.gpaScale ?? "4.0") : EMPTY_GPA,
  };
}
