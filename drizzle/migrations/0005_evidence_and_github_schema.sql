CREATE TABLE "github_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"github_username" text NOT NULL,
	"github_user_id" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"connection_id" uuid,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"html_url" text NOT NULL,
	"description" text,
	"primary_language" text,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"package_manifests" text[] DEFAULT '{}'::text[] NOT NULL,
	"detected_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skill_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"forks" integer DEFAULT 0 NOT NULL,
	"open_issues" integer DEFAULT 0 NOT NULL,
	"size_kb" integer DEFAULT 0 NOT NULL,
	"is_fork" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"default_branch" text DEFAULT 'main' NOT NULL,
	"repo_pushed_at" timestamp with time zone,
	"repo_created_at" timestamp with time zone,
	"linked_project_id" uuid,
	"analyzed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_evidence_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"skill_name" text NOT NULL,
	"source_type" text NOT NULL,
	"source_label" text NOT NULL,
	"evidence_strength" text NOT NULL,
	"verification_status" text DEFAULT 'self-reported' NOT NULL,
	"explanation" text NOT NULL,
	"occurred_on" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_evidence_records_source_type_check" CHECK ("skill_evidence_records"."source_type" IN ('resume', 'experience', 'project', 'github_repo', 'coursework', 'assessment', 'certification', 'publication')),
	CONSTRAINT "skill_evidence_records_strength_check" CHECK ("skill_evidence_records"."evidence_strength" IN ('weak', 'moderate', 'strong')),
	CONSTRAINT "skill_evidence_records_verification_check" CHECK ("skill_evidence_records"."verification_status" IN ('unverified', 'self-reported', 'verified'))
);
--> statement-breakpoint
ALTER TABLE "github_connections" ADD CONSTRAINT "github_connections_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repos" ADD CONSTRAINT "github_repos_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repos" ADD CONSTRAINT "github_repos_connection_id_github_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."github_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repos" ADD CONSTRAINT "github_repos_linked_project_id_projects_id_fk" FOREIGN KEY ("linked_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_evidence_records" ADD CONSTRAINT "skill_evidence_records_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "github_connections_profile_key" ON "github_connections" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_repos_profile_fullname_key" ON "github_repos" USING btree ("profile_id","full_name");