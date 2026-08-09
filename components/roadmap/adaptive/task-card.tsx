"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ExternalLink, SkipForward } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { AdaptiveTask, AdaptiveTaskStatus, GapPriority } from "@/types";

const PRIORITY_VARIANT: Record<GapPriority, BadgeVariant> = {
  critical: "danger",
  high: "warning",
  medium: "accent",
  low: "neutral",
};

const STATUS_LABEL: Record<AdaptiveTaskStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  completed: "Completed",
  skipped: "Skipped",
};

export function TaskCard({
  task,
  allTasks,
  onStatusChange,
}: {
  task: AdaptiveTask;
  /** Every task in the roadmap (across all phases) — used to resolve and display prerequisite titles/status. */
  allTasks: AdaptiveTask[];
  onStatusChange: (taskId: string, status: AdaptiveTaskStatus) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const prerequisites = task.prerequisiteTaskIds.map((id) => allTasks.find((t) => t.id === id)).filter((t): t is AdaptiveTask => t !== undefined);
  const isDone = task.status === "completed" || task.status === "skipped";

  async function handleStatusChange(status: AdaptiveTaskStatus) {
    setBusy(true);
    try {
      await onStatusChange(task.id, status);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={isDone ? "opacity-70" : undefined}>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">{task.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{task.skillName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{STATUS_LABEL[task.status]}</Badge>
            <Badge variant={PRIORITY_VARIANT[task.priorityTier]}>{task.priorityTier}</Badge>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{task.reason}</p>

        {prerequisites.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {prerequisites.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground"
              >
                {p.status === "completed" ? <CheckCircle2 className="h-3 w-3 text-success" /> : <Circle className="h-3 w-3" />}
                {p.skillName}
              </span>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completion criteria</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {task.completionCriteria.map((c) => (
                <li key={c} className="text-xs text-foreground">
                  • {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <p>Estimated: {task.estimatedHours} hours</p>
            {task.scheduledStartDate && task.scheduledTargetDate && (
              <p>
                Scheduled: {formatDate(task.scheduledStartDate)} – {formatDate(task.scheduledTargetDate)}
              </p>
            )}
            {task.evidenceGoal && <p>Evidence goal: {task.evidenceGoal}</p>}
            {task.sourceGapTitle && <p>From your gap: {task.sourceGapTitle}</p>}
            {task.sourceJobRequirementLabels.length > 0 && (
              <p>From your saved jobs: {task.sourceJobRequirementLabels.join(", ")}</p>
            )}
            {task.learningResource && (
              <a
                href={task.learningResource.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {task.learningResource.title} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {task.status === "not-started" || task.status === "in-progress" ? (
          <div className="flex gap-2 pt-1">
            {task.status === "not-started" && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => handleStatusChange("in-progress")}>
                Start
              </Button>
            )}
            <Button size="sm" disabled={busy} onClick={() => handleStatusChange("completed")}>
              <CheckCircle2 className="h-4 w-4" /> Mark complete
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => handleStatusChange("skipped")}>
              <SkipForward className="h-4 w-4" /> Skip
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => handleStatusChange("not-started")} className="self-start">
            Undo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
