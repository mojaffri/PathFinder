import { check, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles } from "./profiles";

/**
 * Seeded reference table mirroring `data/skillforge-modules.ts`, same
 * rationale as `careers` — curated content, JSONB, no normalization until
 * something needs to query its internals.
 */
export const skillModules = pgTable("skill_modules", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per (skill, stage) — a queryable pointer to "this skill has a
 * diagnostic" / "this skill has a mastery assessment," seeded alongside
 * `skill_modules` from the same catalog. `assessment_attempts` references
 * this rather than `(skill_id, stage)` directly so a future non-catalog
 * assessment (instructor-authored, timed/proctored) can exist without
 * changing the attempts table's shape.
 */
export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillId: text("skill_id").notNull().references(() => skillModules.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(),
  source: text("source").notNull().default("catalog"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("assessments_skill_stage_key").on(table.skillId, table.stage),
  check("assessments_stage_check", sql`${table.stage} IN ('diagnostic', 'assessment')`),
]);

/** One row per (profile, skill module) — the mastery ladder state SkillForge actually renders. */
export const skillProgress = pgTable("skill_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  skillId: text("skill_id").notNull().references(() => skillModules.id, { onDelete: "cascade" }),
  level: text("level").notNull().default("exposure"),
  dimensions: jsonb("dimensions").notNull().default(sql`'{"knowledge":0,"ability":0,"evidence":0,"interview":0}'::jsonb`),
  confidence: jsonb("confidence").notNull().default(sql`'{"knowledge":"low","ability":"low"}'::jsonb`),
  evidenceStrength: text("evidence_strength").notNull().default("none"),
  completedResourceIds: text("completed_resource_ids").array().notNull().default(sql`'{}'::text[]`),
  completedExerciseIds: text("completed_exercise_ids").array().notNull().default(sql`'{}'::text[]`),
  projectChallengeStatus: jsonb("project_challenge_status").notNull().default(sql`'{}'::jsonb`),
  interviewSelfRating: integer("interview_self_rating"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("skill_progress_profile_skill_key").on(table.profileId, table.skillId),
  check("skill_progress_level_check", sql`${table.level} IN ('exposure', 'familiar', 'working', 'proficient', 'interview-ready', 'resume-ready')`),
  check("skill_progress_evidence_strength_check", sql`${table.evidenceStrength} IN ('none', 'weak', 'moderate', 'strong')`),
  check("skill_progress_interview_rating_check", sql`${table.interviewSelfRating} IS NULL OR ${table.interviewSelfRating} BETWEEN 1 AND 5`),
]);

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillProgressId: uuid("skill_progress_id").notNull().references(() => skillProgress.id, { onDelete: "cascade" }),
  assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "restrict" }),
  stage: text("stage").notNull(),
  responses: jsonb("responses").notNull().default(sql`'[]'::jsonb`),
  evaluation: jsonb("evaluation"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  check("assessment_attempts_stage_check", sql`${table.stage} IN ('diagnostic', 'assessment')`),
]);

export const skillEvidence = pgTable("skill_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillProgressId: uuid("skill_progress_id").notNull().references(() => skillProgress.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  strength: text("strength").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("skill_evidence_type_check", sql`${table.type} IN ('project', 'writing-sample', 'certificate', 'portfolio-link', 'other')`),
  check("skill_evidence_strength_check", sql`${table.strength} IN ('none', 'weak', 'moderate', 'strong')`),
]);
