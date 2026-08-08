/**
 * GitHub repository analysis — deterministic signal extraction from the
 * official GitHub REST API (`lib/github/*`). Metadata like stars/forks/size
 * is carried through for display only; per the task's explicit instruction,
 * none of it feeds `DetectedSignal` confidence or skill evidence — engineering
 * quality signals come from what's actually IN the repo (tests, CI, manifests),
 * never popularity.
 */

export type DetectorKey = "testing" | "database" | "deployment" | "backendApi" | "cicd" | "docker" | "readme";

export interface DetectedSignal {
  key: DetectorKey;
  label: string;
  detected: boolean;
  confidence: "low" | "medium" | "high";
  /** The specific files/dependencies that triggered this detector — the "what was actually detected" the task requires, not just a bare boolean. */
  evidence: string[];
}

export interface RepoLanguageBreakdown {
  language: string;
  bytes: number;
  /** 0-100, rounded — share of this language across the repo's detected bytes. */
  percentage: number;
}

/** Repository facts that are shown as metadata but are explicitly NOT used to infer engineering quality (see module doc above). */
export interface RepoMetadata {
  stars: number;
  forks: number;
  openIssues: number;
  sizeKb: number;
  pushedAt: string | null;
  createdAt: string | null;
  defaultBranch: string;
  isFork: boolean;
  isArchived: boolean;
}

/** The full deterministic analysis of one public repository. */
export interface RepoAnalysis {
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  primaryLanguage: string | null;
  languages: RepoLanguageBreakdown[];
  packageManifests: string[];
  detectedSignals: DetectedSignal[];
  metadata: RepoMetadata;
  /** Skill labels this repo's objective signals support — see `lib/github/map-to-skills.ts`. Each entry carries its own evidence strength, computed deterministically. */
  skillEvidence: { skill: string; strength: "weak" | "moderate" | "strong"; reason: string }[];
  /** Deterministic template sentence by default; replaced with an AI-polished version when `ANTHROPIC_API_KEY` is configured — see `lib/github/narrative.ts`. Never invents a signal that wasn't actually detected. */
  summary: string;
  analyzedAt: string;
}

/** A persisted, profile-owned analysis — `RepoAnalysis` plus the bookkeeping fields `github_repos` actually stores. */
export interface GithubRepoRecord extends RepoAnalysis {
  id: string;
  /** A profile `projects` entry this repo has been linked to, if any — see `types/records.ts`'s `ProjectRecord.githubUrl`. */
  linkedProjectId: string | null;
}

export interface GithubConnectionStatus {
  connected: boolean;
  username: string | null;
  connectedAt: string | null;
}

/** Public-facing GitHub REST API error shape, normalized so callers don't need to know GitHub's exact response format. */
export interface GithubApiError {
  status: number;
  message: string;
  /** True when this was specifically a rate-limit (403/429 with a rate-limit header) — callers can surface a friendlier "try again in N minutes" message. */
  isRateLimit: boolean;
  /** Seconds until the rate limit resets, when known. */
  retryAfterSeconds: number | null;
}
