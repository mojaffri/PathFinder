import { asc, eq } from "drizzle-orm";
import { withUserContext, type Tx } from "@/lib/db/with-user-context";
import { awards, careerGoals, certifications, education, experience, profiles, projects, skills } from "@/lib/db/schema";
import { buildGpaInfo } from "@/lib/gpa";
import type {
  AwardRecord,
  CertificationRecord,
  EducationRecord,
  EducationStage,
  EmploymentPreference,
  ExperienceRecord,
  GpaScale,
  ProjectRecord,
  StudentProfile,
  WorkPreferences,
} from "@/types";
import { DEFAULT_WORK_PREFERENCES } from "@/types";

type ProfileRow = typeof profiles.$inferSelect;

function toIso(date: Date): string {
  return date.toISOString();
}

async function loadFullProfile(tx: Tx, row: ProfileRow): Promise<StudentProfile> {
  const [educationRows, experienceRows, projectRows, awardRows, certRows, goalRows, skillRows] = await Promise.all([
    tx.select().from(education).where(eq(education.profileId, row.id)).orderBy(asc(education.sortOrder)),
    tx.select().from(experience).where(eq(experience.profileId, row.id)).orderBy(asc(experience.sortOrder)),
    tx.select().from(projects).where(eq(projects.profileId, row.id)).orderBy(asc(projects.sortOrder)),
    tx.select().from(awards).where(eq(awards.profileId, row.id)).orderBy(asc(awards.sortOrder)),
    tx.select().from(certifications).where(eq(certifications.profileId, row.id)).orderBy(asc(certifications.sortOrder)),
    tx.select().from(careerGoals).where(eq(careerGoals.profileId, row.id)).orderBy(asc(careerGoals.rank)),
    tx.select().from(skills).where(eq(skills.profileId, row.id)),
  ]);

  const educationRecords: EducationRecord[] = educationRows.map((e) => ({
    id: e.id,
    institution: e.institution,
    degree: e.degree,
    major: e.major,
    gpa: e.gpa,
    gpaScale: e.gpaScale as GpaScale | null,
    startDate: e.startDate,
    endDate: e.endDate,
  }));

  const experienceRecords: ExperienceRecord[] = experienceRows.map((e) => ({
    id: e.id,
    title: e.title,
    organization: e.organization,
    location: e.location,
    startDate: e.startDate,
    endDate: e.endDate,
    summary: e.summary,
    bullets: e.bullets,
  }));

  const projectRecords: ProjectRecord[] = projectRows.map((p) => ({
    id: p.id,
    title: p.title,
    technologies: p.technologies,
    date: p.date,
    summary: p.summary,
    bullets: p.bullets,
    githubUrl: p.githubUrl,
  }));

  const awardRecords: AwardRecord[] = awardRows.map((a) => ({
    id: a.id,
    name: a.name,
    organization: a.organization,
    date: a.date,
    description: a.description,
  }));

  const certificationRecords: CertificationRecord[] = certRows.map((c) => ({
    id: c.id,
    name: c.name,
    issuer: c.issuer,
    date: c.date,
  }));

  return {
    id: row.id,
    name: row.name,
    age: row.age,
    educationStage: row.educationStage as EducationStage | null,
    school: row.school,
    major: row.major,
    gpa: buildGpaInfo(row.gpaRaw, (row.gpaScale as GpaScale | null) ?? "4.0"),
    education: educationRecords,
    targetIndustry: row.targetIndustry,
    targetCareers: goalRows.map((g) => g.title),
    currentSkills: skillRows.map((s) => s.name),
    interests: row.interests,
    experience: experienceRecords,
    projects: projectRecords,
    awards: awardRecords,
    certifications: certificationRecords,
    careerGoals: row.careerGoals,
    workPreferences: (row.workPreferences as WorkPreferences | null) ?? DEFAULT_WORK_PREFERENCES,
    weeklyHoursAvailable: row.weeklyHoursAvailable,
    preferredLocations: row.preferredLocations,
    employmentPreference: row.employmentPreference as EmploymentPreference | null,
    targetDate: row.targetDate,
    onboardingCompletedAt: row.onboardingCompletedAt ? toIso(row.onboardingCompletedAt) : null,
    isDemo: row.isDemo,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export async function getProfileByUserId(userId: string): Promise<StudentProfile | null> {
  return withUserContext(userId, async (tx) => {
    const [row] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!row) return null;
    return loadFullProfile(tx, row);
  });
}

/**
 * Returns the caller's `profiles.id`, creating a bare row first if one
 * doesn't exist yet. Used by repositories for features that can legitimately
 * happen before a student finishes onboarding/Accelerate (uploading a
 * resume, pasting a job description) and therefore can't assume a profile
 * row already exists — mirrors the same lazy-create pattern
 * `components/accelerate/accelerate-flow.tsx` already uses at the UI layer,
 * just done atomically inside the caller's own transaction. Must be called
 * with a `tx` already opened via `withUserContext`, never standalone.
 */
export async function ensureProfileId(tx: Tx, userId: string): Promise<string> {
  const [existing] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (existing) return existing.id;

  const [row] = await tx.insert(profiles).values({ userId }).returning({ id: profiles.id });
  return row.id;
}

export interface ProfileWriteInput {
  name: string;
  age: number | null;
  educationStage: EducationStage | null;
  school: string;
  major: string;
  gpaRaw: number | null;
  gpaScale: GpaScale | null;
  targetIndustry: string;
  targetCareers: string[];
  currentSkills: string[];
  interests: string[];
  education: EducationRecord[];
  experience: ExperienceRecord[];
  projects: ProjectRecord[];
  awards: AwardRecord[];
  certifications: CertificationRecord[];
  careerGoals: string;
  workPreferences: WorkPreferences;
  weeklyHoursAvailable: number | null;
  preferredLocations: string[];
  employmentPreference: EmploymentPreference | null;
  targetDate: string | null;
}

/**
 * Creates a profile for a user who doesn't have one yet. Fails loudly
 * (unique index on `user_id`) rather than silently overwriting if called
 * twice — callers should check `getProfileByUserId` first.
 */
export async function createProfile(userId: string, input: ProfileWriteInput): Promise<StudentProfile> {
  return withUserContext(userId, async (tx) => {
    const [row] = await tx
      .insert(profiles)
      .values({
        userId,
        name: input.name,
        age: input.age,
        educationStage: input.educationStage,
        school: input.school,
        major: input.major,
        gpaRaw: input.gpaRaw,
        gpaScale: input.gpaScale,
        targetIndustry: input.targetIndustry,
        interests: input.interests,
        careerGoals: input.careerGoals,
        workPreferences: input.workPreferences,
        weeklyHoursAvailable: input.weeklyHoursAvailable,
        preferredLocations: input.preferredLocations,
        employmentPreference: input.employmentPreference,
        targetDate: input.targetDate,
      })
      .returning();

    await writeChildRecords(tx, row.id, input);
    return loadFullProfile(tx, row);
  });
}

/**
 * Full-replace update, mirroring the previous localStorage semantics: every
 * child collection (education/experience/projects/awards/certifications/
 * target careers/skills) is deleted and reinserted from the submitted
 * arrays in one transaction, rather than diffed record-by-record. Correct
 * and simple at this app's per-user data volume (a handful of records);
 * revisit only if per-record history/versioning is ever needed.
 */
export async function updateProfile(userId: string, input: ProfileWriteInput): Promise<StudentProfile> {
  return withUserContext(userId, async (tx) => {
    const [row] = await tx
      .update(profiles)
      .set({
        name: input.name,
        age: input.age,
        educationStage: input.educationStage,
        school: input.school,
        major: input.major,
        gpaRaw: input.gpaRaw,
        gpaScale: input.gpaScale,
        targetIndustry: input.targetIndustry,
        interests: input.interests,
        careerGoals: input.careerGoals,
        workPreferences: input.workPreferences,
        weeklyHoursAvailable: input.weeklyHoursAvailable,
        preferredLocations: input.preferredLocations,
        employmentPreference: input.employmentPreference,
        targetDate: input.targetDate,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId))
      .returning();

    if (!row) throw new Error("No profile exists for this user yet.");

    await Promise.all([
      tx.delete(education).where(eq(education.profileId, row.id)),
      tx.delete(experience).where(eq(experience.profileId, row.id)),
      tx.delete(projects).where(eq(projects.profileId, row.id)),
      tx.delete(awards).where(eq(awards.profileId, row.id)),
      tx.delete(certifications).where(eq(certifications.profileId, row.id)),
      tx.delete(careerGoals).where(eq(careerGoals.profileId, row.id)),
      tx.delete(skills).where(eq(skills.profileId, row.id)),
    ]);
    await writeChildRecords(tx, row.id, input);

    return loadFullProfile(tx, row);
  });
}

async function writeChildRecords(tx: Tx, profileId: string, input: ProfileWriteInput): Promise<void> {
  if (input.education.length > 0) {
    await tx.insert(education).values(
      input.education.map((e, i) => ({
        profileId,
        institution: e.institution,
        degree: e.degree,
        major: e.major,
        gpa: e.gpa,
        gpaScale: e.gpaScale,
        startDate: e.startDate,
        endDate: e.endDate,
        sortOrder: i,
      })),
    );
  }
  if (input.experience.length > 0) {
    await tx.insert(experience).values(
      input.experience.map((e, i) => ({
        profileId,
        title: e.title,
        organization: e.organization,
        location: e.location,
        startDate: e.startDate,
        endDate: e.endDate,
        summary: e.summary,
        bullets: e.bullets,
        sortOrder: i,
      })),
    );
  }
  if (input.projects.length > 0) {
    await tx.insert(projects).values(
      input.projects.map((p, i) => ({
        profileId,
        title: p.title,
        technologies: p.technologies,
        date: p.date,
        summary: p.summary,
        bullets: p.bullets,
        githubUrl: p.githubUrl,
        sortOrder: i,
      })),
    );
  }
  if (input.awards.length > 0) {
    await tx.insert(awards).values(
      input.awards.map((a, i) => ({
        profileId,
        name: a.name,
        organization: a.organization,
        date: a.date,
        description: a.description,
        sortOrder: i,
      })),
    );
  }
  if (input.certifications.length > 0) {
    await tx.insert(certifications).values(
      input.certifications.map((c, i) => ({
        profileId,
        name: c.name,
        issuer: c.issuer,
        date: c.date,
        sortOrder: i,
      })),
    );
  }
  if (input.targetCareers.length > 0) {
    await tx.insert(careerGoals).values(
      input.targetCareers.map((title, i) => ({ profileId, title, rank: i })),
    );
  }
  const uniqueSkills = [...new Set(input.currentSkills.map((s) => s.trim()).filter(Boolean))];
  if (uniqueSkills.length > 0) {
    await tx.insert(skills).values(uniqueSkills.map((name) => ({ profileId, name, source: "manual" })));
  }
}

/** Cascades to every child table via FK `ON DELETE CASCADE` — does NOT delete the Supabase auth user itself; see `lib/supabase/admin.ts` for that. */
export async function deleteProfile(userId: string): Promise<void> {
  await withUserContext(userId, async (tx) => {
    await tx.delete(profiles).where(eq(profiles.userId, userId));
  });
}

/** Used only by `scripts/seed-demo.ts` — flags the seeded showcase account and marks it as fully onboarded. */
export async function markAsDemo(userId: string): Promise<StudentProfile> {
  return withUserContext(userId, async (tx) => {
    const [row] = await tx
      .update(profiles)
      .set({ isDemo: true, onboardingCompletedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();
    if (!row) throw new Error("No profile exists for this user yet.");
    return loadFullProfile(tx, row);
  });
}

/** Marks the onboarding wizard's final step as submitted — idempotent (re-running just refreshes the timestamp). */
export async function completeOnboarding(userId: string): Promise<StudentProfile> {
  return withUserContext(userId, async (tx) => {
    const [row] = await tx
      .update(profiles)
      .set({ onboardingCompletedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();
    if (!row) throw new Error("No profile exists for this user yet.");
    return loadFullProfile(tx, row);
  });
}
