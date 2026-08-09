"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatDate } from "@/lib/utils";
import { ROADMAP_CHANGE_TRIGGER_LABELS } from "@/types";
import type { AdaptiveRoadmap, AdaptiveTaskStatus, RoadmapChangeTrigger, StudentProfile } from "@/types";
import { PhaseSection } from "./phase-section";
import { StaleRoadmapBanner } from "./stale-roadmap-banner";

export function AdaptiveRoadmapView({
  roadmap,
  profile,
  onRecompute,
  onTaskStatusChange,
  recomputing,
}: {
  roadmap: AdaptiveRoadmap;
  profile: StudentProfile;
  onRecompute: (trigger: RoadmapChangeTrigger) => Promise<void>;
  onTaskStatusChange: (taskId: string, status: AdaptiveTaskStatus) => Promise<void>;
  recomputing: boolean;
}) {
  const allTasks = roadmap.phases.flatMap((p) => p.tasks);

  return (
    <div className="flex flex-col gap-6">
      <StaleRoadmapBanner roadmap={roadmap} profile={profile} onRecompute={onRecompute} />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>{roadmap.targetCareers.join(", ") || "Your plan"}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {roadmap.targetDate ? `Target date: ${formatDate(roadmap.targetDate)}` : "No target date set"} ·{" "}
              {roadmap.weeklyHoursAvailable ? `${roadmap.weeklyHoursAvailable} hrs/week` : "Weekly hours not set"}
            </p>
          </div>
          <Button size="sm" variant="secondary" disabled={recomputing} onClick={() => onRecompute("manual")}>
            <RefreshCw className={recomputing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Recompute
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Readiness</span>
            <span className="font-medium text-foreground">{roadmap.readiness}%</span>
          </div>
          <ProgressBar value={roadmap.readiness} />
        </CardContent>
      </Card>

      {!roadmap.feasibility.feasible && (
        <Card className="border-danger bg-danger-bg">
          <CardContent className="flex flex-col gap-2 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              <p className="text-sm font-medium text-danger">{roadmap.feasibility.message}</p>
            </div>
            <ul className="flex flex-col gap-1">
              {roadmap.feasibility.recommendations.map((r) => (
                <li key={r} className="text-sm text-danger">
                  • {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {roadmap.savedJobSkillFrequency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>What your saved jobs actually ask for</CardTitle>
            <p className="text-sm text-muted-foreground">
              Personalized — based on your {roadmap.savedJobSkillFrequency[0]?.savedJobCount ?? 0} saved job posting
              {roadmap.savedJobSkillFrequency[0]?.savedJobCount === 1 ? "" : "s"}, not general labor-market stats.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {roadmap.savedJobSkillFrequency.slice(0, 12).map((f) => (
              <Badge key={f.skill} variant="accent">
                {f.skill} — {f.percentage}%
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-8">
        {roadmap.phases.map((phase) => (
          <PhaseSection key={phase.key} phase={phase} allTasks={allTasks} onStatusChange={onTaskStatusChange} />
        ))}
      </div>

      {roadmap.changeEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>What changed</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[...roadmap.changeEvents].reverse().map((event) => (
              <div key={event.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{ROADMAP_CHANGE_TRIGGER_LABELS[event.trigger]}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(event.occurredAt)}</span>
                </div>
                <p className="mt-1 text-sm text-foreground">{event.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {roadmap.completedHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed history</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {[...roadmap.completedHistory].reverse().map((entry) => (
              <div key={entry.skillId} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{entry.title}</span>
                <span className="text-xs text-muted-foreground">
                  {entry.estimatedHours}h · {formatDate(entry.completedAt)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
