"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { calculateExpectedDuration } from "@/lib/roadmap/pacing";
import { TIER_LABELS, type RecommendationTier, type RoadmapPhase, type RoadmapRecommendation } from "@/types";

const TIER_VARIANT: Record<RecommendationTier, BadgeVariant> = {
  "must-do": "danger",
  "high-leverage": "warning",
  "nice-to-have": "neutral",
};

function RecommendationCard({ action, weeklyHoursAvailable }: { action: RoadmapRecommendation; weeklyHoursAvailable: number | null }) {
  const duration = calculateExpectedDuration(action.estimatedHours, weeklyHoursAvailable);
  return (
    <div className="rounded-md bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{action.title}</p>
        <Badge variant={TIER_VARIANT[action.tier]}>{TIER_LABELS[action.tier]}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>Estimated time: {duration.label}</span>
        {action.prerequisite && <span>Requires {action.prerequisite}</span>}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{action.whyItMatters}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Evidence of completion: </span>
        {action.evidenceOfCompletion}
      </p>
    </div>
  );
}

export function PhaseCard({
  phase,
  weeklyHoursAvailable,
  defaultOpen,
}: {
  phase: RoadmapPhase;
  weeklyHoursAvailable: number | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 p-6 text-left"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{phase.timeline}</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{phase.title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{phase.objective}</p>
        </div>
        <ChevronDown className={cn("mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <CardContent className="flex flex-col gap-6 border-t border-border pt-6">
          <div className="rounded-md border border-border bg-accent/40 p-3 text-sm text-foreground">
            <span className="font-medium">Why this matters for this target: </span>
            {phase.whyItMattersForTarget}
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Milestones
            </p>
            <div className="flex flex-col gap-3">
              {phase.milestones.map((milestone) => {
                const duration = calculateExpectedDuration(milestone.estimatedHours, weeklyHoursAvailable);
                return (
                  <div key={milestone.id} className="rounded-md bg-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{milestone.title}</p>
                      <span className="text-xs text-muted-foreground">Estimated time: {duration.label}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{milestone.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Evidence: </span>
                      {milestone.evidenceOfCompletion}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recommended actions
            </p>
            <div className="flex flex-col gap-3">
              {phase.recommendedActions.map((action) => (
                <RecommendationCard key={action.id} action={action} weeklyHoursAvailable={weeklyHoursAvailable} />
              ))}
            </div>
          </div>

          {phase.resources.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resources
              </p>
              <div className="flex flex-wrap gap-2">
                {phase.resources.map((resource) => (
                  <Badge key={resource}>{resource}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
