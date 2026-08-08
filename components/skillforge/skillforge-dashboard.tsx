"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Compass, MessageSquare, Rocket, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Spinner } from "@/components/ui/spinner";
import { SkillCard } from "@/components/skillforge/skill-card";
import { useProfile } from "@/hooks/use-profile";
import { getRoadmaps } from "@/services/roadmap-service";
import { getSkillProgress } from "@/services/skillforge-service";
import { getAllSkillModules, getSkillModulesForCareers } from "@/lib/skillforge/catalog";
import { checkReadiness } from "@/lib/skillforge/readiness";
import { computeNextBestAction } from "@/lib/skillforge/next-action";
import { getDemonstratedGapIds } from "@/lib/skillforge/roadmap-connection";
import {
  getHighestPrioritySkill,
  getInterviewReadiness,
  getOverallReadiness,
  getSkillsInProgress,
  getTopWeeklyMoves,
  type SkillWithProgress,
} from "@/lib/skillforge/dashboard";
import type { SavedRoadmap } from "@/types";

export function SkillForgeDashboard() {
  const { profile, isAuthenticated, isLoading } = useProfile();
  const [roadmap, setRoadmap] = useState<SavedRoadmap | null>(null);
  const [items, setItems] = useState<SkillWithProgress[]>([]);

  useEffect(() => {
    if (!profile) return;
    // Reading localStorage-backed roadmap/progress during render would mismatch
    // SSR output, so this reads once the profile is available on the client —
    // same pattern as components/dashboard/dashboard-view.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoadmap(getRoadmaps(profile.id)[0] ?? null);

    const modules = getSkillModulesForCareers(profile.targetCareers);
    setItems(modules.map((module) => ({ module, progress: getSkillProgress(profile.id, module.id) })));
  }, [profile]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!profile || !isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create a profile to open SkillForge</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          SkillForge builds on your roadmap and target career, so it needs a profile first.
        </p>
        <Link href="/profile" className="mt-6 inline-block">
          <Button>Get started</Button>
        </Link>
      </div>
    );
  }

  if (profile.targetCareers.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <EmptyState
          icon={Compass}
          title="Set a target career first"
          description="SkillForge turns your roadmap's gaps into concrete skills to build, practice, and prove — it needs a target career to know what matters."
          action={
            <Link href="/accelerate">
              <Button>Go to Accelerate</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return <DashboardBody profile={profile} roadmap={roadmap} items={items} />;
}

function DashboardBody({
  profile,
  roadmap,
  items,
}: {
  profile: NonNullable<ReturnType<typeof useProfile>["profile"]>;
  roadmap: SavedRoadmap | null;
  items: SkillWithProgress[];
}) {
  const weeklyHoursAvailable = profile.weeklyHoursAvailable;
  const allModules = useMemo(() => getAllSkillModules(), []);
  const highestPriority = useMemo(() => getHighestPrioritySkill(items), [items]);
  const inProgress = useMemo(() => getSkillsInProgress(items), [items]);
  const topMoves = useMemo(() => getTopWeeklyMoves(items, weeklyHoursAvailable), [items, weeklyHoursAvailable]);
  const overallReadiness = useMemo(() => getOverallReadiness(items), [items]);
  const interviewReadiness = useMemo(() => getInterviewReadiness(items), [items]);
  const demonstratedGapIds = useMemo(
    () => (roadmap ? getDemonstratedGapIds(roadmap.roadmap.gapAnalysis, items) : new Set<string>()),
    [roadmap, items],
  );
  const totalGaps = roadmap?.roadmap.gapAnalysis.gaps.length ?? 0;
  const highestPriorityNextAction = useMemo(() => {
    if (!highestPriority) return null;
    const readiness = checkReadiness(highestPriority.module, allModules, (id) => getSkillProgress(profile.id, id));
    return computeNextBestAction(highestPriority.module, highestPriority.progress, readiness, allModules);
  }, [highestPriority, allModules, profile.id]);
  const currentPhase = roadmap?.roadmap.phases[0] ?? null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <EmptyState
          icon={Rocket}
          title="No SkillForge modules for this target yet"
          description="We're still expanding module coverage for every career in the taxonomy. Check back soon, or explore your full roadmap in the meantime."
          action={
            <Link href="/saved">
              <Button variant="secondary">View your roadmap</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">SkillForge</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Find out what you can actually do, close the gaps that matter, and prove it — not a course to sit through.
          </p>
        </div>
        <Link href="/saved">
          <Button variant="secondary">View full roadmap</Button>
        </Link>
      </div>

      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Target career
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-foreground">{profile.targetCareers.join(", ")}</p>
            </div>
            <div className="min-w-[220px] flex-1 sm:flex-initial sm:min-w-[260px]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Overall readiness</span>
                <span className="text-muted-foreground">{overallReadiness.averageScore}%</span>
              </div>
              <ProgressBar value={overallReadiness.averageScore} className="mt-1.5" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {overallReadiness.demonstratedCount.count} of {overallReadiness.demonstratedCount.total} skills demonstrated
                (Proficient or higher)
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={Rocket}
              label="Current roadmap phase"
              value={currentPhase ? currentPhase.title : "Generate a roadmap to see this"}
            />
            <StatCard
              icon={CheckCircle2}
              label="Roadmap gaps demonstrated"
              value={roadmap ? `${demonstratedGapIds.size} of ${totalGaps} gaps` : "No roadmap yet"}
            />
            <StatCard
              icon={MessageSquare}
              label="Interview readiness"
              value={`${interviewReadiness.count} of ${interviewReadiness.total} skills`}
            />
          </div>
        </CardContent>
      </Card>

      {highestPriority && (
        <Card className="mt-6 border-primary/30 bg-accent/30">
          <CardHeader>
            <CardTitle className="text-base">Your biggest gap right now</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-foreground">{highestPriority.module.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{highestPriority.module.description}</p>
            {highestPriorityNextAction && (
              <div className="mt-3 rounded-md bg-background/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next best action</p>
                <p className="mt-1 text-sm font-medium text-foreground">{highestPriorityNextAction.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{highestPriorityNextAction.description}</p>
              </div>
            )}
            <Link href={`/skillforge/skills/${highestPriority.module.id}`} className="mt-3 inline-block">
              <Button>Start working on this</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {topMoves.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">This week&apos;s top {topMoves.length} moves</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-4">
              {topMoves.map((move, index) => (
                <li key={move.module.id} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/skillforge/skills/${move.module.id}`} className="text-sm font-medium text-foreground hover:underline">
                        {move.module.name}
                      </Link>
                      <Badge variant="neutral">{move.duration.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{move.module.whyItMatters}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {inProgress.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Skills in progress</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map(({ module, progress }) => (
              <SkillCard key={module.id} module={module} progress={progress} weeklyHoursAvailable={weeklyHoursAvailable} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">All matched skills</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {weeklyHoursAvailable
            ? `Sized to your ${weeklyHoursAvailable} hour${weeklyHoursAvailable === 1 ? "" : "s"}/week availability.`
            : "Set your weekly hours available in your profile for accurate time estimates."}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ module, progress }) => (
            <SkillCard key={module.id} module={module} progress={progress} weeklyHoursAvailable={weeklyHoursAvailable} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground" title={value}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
