"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { RepoSignalBadges } from "@/components/github/repo-signal-badges";
import { listAnalyzedRepos } from "@/services/github-service";
import { CAREERS } from "@/data/careers";
import { resolveCareers } from "@/types";
import { fuzzyIncludes } from "@/lib/matching/evidence";
import type { GithubRepoRecord } from "@/types";

/** Which of the student's own target careers this project's skills are most relevant to — a lightweight, deterministic overlap check against `Career.highValueSkills`, not a second scoring engine. */
function relevantTargetRoles(skills: string[], targetCareerTitles: string[]): string[] {
  const resolved = resolveCareers(CAREERS, targetCareerTitles).filter((rc) => rc.career !== null);
  return resolved
    .map((rc) => ({ title: rc.title, overlap: rc.career!.highValueSkills.filter((s) => fuzzyIncludes(skills, s)).length }))
    .filter((r) => r.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .map((r) => r.title);
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const { profile, isAuthenticated, isLoading: profileLoading } = useProfile();
  const [repos, setRepos] = useState<GithubRepoRecord[] | null>(null);

  useEffect(() => {
    if (isAuthenticated) listAnalyzedRepos().then(setRepos);
  }, [isAuthenticated]);

  if (profileLoading || (isAuthenticated && repos === null)) {
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
            <CardTitle>Sign in to view this project</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/login?redirectTo=/projects">
              <Button>Sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = profile.projects.find((p) => p.id === projectId);
  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <EmptyState icon={ArrowLeft} title="Project not found" description="It may have been removed." action={<Link href="/projects"><Button variant="secondary">Back to projects</Button></Link>} />
      </div>
    );
  }

  const repo = project.githubUrl ? (repos ?? []).find((r) => r.htmlUrl === project.githubUrl) : undefined;
  const associatedSkills = [...new Set([...project.technologies, ...(repo?.skillEvidence.map((s) => s.skill) ?? [])])];
  const roles = relevantTargetRoles(associatedSkills, profile.targetCareers);
  const missingSignals = repo?.detectedSignals.filter((s) => !s.detected) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/projects" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{project.title}</h1>
          {project.summary && <p className="mt-1.5 text-sm text-muted-foreground">{project.summary}</p>}
        </div>
        <Link href="/profile">
          <Button variant="secondary" size="sm">Edit in profile</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        {project.githubUrl && (
          <a href={project.githubUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline">
            {project.githubUrl}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Stack</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {associatedSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No technologies listed yet.</p>
            ) : (
              associatedSkills.map((s) => <Badge key={s}>{s}</Badge>)
            )}
          </CardContent>
        </Card>

        {repo ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Recruiter-style summary</CardTitle>
                <CardDescription>Generated from this repository&apos;s objectively detected signals — never from stars, forks, or commit count.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">{repo.summary}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detected engineering signals</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <RepoSignalBadges signals={repo.detectedSignals} />
                {missingSignals.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Currently shows little evidence of {missingSignals.map((s) => s.label.toLowerCase()).join(", ")}.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skill evidence</CardTitle>
                <CardDescription>Each skill&apos;s strength, as detected from this repository.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {repo.skillEvidence.map((s) => (
                  <div key={s.skill} className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{s.skill}</p>
                      <p className="text-muted-foreground">{s.reason}</p>
                    </div>
                    <Badge variant={s.strength === "strong" ? "success" : s.strength === "moderate" ? "warning" : "neutral"} className="shrink-0 capitalize">
                      {s.strength}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : (
          <EmptyState
            icon={ExternalLink}
            title="No GitHub analysis linked"
            description="Link this project to a GitHub repository from the Projects page to see detected engineering signals and skill evidence."
          />
        )}

        {roles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Relevant target roles</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <Badge key={r} variant="accent">
                  {r}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
