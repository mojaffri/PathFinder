CREATE TABLE "adaptive_roadmaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"target_careers" text[] DEFAULT '{}'::text[] NOT NULL,
	"target_date" date,
	"weekly_hours_available" integer,
	"readiness" integer DEFAULT 0 NOT NULL,
	"feasibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"saved_job_skill_frequency" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adaptive_roadmaps_readiness_check" CHECK ("adaptive_roadmaps"."readiness" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "adaptive_roadmap_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adaptive_roadmap_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"skill_name" text NOT NULL,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"estimated_hours" integer NOT NULL,
	"prerequisite_skill_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"priority_score" integer NOT NULL,
	"priority_tier" text NOT NULL,
	"scheduled_start_date" date,
	"scheduled_target_date" date,
	"status" text DEFAULT 'not-started' NOT NULL,
	"completion_criteria" text[] DEFAULT '{}'::text[] NOT NULL,
	"learning_resource" jsonb,
	"assessment_skill_forge_module_id" text,
	"evidence_goal" text,
	"source_gap_title" text,
	"source_job_requirement_labels" text[] DEFAULT '{}'::text[] NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adaptive_roadmap_tasks_status_check" CHECK ("adaptive_roadmap_tasks"."status" IN ('not-started', 'in-progress', 'completed', 'skipped')),
	CONSTRAINT "adaptive_roadmap_tasks_tier_check" CHECK ("adaptive_roadmap_tasks"."priority_tier" IN ('critical', 'high', 'medium', 'low'))
);
--> statement-breakpoint
CREATE TABLE "adaptive_roadmap_change_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"trigger" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"summary" text NOT NULL,
	"added_skill_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"removed_skill_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"changed_skill_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "adaptive_roadmap_change_events_trigger_check" CHECK ("adaptive_roadmap_change_events"."trigger" IN ('assessment-passed', 'assessment-failed', 'new-evidence', 'new-github-project', 'new-resume', 'target-role-changed', 'deadline-changed', 'weekly-hours-changed', 'job-analyzed', 'manual'))
);
--> statement-breakpoint
CREATE TABLE "adaptive_roadmap_completed_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"title" text NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"estimated_hours" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adaptive_roadmaps" ADD CONSTRAINT "adaptive_roadmaps_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adaptive_roadmap_phases" ADD CONSTRAINT "adaptive_roadmap_phases_roadmap_id_adaptive_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."adaptive_roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adaptive_roadmap_tasks" ADD CONSTRAINT "adaptive_roadmap_tasks_phase_id_adaptive_roadmap_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."adaptive_roadmap_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adaptive_roadmap_change_events" ADD CONSTRAINT "adaptive_roadmap_change_events_roadmap_id_adaptive_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."adaptive_roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adaptive_roadmap_completed_history" ADD CONSTRAINT "adaptive_roadmap_completed_history_roadmap_id_adaptive_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."adaptive_roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "adaptive_roadmaps_profile_key" ON "adaptive_roadmaps" USING btree ("profile_id");
