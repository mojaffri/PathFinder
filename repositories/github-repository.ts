import { desc, eq } from "drizzle-orm";
import { ensureProfileId } from "@/repositories/profile-repository";
import { withUserContext } from "@/lib/db/with-user-context";
import { githubConnections, githubRepos } from "@/lib/db/schema";
import { decryptToken, encryptToken } from "@/lib/github/token-crypto";
import type { DetectedSignal, GithubConnectionStatus, GithubRepoRecord, RepoAnalysis, RepoLanguageBreakdown } from "@/types";

type GithubRepoRow = typeof githubRepos.$inferSelect;

function toRecord(row: GithubRepoRow): GithubRepoRecord {
  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    fullName: row.fullName,
    htmlUrl: row.htmlUrl,
    description: row.description,
    primaryLanguage: row.primaryLanguage,
    languages: row.languages as RepoLanguageBreakdown[],
    packageManifests: row.packageManifests,
    detectedSignals: row.detectedSignals as DetectedSignal[],
    skillEvidence: row.skillEvidence as GithubRepoRecord["skillEvidence"],
    summary: row.summary,
    metadata: {
      stars: row.stars,
      forks: row.forks,
      openIssues: row.openIssues,
      sizeKb: row.sizeKb,
      pushedAt: row.repoPushedAt ? row.repoPushedAt.toISOString() : null,
      createdAt: row.repoCreatedAt ? row.repoCreatedAt.toISOString() : null,
      defaultBranch: row.defaultBranch,
      isFork: row.isFork,
      isArchived: row.isArchived,
    },
    analyzedAt: row.analyzedAt.toISOString(),
    linkedProjectId: row.linkedProjectId,
  };
}

/**
 * Connects a GitHub identity to the caller's profile — captured from
 * Supabase's own GitHub OAuth provider_token (see `app/auth/callback/
 * route.ts`), never a separate OAuth app. Encrypts the token before it ever
 * touches the database (`encryptToken` returns `null`, silently skipping
 * persistence, if `GITHUB_TOKEN_ENCRYPTION_KEY` isn't configured — the
 * connection then simply isn't remembered, same graceful-degradation
 * convention as everywhere else in this app).
 */
export async function saveGithubConnection(
  userId: string,
  input: { githubUsername: string; githubUserId: string; accessToken: string; scope: string },
): Promise<boolean> {
  const encrypted = encryptToken(input.accessToken);
  if (!encrypted) return false;

  await withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    await tx.delete(githubConnections).where(eq(githubConnections.profileId, profileId));
    await tx.insert(githubConnections).values({
      profileId,
      githubUsername: input.githubUsername,
      githubUserId: input.githubUserId,
      accessTokenEncrypted: encrypted,
      scope: input.scope,
    });
  });
  return true;
}

export async function getGithubConnectionStatus(userId: string): Promise<GithubConnectionStatus> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const [row] = await tx.select().from(githubConnections).where(eq(githubConnections.profileId, profileId)).limit(1);
    if (!row) return { connected: false, username: null, connectedAt: null };
    return { connected: true, username: row.githubUsername, connectedAt: row.connectedAt.toISOString() };
  });
}

/** Internal-only — the decrypted token must never be returned from an API route, only used server-side to make a GitHub API call on the caller's behalf. */
export async function getDecryptedGithubToken(userId: string): Promise<{ token: string; connectionId: string } | null> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const [row] = await tx.select().from(githubConnections).where(eq(githubConnections.profileId, profileId)).limit(1);
    if (!row) return null;
    const token = decryptToken(row.accessTokenEncrypted);
    return token ? { token, connectionId: row.id } : null;
  });
}

export async function disconnectGithub(userId: string): Promise<void> {
  await withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    await tx.delete(githubConnections).where(eq(githubConnections.profileId, profileId));
  });
}

export async function saveRepoAnalysis(userId: string, analysis: RepoAnalysis, connectionId: string | null): Promise<GithubRepoRecord> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);

    const values = {
      profileId,
      connectionId,
      owner: analysis.owner,
      name: analysis.name,
      fullName: analysis.fullName,
      htmlUrl: analysis.htmlUrl,
      description: analysis.description,
      primaryLanguage: analysis.primaryLanguage,
      languages: analysis.languages,
      packageManifests: analysis.packageManifests,
      detectedSignals: analysis.detectedSignals,
      skillEvidence: analysis.skillEvidence,
      summary: analysis.summary,
      stars: analysis.metadata.stars,
      forks: analysis.metadata.forks,
      openIssues: analysis.metadata.openIssues,
      sizeKb: analysis.metadata.sizeKb,
      isFork: analysis.metadata.isFork,
      isArchived: analysis.metadata.isArchived,
      defaultBranch: analysis.metadata.defaultBranch,
      repoPushedAt: analysis.metadata.pushedAt ? new Date(analysis.metadata.pushedAt) : null,
      repoCreatedAt: analysis.metadata.createdAt ? new Date(analysis.metadata.createdAt) : null,
      analyzedAt: new Date(),
    };

    const [existing] = await tx
      .select({ id: githubRepos.id, linkedProjectId: githubRepos.linkedProjectId })
      .from(githubRepos)
      .where(eq(githubRepos.fullName, analysis.fullName));

    if (existing) {
      const [row] = await tx.update(githubRepos).set(values).where(eq(githubRepos.id, existing.id)).returning();
      return toRecord(row);
    }

    const [row] = await tx.insert(githubRepos).values(values).returning();
    return toRecord(row);
  });
}

export async function listRepos(userId: string): Promise<GithubRepoRecord[]> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const rows = await tx.select().from(githubRepos).where(eq(githubRepos.profileId, profileId)).orderBy(desc(githubRepos.analyzedAt));
    return rows.map(toRecord);
  });
}

/** Filters ONLY by `id` — RLS (`github_repos_owner`) enforces ownership, same pattern as other repositories in this app. */
export async function getRepo(userId: string, id: string): Promise<GithubRepoRecord | null> {
  return withUserContext(userId, async (tx) => {
    const [row] = await tx.select().from(githubRepos).where(eq(githubRepos.id, id)).limit(1);
    return row ? toRecord(row) : null;
  });
}

export async function deleteRepo(userId: string, id: string): Promise<void> {
  await withUserContext(userId, async (tx) => {
    await tx.delete(githubRepos).where(eq(githubRepos.id, id));
  });
}

export async function linkRepoToProject(userId: string, repoId: string, projectId: string | null): Promise<GithubRepoRecord | null> {
  return withUserContext(userId, async (tx) => {
    const [row] = await tx.update(githubRepos).set({ linkedProjectId: projectId }).where(eq(githubRepos.id, repoId)).returning();
    return row ? toRecord(row) : null;
  });
}
