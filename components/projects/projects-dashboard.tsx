"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FolderGit2, Plus } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { GithubImportPanel } from "@/components/github/github-import-panel";
import { RepoSignalBadges } from "@/components/github/repo-signal-badges";
import { SkillConfidenceList } from "@/components/evidence/skill-confidence-list";
import { deleteAnalyzedRepo, linkRepoToProject, listAnalyzedRepos } from "@/services/github-service";
import { createEmptyProjectRecord } from "@/types";
import type { GithubRepoRecord } from "@/types";

export function ProjectsDashboard() {
  const { profile, isAuthenticated, isLoading: profileLoading, updateProfile } = useProfile();
  const [repos, setRepos] = useState<GithubRepoRecord[] | null>(null);

  function refreshRepos() {
    listAnalyzedRepos().then(setRepos);
  }

  useEffect(() => {
    if (isAuthenticated) refreshRepos();
  }, [isAuthenticated]);

  async function addRepoAsProject(repo: GithubRepoRecord) {
    if (!profile) return;
    const project = {
      ...createEmptyProjectRecord(),
      title: repo.name,
      technologies: repo.skillEvidence.map((s) => s.skill).slice(0, 8),
      summary: repo.description ?? repo.summary,
      githubUrl: repo.htmlUrl,
    };
    await updateProfile({ projects: [...profile.projects, project] });
    await linkRepoToProject(repo.id, project.id);
    refreshRepos();
  }

  if (profileLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to analyze your projects</CardTitle>
            <CardDescription>Your projects, GitHub analyses, and skill evidence are tied to your account.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href="/login?redirectTo=/projects">
              <Button>Sign in</Button>
            </Link>
            <Link href="/signup?redirectTo=/projects">
              <Button variant="secondary">Create an account</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const linkedRepoUrls = new Set(profile.projects.map((p) => p.githubUrl).filter(Boolean));
  const unlinkedRepos = (repos ?? []).filter((r) => !linkedRepoUrls.has(r.htmlUrl));

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects &amp; evidence</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Objective, deterministic signals from your projects and GitHub repositories — not self-reported skill tags.
        </p>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your projects</h2>
        {profile.projects.length === 0 ? (
          <EmptyState icon={FolderGit2} title="No projects yet" description="Add one below, or analyze a GitHub repository to create one automatically." />
        ) : (
          <div className="flex flex-col gap-3">
            {profile.projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="transition-colors hover:bg-surface">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{project.title}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {project.technologies.slice(0, 5).join(", ") || "No technologies listed"}
                        {project.githubUrl ? " · Linked to a GitHub analysis" : ""}
                      </p>
                    </div>
                    {project.githubUrl && <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mb-10">
        <GithubImportPanel onImported={refreshRepos} />
      </div>

      {unlinkedRepos.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Analyzed repositories</h2>
          <div className="flex flex-col gap-3">
            {unlinkedRepos.map((repo) => (
              <Card key={repo.id}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
                        {repo.fullName}
                      </a>
                      {repo.description && <p className="mt-0.5 text-sm text-muted-foreground">{repo.description}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="secondary" onClick={() => addRepoAsProject(repo)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add as project
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await deleteAnalyzedRepo(repo.id);
                          refreshRepos();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{repo.summary}</p>
                  <RepoSignalBadges signals={repo.detectedSignals} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Skill confidence</h2>
        <SkillConfidenceList />
      </div>
    </div>
  );
}
