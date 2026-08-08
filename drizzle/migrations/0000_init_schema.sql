-- NOTE: "auth"."users" is Supabase's own table (created and owned by
-- Supabase Auth, not by this migration). It is intentionally NOT created
-- here — only referenced via FK below. If you are running this migration
-- against a plain Postgres instance (no Supabase), first apply
-- drizzle/test-support/auth-stub.sql to get a minimal stand-in.
CREATE TABLE "awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"organization" text,
	"date" text,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"career_id" text,
	"title" text NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"issuer" text,
	"date" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"institution" text,
	"degree" text,
	"major" text,
	"gpa" numeric(5, 2),
	"gpa_scale" text,
	"start_date" text,
	"end_date" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "education_gpa_scale_check" CHECK ("education"."gpa_scale" IN ('4.0', '5.0', '100', 'other'))
);
--> statement-breakpoint
CREATE TABLE "experience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"title" text,
	"organization" text,
	"location" text,
	"start_date" text,
	"end_date" text,
	"summary" text,
	"bullets" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"age" integer,
	"education_stage" text,
	"school" text DEFAULT '' NOT NULL,
	"major" text DEFAULT '' NOT NULL,
	"gpa_raw" numeric(5, 2),
	"gpa_scale" text,
	"target_industry" text DEFAULT '' NOT NULL,
	"career_goals" text DEFAULT '' NOT NULL,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"weekly_hours_available" integer,
	"preferred_locations" text[] DEFAULT '{}'::text[] NOT NULL,
	"employment_preference" text,
	"target_date" date,
	"work_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_gpa_scale_check" CHECK ("profiles"."gpa_scale" IN ('4.0', '5.0', '100', 'other')),
	CONSTRAINT "profiles_employment_preference_check" CHECK ("profiles"."employment_preference" IS NULL OR "profiles"."employment_preference" IN ('internship', 'full-time', 'either'))
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"title" text NOT NULL,
	"technologies" text[] DEFAULT '{}'::text[] NOT NULL,
	"date" text,
	"summary" text,
	"bullets" text[] DEFAULT '{}'::text[] NOT NULL,
	"github_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"storage_path" text,
	"raw_text" text,
	"extraction_method" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resumes_extraction_method_check" CHECK ("resumes"."extraction_method" IN ('ai', 'heuristic'))
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_source_check" CHECK ("skills"."source" IN ('manual', 'resume'))
);
--> statement-breakpoint
CREATE TABLE "career_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"career_id" text NOT NULL,
	"match_percentage" integer NOT NULL,
	"confidence" text NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_matches_percentage_check" CHECK ("career_matches"."match_percentage" BETWEEN 0 AND 100),
	CONSTRAINT "career_matches_confidence_check" CHECK ("career_matches"."confidence" IN ('low', 'medium', 'high'))
);
--> statement-breakpoint
CREATE TABLE "careers" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gap_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text NOT NULL,
	"impact" integer NOT NULL,
	"effort" integer NOT NULL,
	"time_horizon" text NOT NULL,
	"estimated_hours" integer NOT NULL,
	"relevant_careers" text[] DEFAULT '{}'::text[] NOT NULL,
	"evidence_of_completion" text NOT NULL,
	"tactical_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "gap_items_category_check" CHECK ("gap_items"."category" IN ('academic', 'technical', 'experience', 'professional')),
	CONSTRAINT "gap_items_priority_check" CHECK ("gap_items"."priority" IN ('critical', 'high', 'medium', 'low')),
	CONSTRAINT "gap_items_time_horizon_check" CHECK ("gap_items"."time_horizon" IN ('immediate', 'near-term', 'long-term')),
	CONSTRAINT "gap_items_impact_check" CHECK ("gap_items"."impact" BETWEEN 1 AND 5),
	CONSTRAINT "gap_items_effort_check" CHECK ("gap_items"."effort" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "roadmap_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"objective" text NOT NULL,
	"timeline" text NOT NULL,
	"why_it_matters_for_target" text NOT NULL,
	"resources" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "roadmap_phases_key_check" CHECK ("roadmap_phases"."key" IN ('academic-technical-edge', 'experience-portfolio', 'execution-interview'))
);
--> statement-breakpoint
CREATE TABLE "roadmap_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"estimated_hours" integer NOT NULL,
	"impact" integer NOT NULL,
	"effort" integer,
	"tier" text,
	"prerequisite" text,
	"why_it_matters" text,
	"evidence_of_completion" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "roadmap_tasks_kind_check" CHECK ("roadmap_tasks"."kind" IN ('milestone', 'action')),
	CONSTRAINT "roadmap_tasks_tier_check" CHECK ("roadmap_tasks"."tier" IS NULL OR "roadmap_tasks"."tier" IN ('must-do', 'high-leverage', 'nice-to-have')),
	CONSTRAINT "roadmap_tasks_impact_check" CHECK ("roadmap_tasks"."impact" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "roadmaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"major" text DEFAULT '' NOT NULL,
	"target_careers" text[] DEFAULT '{}'::text[] NOT NULL,
	"education_stage" text,
	"gap_analysis_summary" text[] DEFAULT '{}'::text[] NOT NULL,
	"source" text NOT NULL,
	"generation_source" text NOT NULL,
	"executive_summary" text NOT NULL,
	"current_profile_assessment" text NOT NULL,
	"competitive_advantages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mistakes_to_avoid" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"certification_guidance" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_advantage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"target_resume_benchmark" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"portfolio_ideas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interview_preparation" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reality_check" text NOT NULL,
	"weekly_hours_available" integer,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmaps_source_check" CHECK ("roadmaps"."source" IN ('discover', 'accelerate')),
	CONSTRAINT "roadmaps_generation_source_check" CHECK ("roadmaps"."generation_source" IN ('ai', 'fallback'))
);
--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_progress_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"responses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evaluation" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "assessment_attempts_stage_check" CHECK ("assessment_attempts"."stage" IN ('diagnostic', 'assessment'))
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" text NOT NULL,
	"stage" text NOT NULL,
	"source" text DEFAULT 'catalog' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_stage_check" CHECK ("assessments"."stage" IN ('diagnostic', 'assessment'))
);
--> statement-breakpoint
CREATE TABLE "skill_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_progress_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"strength" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_evidence_type_check" CHECK ("skill_evidence"."type" IN ('project', 'writing-sample', 'certificate', 'portfolio-link', 'other')),
	CONSTRAINT "skill_evidence_strength_check" CHECK ("skill_evidence"."strength" IN ('none', 'weak', 'moderate', 'strong'))
);
--> statement-breakpoint
CREATE TABLE "skill_modules" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"priority" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"level" text DEFAULT 'exposure' NOT NULL,
	"dimensions" jsonb DEFAULT '{"knowledge":0,"ability":0,"evidence":0,"interview":0}'::jsonb NOT NULL,
	"confidence" jsonb DEFAULT '{"knowledge":"low","ability":"low"}'::jsonb NOT NULL,
	"evidence_strength" text DEFAULT 'none' NOT NULL,
	"completed_resource_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"completed_exercise_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"project_challenge_status" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"interview_self_rating" integer,
	"started_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_progress_level_check" CHECK ("skill_progress"."level" IN ('exposure', 'familiar', 'working', 'proficient', 'interview-ready', 'resume-ready')),
	CONSTRAINT "skill_progress_evidence_strength_check" CHECK ("skill_progress"."evidence_strength" IN ('none', 'weak', 'moderate', 'strong')),
	CONSTRAINT "skill_progress_interview_rating_check" CHECK ("skill_progress"."interview_self_rating" IS NULL OR "skill_progress"."interview_self_rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"job_description_id" uuid,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'saved' NOT NULL,
	"applied_at" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_status_check" CHECK ("applications"."status" IN ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "job_descriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"raw_text" text NOT NULL,
	"parsed_requirements" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"job_description_id" uuid NOT NULL,
	"fit_score" integer NOT NULL,
	"gap_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_matches_fit_score_check" CHECK ("job_matches"."fit_score" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_goals" ADD CONSTRAINT "career_goals_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience" ADD CONSTRAINT "experience_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_matches" ADD CONSTRAINT "career_matches_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_matches" ADD CONSTRAINT "career_matches_career_id_careers_id_fk" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_items" ADD CONSTRAINT "gap_items_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_phases" ADD CONSTRAINT "roadmap_phases_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_tasks" ADD CONSTRAINT "roadmap_tasks_phase_id_roadmap_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."roadmap_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_skill_progress_id_skill_progress_id_fk" FOREIGN KEY ("skill_progress_id") REFERENCES "public"."skill_progress"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_skill_id_skill_modules_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skill_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_evidence" ADD CONSTRAINT "skill_evidence_skill_progress_id_skill_progress_id_fk" FOREIGN KEY ("skill_progress_id") REFERENCES "public"."skill_progress"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_progress" ADD CONSTRAINT "skill_progress_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_progress" ADD CONSTRAINT "skill_progress_skill_id_skill_modules_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skill_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_description_id_job_descriptions_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_job_description_id_job_descriptions_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "career_goals_profile_title_key" ON "career_goals" USING btree ("profile_id","title");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_profile_name_key" ON "skills" USING btree ("profile_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "assessments_skill_stage_key" ON "assessments" USING btree ("skill_id","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_progress_profile_skill_key" ON "skill_progress" USING btree ("profile_id","skill_id");