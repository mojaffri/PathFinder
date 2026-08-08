import type { GithubConnectionStatus, GithubRepoRecord } from "@/types";

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function getGithubConnectionStatus(): Promise<GithubConnectionStatus> {
  const res = await fetch("/api/github/connection");
  if (res.status === 401) return { connected: false, username: null, connectedAt: null };
  const data = (await parseJsonOrThrow(res)) as { connection: GithubConnectionStatus };
  return data.connection;
}

export async function disconnectGithub(): Promise<void> {
  await fetch("/api/github/connection", { method: "DELETE" });
}

/** Looks up a public GitHub username's repos — works with no connection at all, per "analyze a public username without requiring OAuth." */
export async function lookupPublicRepos(username: string): Promise<{ name: string; fullName: string; description: string | null; language: string | null }[]> {
  const res = await fetch(`/api/github/lookup?username=${encodeURIComponent(username)}`);
  const data = (await parseJsonOrThrow(res)) as { repos: { name: string; fullName: string; description: string | null; language: string | null }[] };
  return data.repos;
}

/** Lists the connected account's own repos (requires a connection) — used for the "pick from my repos" import picker. */
export async function listMyGithubRepos(): Promise<{ name: string; fullName: string; description: string | null; language: string | null }[]> {
  const res = await fetch("/api/github/lookup");
  const data = (await parseJsonOrThrow(res)) as { repos: { name: string; fullName: string; description: string | null; language: string | null }[] };
  return data.repos;
}

export async function importRepo(owner: string, repo: string): Promise<GithubRepoRecord> {
  const res = await fetch("/api/github/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, repo }),
  });
  const data = (await parseJsonOrThrow(res)) as { repo: GithubRepoRecord };
  return data.repo;
}

export async function listAnalyzedRepos(): Promise<GithubRepoRecord[]> {
  const res = await fetch("/api/github/repos");
  if (res.status === 401) return [];
  const data = (await parseJsonOrThrow(res)) as { repos: GithubRepoRecord[] };
  return data.repos;
}

export async function deleteAnalyzedRepo(id: string): Promise<void> {
  await fetch(`/api/github/repos/${id}`, { method: "DELETE" });
}

export async function linkRepoToProject(id: string, projectId: string | null): Promise<GithubRepoRecord> {
  const res = await fetch(`/api/github/repos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
  const data = (await parseJsonOrThrow(res)) as { repo: GithubRepoRecord };
  return data.repo;
}
