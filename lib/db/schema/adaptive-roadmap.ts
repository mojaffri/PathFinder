import { check, date, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles } from "./profiles";

/**
 * Phase 3 — the adaptive, evidence-aware roadmap engine. A SEPARATE system
 * from `roadmaps`/`gap_items`/`roadmap_phases`/`roadmap_tasks` (the narrative
 * `Roadmap`, untouched by this phase) — see `types/adaptive-roadmap.ts` and
 * `docs/roadmap-engine.md`. One active adaptive roadmap per profile
 * (`adaptive_roadmaps.profile_id` is UNIQUE), unlike the narrative roadmap's
 * multiple saved snapshots.
 *
 * `adaptive_roadmap_change_events` and `adaptive_roadmap_completed_history`
 * are APPEND-ONLY — `repositories/adaptive-roadmap-repository.ts` never
 * deletes rows from either on a regenerate, only inserts new ones, so a
 * student's completed-task and change history survives every recompute.
 */
export const adaptiveRoadmaps = pgTable("adaptive_roadmaps", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  targetCareers: text("target_careers").array().notNull().default(sql`'{}'::text[]`),
  targetDate: date("target_date"),
  weeklyHoursAvailable: integer("weekly_hours_available"),
  readiness: integer("readiness").notNull().default(0),
  feasibility: jsonb("feasibility").notNull().default(sql`'{}'::jsonb`),
  savedJobSkillFrequency: jsonb("saved_job_skill_frequency").notNull().default(sql`'[]'::jsonb`),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("adaptive_roadmaps_profile_key").on(table.profileId),
  check("adaptive_roadmaps_readiness_check", sql`${table.readiness} BETWEEN 0 AND 100`),
]);

export const adaptiveRoadmapPhases = pgTable("adaptive_roadmap_phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  roadmapId: uuid("roadmap_id").notNull().references(() => adaptiveRoadmaps.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const adaptiveRoadmapTasks = pgTable("adaptive_roadmap_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  phaseId: uuid("phase_id").notNull().references(() => adaptiveRoadmapPhases.id, { onDelete: "cascade" }),
  skillId: text("skill_id").notNull(),
  skillName: text("skill_name").notNull(),
  title: text("title").notNull(),
  reason: text("reason").notNull(),
  estimatedHours: integer("estimated_hours").notNull(),
  /** Resolved back to sibling task ids at read time via `skillId` — avoids self-referential FK complexity (see `repositories/adaptive-roadmap-repository.ts`). */
  prerequisiteSkillIds: text("prerequisite_skill_ids").array().notNull().default(sql`'{}'::text[]`),
  priorityScore: integer("priority_score").notNull(),
  priorityTier: text("priority_tier").notNull(),
  scheduledStartDate: date("scheduled_start_date"),
  scheduledTargetDate: date("scheduled_target_date"),
  status: text("status").notNull().default("not-started"),
  completionCriteria: text("completion_criteria").array().notNull().default(sql`'{}'::text[]`),
  learningResource: jsonb("learning_resource"),
  assessmentSkillForgeModuleId: text("assessment_skill_forge_module_id"),
  evidenceGoal: text("evidence_goal"),
  sourceGapTitle: text("source_gap_title"),
  sourceJobRequirementLabels: text("source_job_requirement_labels").array().notNull().default(sql`'{}'::text[]`),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("adaptive_roadmap_tasks_status_check", sql`${table.status} IN ('not-started', 'in-progress', 'completed', 'skipped')`),
  check("adaptive_roadmap_tasks_tier_check", sql`${table.priorityTier} IN ('critical', 'high', 'medium', 'low')`),
]);

export const adaptiveRoadmapChangeEvents = pgTable("adaptive_roadmap_change_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  roadmapId: uuid("roadmap_id").notNull().references(() => adaptiveRoadmaps.id, { onDelete: "cascade" }),
  trigger: text("trigger").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  summary: text("summary").notNull(),
  addedSkillIds: text("added_skill_ids").array().notNull().default(sql`'{}'::text[]`),
  removedSkillIds: text("removed_skill_ids").array().notNull().default(sql`'{}'::text[]`),
  changedSkillIds: text("changed_skill_ids").array().notNull().default(sql`'{}'::text[]`),
}, (table) => [
  check(
    "adaptive_roadmap_change_events_trigger_check",
    sql`${table.trigger} IN ('assessment-passed', 'assessment-failed', 'new-evidence', 'new-github-project', 'new-resume', 'target-role-changed', 'deadline-changed', 'weekly-hours-changed', 'job-analyzed', 'manual')`,
  ),
]);

export const adaptiveRoadmapCompletedHistory = pgTable("adaptive_roadmap_completed_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  roadmapId: uuid("roadmap_id").notNull().references(() => adaptiveRoadmaps.id, { onDelete: "cascade" }),
  skillId: text("skill_id").notNull(),
  title: text("title").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
  estimatedHours: integer("estimated_hours").notNull(),
});
