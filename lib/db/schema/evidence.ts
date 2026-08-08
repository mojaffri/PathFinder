import { boolean, check, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles, projects } from "./profiles";

/**
 * Evidence-backed skills + GitHub integration (this phase). See
 * docs/evidence-model.md and docs/github-integration.md.
 *
 * `github_connections`: at most one per profile — the OAuth access token
 * captured via Supabase's existing GitHub sign-in provider (see
 * `app/auth/callback/route.ts`), AES-256-GCM encrypted at rest
 * (`lib/github/token-crypto.ts`). Entirely optional infrastructure: a
 * student can analyze any public username/repo without ever connecting.
 *
 * `github_repos`: one row per analyzed repository. `connectionId` is
 * nullable — an analysis done via a plain public username/owner/repo
 * lookup (no OAuth) has no connection to attribute it to, and that's a
 * fully supported, equally real path, not a degraded one.
 *
 * `skill_evidence_records`: ONLY manually-added evidence. Auto-derived
 * evidence (from profile skills/experience/projects, SkillForge progress,
 * analyzed GitHub repos) is recomputed on every read by
 * `lib/evidence/confidence.ts` rather than persisted — see that file's
 * header comment for why.
 */
export const githubConnections = pgTable("github_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  githubUsername: text("github_username").notNull(),
  githubUserId: text("github_user_id").notNull(),
  /** AES-256-GCM ciphertext, base64: `{iv}:{authTag}:{ciphertext}` — see `lib/github/token-crypto.ts`. Never stored in plaintext. */
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  scope: text("scope").notNull().default(""),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("github_connections_profile_key").on(table.profileId),
]);

export const githubRepos = pgTable("github_repos", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  connectionId: uuid("connection_id").references(() => githubConnections.id, { onDelete: "set null" }),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  htmlUrl: text("html_url").notNull(),
  description: text("description"),
  primaryLanguage: text("primary_language"),
  languages: jsonb("languages").notNull().default(sql`'[]'::jsonb`),
  packageManifests: text("package_manifests").array().notNull().default(sql`'{}'::text[]`),
  detectedSignals: jsonb("detected_signals").notNull().default(sql`'[]'::jsonb`),
  skillEvidence: jsonb("skill_evidence").notNull().default(sql`'[]'::jsonb`),
  summary: text("summary").notNull().default(""),
  /** Metadata only — see the module doc above and docs/github-integration.md: never used as an engineering-quality/skill signal. */
  stars: integer("stars").notNull().default(0),
  forks: integer("forks").notNull().default(0),
  openIssues: integer("open_issues").notNull().default(0),
  sizeKb: integer("size_kb").notNull().default(0),
  isFork: boolean("is_fork").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  defaultBranch: text("default_branch").notNull().default("main"),
  repoPushedAt: timestamp("repo_pushed_at", { withTimezone: true }),
  repoCreatedAt: timestamp("repo_created_at", { withTimezone: true }),
  linkedProjectId: uuid("linked_project_id").references(() => projects.id, { onDelete: "set null" }),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("github_repos_profile_fullname_key").on(table.profileId, table.fullName),
]);

export const skillEvidenceRecords = pgTable("skill_evidence_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  skillName: text("skill_name").notNull(),
  sourceType: text("source_type").notNull(),
  sourceLabel: text("source_label").notNull(),
  evidenceStrength: text("evidence_strength").notNull(),
  verificationStatus: text("verification_status").notNull().default("self-reported"),
  explanation: text("explanation").notNull(),
  occurredOn: text("occurred_on"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("skill_evidence_records_source_type_check", sql`${table.sourceType} IN ('resume', 'experience', 'project', 'github_repo', 'coursework', 'assessment', 'certification', 'publication')`),
  check("skill_evidence_records_strength_check", sql`${table.evidenceStrength} IN ('weak', 'moderate', 'strong')`),
  check("skill_evidence_records_verification_check", sql`${table.verificationStatus} IN ('unverified', 'self-reported', 'verified')`),
]);
