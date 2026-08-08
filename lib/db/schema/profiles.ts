import { boolean, check, date, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authUsers } from "./auth";

/**
 * One profile per Supabase auth user (1:1, enforced by the unique index on
 * `userId`). We deliberately don't duplicate `auth.users` into our own
 * `users` table — Supabase already owns identity/email/password; `profiles`
 * is where OUR domain data starts. `id` is its own uuid (not reused from
 * `userId`) so every other table has a stable FK target even if we ever need
 * to support more than one profile per account.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  age: integer("age"),
  educationStage: text("education_stage"),
  school: text("school").notNull().default(""),
  major: text("major").notNull().default(""),
  gpaRaw: numeric("gpa_raw", { precision: 5, scale: 2, mode: "number" }),
  gpaScale: text("gpa_scale"),
  targetIndustry: text("target_industry").notNull().default(""),
  careerGoals: text("career_goals").notNull().default(""),
  interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
  weeklyHoursAvailable: integer("weekly_hours_available"),
  preferredLocations: text("preferred_locations").array().notNull().default(sql`'{}'::text[]`),
  /** Internship vs. full-time vs. either — captured during onboarding, distinct from `educationStage`. */
  employmentPreference: text("employment_preference"),
  /** "I want to be job-ready by" — drives no scoring logic today, shown back to the student as a target. */
  targetDate: date("target_date"),
  workPreferences: jsonb("work_preferences").notNull().default(sql`'{}'::jsonb`),
  isDemo: boolean("is_demo").notNull().default(false),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("profiles_user_id_key").on(table.userId),
  check("profiles_gpa_scale_check", sql`${table.gpaScale} IN ('4.0', '5.0', '100', 'other')`),
  check("profiles_employment_preference_check", sql`${table.employmentPreference} IS NULL OR ${table.employmentPreference} IN ('internship', 'full-time', 'either')`),
]);

export const education = pgTable("education", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  institution: text("institution"),
  degree: text("degree"),
  major: text("major"),
  gpa: numeric("gpa", { precision: 5, scale: 2, mode: "number" }),
  gpaScale: text("gpa_scale"),
  // TEXT, not a real SQL date: resumes and this app's own forms produce
  // partial dates ("2022-08", "2022", "Aug 2022"), which the `date` type
  // rejects outright — a real bug caught by tests/integration/profile-
  // repository.test.ts. `EducationRecord.startDate`/`endDate` are `string |
  // null` in types/records.ts for exactly this reason.
  startDate: text("start_date"),
  endDate: text("end_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("education_gpa_scale_check", sql`${table.gpaScale} IN ('4.0', '5.0', '100', 'other')`),
]);

export const experience = pgTable("experience", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title"),
  organization: text("organization"),
  location: text("location"),
  /** TEXT, not `date` — see the comment on `education.startDate` above. */
  startDate: text("start_date"),
  endDate: text("end_date"),
  summary: text("summary"),
  bullets: text("bullets").array().notNull().default(sql`'{}'::text[]`),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  technologies: text("technologies").array().notNull().default(sql`'{}'::text[]`),
  /** TEXT, not `date` — see the comment on `education.startDate` above. */
  date: text("date"),
  summary: text("summary"),
  bullets: text("bullets").array().notNull().default(sql`'{}'::text[]`),
  githubUrl: text("github_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const awards = pgTable("awards", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  organization: text("organization"),
  /** TEXT, not `date` — see the comment on `education.startDate` above. */
  date: text("date"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const certifications = pgTable("certifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  issuer: text("issuer"),
  /** TEXT, not `date` — see the comment on `education.startDate` above. */
  date: text("date"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One or more target careers a profile is building a roadmap toward — free text with a best-effort FK to the curated `careers` table (null for "Other"/unrecognized). */
export const careerGoals = pgTable("career_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  careerId: text("career_id"),
  title: text("title").notNull(),
  rank: integer("rank").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("career_goals_profile_title_key").on(table.profileId, table.title),
]);

/**
 * The profile's flat, free-text skill tags (`StudentProfile.currentSkills`),
 * normalized into rows. Deliberately separate from SkillForge's
 * `skill_progress` (curated-module mastery tracking) — this table is just
 * "skills the student says they have," sourced from manual entry or resume
 * extraction, not a competency being actively developed.
 */
export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("skills_profile_name_key").on(table.profileId, sql`lower(${table.name})`),
  check("skills_source_check", sql`${table.source} IN ('manual', 'resume')`),
]);

/**
 * The uploaded resume's extracted text + which extraction path produced the
 * profile data pulled from it, plus the original file in Supabase Storage
 * (`storagePath`, bucket `resumes`, path `{profileId}/{resumeId}.{ext}` —
 * see `lib/supabase/storage.ts`). Every upload gets its own row (a
 * "version") rather than overwriting the last one, so a student keeps their
 * upload history; `isActive` marks the one currently backing the profile /
 * used as evidence for job-fit scoring, enforced unique-per-profile via
 * `resumes_one_active_per_profile`.
 */
export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  storagePath: text("storage_path"),
  fileName: text("file_name"),
  fileType: text("file_type"),
  fileSizeBytes: integer("file_size_bytes"),
  rawText: text("raw_text"),
  extractionMethod: text("extraction_method").notNull(),
  extractionConfidence: text("extraction_confidence"),
  isActive: boolean("is_active").notNull().default(false),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("resumes_extraction_method_check", sql`${table.extractionMethod} IN ('ai', 'heuristic')`),
  check("resumes_file_type_check", sql`${table.fileType} IS NULL OR ${table.fileType} IN ('pdf', 'docx')`),
  uniqueIndex("resumes_one_active_per_profile").on(table.profileId).where(sql`${table.isActive}`),
]);
