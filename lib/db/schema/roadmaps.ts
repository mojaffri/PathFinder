import { check, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles } from "./profiles";

/**
 * Narrative/prose roadmap fields (executive summary, mistakes to avoid,
 * certification guidance, AI-advantage content, target-resume benchmark,
 * portfolio/interview/tool/resource lists, reality check) stay JSONB on this
 * row — they're generated text with no query need of their own. `gap_items`,
 * `roadmap_phases`, and `roadmap_tasks` are normalized separately because the
 * product roadmap (application tracking, analytics) will eventually need to
 * query/join across them.
 */
export const roadmaps = pgTable("roadmaps", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  /** Snapshot of the profile's major/education stage at save time, so the saved-roadmaps list can render without joining back to the (possibly since-changed) profile. */
  major: text("major").notNull().default(""),
  targetCareers: text("target_careers").array().notNull().default(sql`'{}'::text[]`),
  educationStage: text("education_stage"),
  /** `GapAnalysis.currentStateSummary` — distinct from `currentProfileAssessment` below (deterministic bullet list vs. AI/fallback narrative paragraph). */
  gapAnalysisSummary: text("gap_analysis_summary").array().notNull().default(sql`'{}'::text[]`),
  source: text("source").notNull(),
  generationSource: text("generation_source").notNull(),
  executiveSummary: text("executive_summary").notNull(),
  currentProfileAssessment: text("current_profile_assessment").notNull(),
  competitiveAdvantages: jsonb("competitive_advantages").notNull().default(sql`'[]'::jsonb`),
  mistakesToAvoid: jsonb("mistakes_to_avoid").notNull().default(sql`'[]'::jsonb`),
  certificationGuidance: jsonb("certification_guidance").notNull().default(sql`'[]'::jsonb`),
  aiAdvantage: jsonb("ai_advantage").notNull().default(sql`'{}'::jsonb`),
  targetResumeBenchmark: jsonb("target_resume_benchmark").notNull().default(sql`'{}'::jsonb`),
  portfolioIdeas: jsonb("portfolio_ideas").notNull().default(sql`'[]'::jsonb`),
  interviewPreparation: jsonb("interview_preparation").notNull().default(sql`'[]'::jsonb`),
  recommendedTools: jsonb("recommended_tools").notNull().default(sql`'[]'::jsonb`),
  recommendedResources: jsonb("recommended_resources").notNull().default(sql`'[]'::jsonb`),
  realityCheck: text("reality_check").notNull(),
  weeklyHoursAvailable: integer("weekly_hours_available"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("roadmaps_source_check", sql`${table.source} IN ('discover', 'accelerate')`),
  check("roadmaps_generation_source_check", sql`${table.generationSource} IN ('ai', 'fallback')`),
]);

export const gapItems = pgTable("gap_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  roadmapId: uuid("roadmap_id").notNull().references(() => roadmaps.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull(),
  impact: integer("impact").notNull(),
  effort: integer("effort").notNull(),
  timeHorizon: text("time_horizon").notNull(),
  estimatedHours: integer("estimated_hours").notNull(),
  relevantCareers: text("relevant_careers").array().notNull().default(sql`'{}'::text[]`),
  evidenceOfCompletion: text("evidence_of_completion").notNull(),
  tacticalActions: jsonb("tactical_actions").notNull().default(sql`'[]'::jsonb`),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [
  check("gap_items_category_check", sql`${table.category} IN ('academic', 'technical', 'experience', 'professional')`),
  check("gap_items_priority_check", sql`${table.priority} IN ('critical', 'high', 'medium', 'low')`),
  check("gap_items_time_horizon_check", sql`${table.timeHorizon} IN ('immediate', 'near-term', 'long-term')`),
  check("gap_items_impact_check", sql`${table.impact} BETWEEN 1 AND 5`),
  check("gap_items_effort_check", sql`${table.effort} BETWEEN 1 AND 5`),
]);

export const roadmapPhases = pgTable("roadmap_phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  roadmapId: uuid("roadmap_id").notNull().references(() => roadmaps.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  title: text("title").notNull(),
  objective: text("objective").notNull(),
  timeline: text("timeline").notNull(),
  whyItMattersForTarget: text("why_it_matters_for_target").notNull(),
  resources: text("resources").array().notNull().default(sql`'{}'::text[]`),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [
  check("roadmap_phases_key_check", sql`${table.key} IN ('academic-technical-edge', 'experience-portfolio', 'execution-interview')`),
]);

export const roadmapTasks = pgTable("roadmap_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  phaseId: uuid("phase_id").notNull().references(() => roadmapPhases.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  estimatedHours: integer("estimated_hours").notNull(),
  impact: integer("impact").notNull(),
  effort: integer("effort"),
  tier: text("tier"),
  prerequisite: text("prerequisite"),
  whyItMatters: text("why_it_matters"),
  evidenceOfCompletion: text("evidence_of_completion").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [
  check("roadmap_tasks_kind_check", sql`${table.kind} IN ('milestone', 'action')`),
  check("roadmap_tasks_tier_check", sql`${table.tier} IS NULL OR ${table.tier} IN ('must-do', 'high-leverage', 'nice-to-have')`),
  check("roadmap_tasks_impact_check", sql`${table.impact} BETWEEN 1 AND 5`),
]);
