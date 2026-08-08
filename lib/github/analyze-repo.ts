import { fetchFileContent, fetchLanguages, fetchRepo, fetchTree } from "./client";
import { runAllDetectors } from "./detectors";
import { MANIFEST_FILE_NAMES, extractManifestDependencies } from "./manifest-parse";
import { mapRepoSignalsToSkills } from "./map-to-skills";
import { generateRepoNarrative } from "./narrative";
import type { RepoAnalysis, RepoLanguageBreakdown } from "@/types";

const MAX_MANIFESTS_TO_FETCH = 4;

function computeLanguageBreakdown(languages: Record<string, number>): RepoLanguageBreakdown[] {
  const total = Object.values(languages).reduce((sum, n) => sum + n, 0);
  if (total === 0) return [];
  return Object.entries(languages)
    .map(([language, bytes]) => ({ language, bytes, percentage: Math.round((bytes / total) * 100) }))
    .sort((a, b) => b.bytes - a.bytes);
}

/**
 * The full deterministic-signal pipeline for one repository: metadata →
 * languages → file tree → known manifest contents → detectors → skill
 * mapping → (optional AI) narrative. Every network call that isn't the
 * initial repo lookup degrades to an empty result on failure rather than
 * aborting the whole analysis — a repo with no README, an empty tree
 * (freshly created repo), or a manifest that 404s mid-fetch should still
 * produce a real (if sparser) analysis, not an error.
 */
export async function analyzeRepository(owner: string, repo: string, accessToken?: string | null): Promise<RepoAnalysis> {
  const repoData = await fetchRepo(owner, repo, accessToken);

  const [languagesRaw, treeResult] = await Promise.all([
    fetchLanguages(owner, repo, accessToken).catch(() => ({}) as Record<string, number>),
    fetchTree(owner, repo, repoData.default_branch, accessToken).catch(() => ({ tree: [], truncated: false })),
  ]);

  const paths = treeResult.tree.filter((entry) => entry.type === "blob").map((entry) => entry.path);
  const languages = computeLanguageBreakdown(languagesRaw);

  const manifestPaths = paths.filter((path) => MANIFEST_FILE_NAMES.some((name) => path === name || path.endsWith(`/${name}`)));
  const manifestsToFetch = manifestPaths.slice(0, MAX_MANIFESTS_TO_FETCH);
  const manifestContents = await Promise.all(
    manifestsToFetch.map((path) => fetchFileContent(owner, repo, path, accessToken).catch(() => null)),
  );

  const manifestDeps = manifestsToFetch.flatMap((path, i) => {
    const content = manifestContents[i];
    return content ? extractManifestDependencies(path, content) : [];
  });

  const detectedSignals = runAllDetectors(paths, manifestDeps);
  const skillEvidence = mapRepoSignalsToSkills({ languages, detectedSignals, manifestDeps });

  const summary = await generateRepoNarrative({
    repoName: repoData.name,
    description: repoData.description,
    skillSignals: skillEvidence,
    detectedSignals,
  });

  return {
    owner: repoData.owner.login,
    name: repoData.name,
    fullName: repoData.full_name,
    htmlUrl: repoData.html_url,
    description: repoData.description,
    primaryLanguage: repoData.language,
    languages,
    packageManifests: manifestPaths,
    detectedSignals,
    metadata: {
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      sizeKb: repoData.size,
      pushedAt: repoData.pushed_at,
      createdAt: repoData.created_at,
      defaultBranch: repoData.default_branch,
      isFork: repoData.fork,
      isArchived: repoData.archived,
    },
    skillEvidence,
    summary,
    analyzedAt: new Date().toISOString(),
  };
}
