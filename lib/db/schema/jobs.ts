import { check, integer, jsonb, pgTable, text, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles, resumes } from "./profiles";

/**
 * Job-description analysis + deterministic job-fit scoring (Phase 2, per
 * docs/implementation-plan.md). `job_descriptions` holds the raw pasted text
 * plus AI-extracted top-level fields; `job_requirements` normalizes the
 * individual required/preferred skills/tools/education items so a student
 * can edit or remove any single misextracted requirement without touching
 * the rest. `job_matches` is a point-in-time snapshot of a fit-analysis run
 * (deterministic — see lib/jobs/fit-scoring.ts) against a specific resume's
 * evidence, kept as history rather than recomputed-only since a student may
 * want to compare fit before/after building evidence for a gap.
 */
export const jobDescriptions = pgTable("job_descriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  rawText: text("raw_text").notNull(),
  title: text("title"),
  company: text("company"),
  minExperienceYears: integer("min_experience_years"),
  preferredExperienceYears: integer("preferred_experience_years"),
  educationRequirement: text("education_requirement"),
  responsibilities: text("responsibilities").array().notNull().default(sql`'{}'::text[]`),
  keywords: text("keywords").array().notNull().default(sql`'{}'::text[]`),
  extractionMethod: text("extraction_method").notNull().default("ai"),
  extractionConfidence: text("extraction_confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("job_descriptions_extraction_method_check", sql`${table.extractionMethod} IN ('ai', 'heuristic')`),
]);

/**
 * One row per individual requirement (a skill, a tool, an experience
 * threshold, an education floor, a responsibility keyword) — normalized
 * specifically so the review UI can let a student edit/remove/add a single
 * misextracted item rather than re-parsing the whole posting. `category`
 * captures required-vs-preferred (the #1 input to gap prioritization);
 * `kind` distinguishes what's being matched so fit-scoring knows how to
 * compare it against the profile (a "skill" is fuzzy-matched against
 * skills/experience/project text, an "experience" kind carries `minYears`
 * instead of a plain label match).
 */
export const jobRequirements = pgTable("job_requirements", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobDescriptionId: uuid("job_description_id").notNull().references(() => jobDescriptions.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  minYears: integer("min_years"),
  source: text("source").notNull().default("ai"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("job_requirements_category_check", sql`${table.category} IN ('required', 'preferred')`),
  check("job_requirements_kind_check", sql`${table.kind} IN ('skill', 'tool', 'experience', 'education')`),
  check("job_requirements_source_check", sql`${table.source} IN ('ai', 'manual')`),
]);

export const jobMatches = pgTable("job_matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  jobDescriptionId: uuid("job_description_id").notNull().references(() => jobDescriptions.id, { onDelete: "cascade" }),
  resumeId: uuid("resume_id").references(() => resumes.id, { onDelete: "set null" }),
  overallFitScore: integer("overall_fit_score").notNull(),
  componentScores: jsonb("component_scores").notNull().default(sql`'{}'::jsonb`),
  requirementMatches: jsonb("requirement_matches").notNull().default(sql`'[]'::jsonb`),
  topRecommendations: jsonb("top_recommendations").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("job_matches_fit_score_check", sql`${table.overallFitScore} BETWEEN 0 AND 100`),
]);

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  jobDescriptionId: uuid("job_description_id").references(() => jobDescriptions.id, { onDelete: "set null" }),
  company: text("company").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("saved"),
  appliedAt: date("applied_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("applications_status_check", sql`${table.status} IN ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn')`),
]);
