import "server-only";
import type { GithubApiError } from "@/types";

/**
 * Thin wrapper over the official GitHub REST API (v3, `application/vnd.github+json`)
 * — no SDK dependency, just `fetch` with consistent auth/error/rate-limit
 * handling. Every function here is read-only. `accessToken` is optional
 * throughout: unauthenticated requests work (60 req/hr per IP), an
 * app-level `GITHUB_TOKEN` (if configured) raises that to 5000/hr for
 * everyone, and a connected user's own OAuth token (see
 * `lib/github/token-crypto.ts`) raises it further and is used automatically
 * when passed in.
 */

const GITHUB_API_BASE = "https://api.github.com";

export class GithubError extends Error {
  status: number;
  isRateLimit: boolean;
  retryAfterSeconds: number | null;

  constructor(info: GithubApiError) {
    super(info.message);
    this.name = "GithubError";
    this.status = info.status;
    this.isRateLimit = info.isRateLimit;
    this.retryAfterSeconds = info.retryAfterSeconds;
  }
}

interface RequestOptions {
  accessToken?: string | null;
}

function rateLimitInfo(res: Response): { isRateLimit: boolean; retryAfterSeconds: number | null } {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  const retryAfter = res.headers.get("retry-after");
  const isRateLimit = res.status === 429 || (res.status === 403 && remaining === "0");

  let retryAfterSeconds: number | null = null;
  if (retryAfter) retryAfterSeconds = Number(retryAfter);
  else if (isRateLimit && reset) retryAfterSeconds = Math.max(0, Number(reset) - Math.floor(Date.now() / 1000));

  return { isRateLimit, retryAfterSeconds };
}

async function githubJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.accessToken ?? process.env.GITHUB_TOKEN ?? null;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "PathFinder-App",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${GITHUB_API_BASE}${path}`, { headers });
  } catch {
    throw new GithubError({ status: 0, message: "Couldn't reach GitHub. Check your connection and try again.", isRateLimit: false, retryAfterSeconds: null });
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new GithubError({ status: 404, message: "Not found on GitHub — check the username/repository and try again.", isRateLimit: false, retryAfterSeconds: null });
    }
    const { isRateLimit, retryAfterSeconds } = rateLimitInfo(res);
    if (isRateLimit) {
      const minutes = retryAfterSeconds ? Math.max(1, Math.ceil(retryAfterSeconds / 60)) : null;
      throw new GithubError({
        status: res.status,
        message: minutes ? `GitHub API rate limit reached. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.` : "GitHub API rate limit reached. Try again later.",
        isRateLimit: true,
        retryAfterSeconds,
      });
    }
    throw new GithubError({ status: res.status, message: `GitHub API error (${res.status}). Please try again.`, isRateLimit: false, retryAfterSeconds: null });
  }

  return res.json() as Promise<T>;
}

export interface GithubUserSummary {
  login: string;
  id: number;
  name: string | null;
}

export interface GithubRepoSummary {
  name: string;
  owner: { login: string };
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  pushed_at: string | null;
  created_at: string | null;
  fork: boolean;
  archived: boolean;
  private: boolean;
  language: string | null;
}

export interface GithubTreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
  sha: string;
}

export async function fetchUser(username: string, accessToken?: string | null): Promise<GithubUserSummary> {
  return githubJson(`/users/${encodeURIComponent(username)}`, { accessToken });
}

export async function fetchAuthenticatedUser(accessToken: string): Promise<GithubUserSummary> {
  return githubJson(`/user`, { accessToken });
}

export async function fetchRepo(owner: string, repo: string, accessToken?: string | null): Promise<GithubRepoSummary> {
  return githubJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, { accessToken });
}

export async function fetchUserRepos(accessToken: string): Promise<GithubRepoSummary[]> {
  return githubJson(`/user/repos?per_page=100&sort=updated&affiliation=owner`, { accessToken });
}

export async function fetchPublicRepos(username: string, accessToken?: string | null): Promise<GithubRepoSummary[]> {
  return githubJson(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`, { accessToken });
}

export async function fetchLanguages(owner: string, repo: string, accessToken?: string | null): Promise<Record<string, number>> {
  return githubJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`, { accessToken });
}

/** `branch` is passed directly as the tree ref — GitHub resolves a branch name to its commit's tree for this endpoint, so a separate commit lookup isn't needed. */
export async function fetchTree(owner: string, repo: string, branch: string, accessToken?: string | null): Promise<{ tree: GithubTreeEntry[]; truncated: boolean }> {
  return githubJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { accessToken });
}

/** Returns `null` for a missing file (never throws on 404) — callers loop over candidate manifest paths and many won't exist in a given repo. */
export async function fetchFileContent(owner: string, repo: string, path: string, accessToken?: string | null): Promise<string | null> {
  try {
    const data = await githubJson<{ content?: string; encoding?: string }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
      { accessToken },
    );
    if (data.content && data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch (error) {
    if (error instanceof GithubError && error.status === 404) return null;
    throw error;
  }
}
