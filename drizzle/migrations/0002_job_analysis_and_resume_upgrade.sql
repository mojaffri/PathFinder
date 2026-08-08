CREATE TABLE "job_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_description_id" uuid NOT NULL,
	"category" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"min_years" integer,
	"source" text DEFAULT 'ai' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_requirements_category_check" CHECK ("job_requirements"."category" IN ('required', 'preferred')),
	CONSTRAINT "job_requirements_kind_check" CHECK ("job_requirements"."kind" IN ('skill', 'tool', 'experience', 'education')),
	CONSTRAINT "job_requirements_source_check" CHECK ("job_requirements"."source" IN ('ai', 'manual'))
);
--> statement-breakpoint
ALTER TABLE "job_matches" DROP CONSTRAINT "job_matches_fit_score_check";--> statement-breakpoint
ALTER TABLE "job_matches" ALTER COLUMN "fit_score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "job_matches" ALTER COLUMN "gap_breakdown" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "file_type" text;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "file_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "extraction_confidence" text;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "company" text;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "min_experience_years" integer;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "preferred_experience_years" integer;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "education_requirement" text;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "responsibilities" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "keywords" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "extraction_method" text DEFAULT 'ai' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "extraction_confidence" text;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN "resume_id" uuid;--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN "overall_fit_score" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN "component_scores" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN "requirement_matches" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN "top_recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "job_requirements" ADD CONSTRAINT "job_requirements_job_description_id_job_descriptions_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "resumes_one_active_per_profile" ON "resumes" USING btree ("profile_id") WHERE "resumes"."is_active";--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_file_type_check" CHECK ("resumes"."file_type" IS NULL OR "resumes"."file_type" IN ('pdf', 'docx'));--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_extraction_method_check" CHECK ("job_descriptions"."extraction_method" IN ('ai', 'heuristic'));--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_fit_score_check" CHECK ("job_matches"."overall_fit_score" BETWEEN 0 AND 100);