"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { JOB_GROWTH_LABELS, type CareerMatch } from "@/types";
import { cn } from "@/lib/utils";
import { CareerFitPanel } from "@/components/discovery/career-fit-panel";

const CONFIDENCE_VARIANT: Record<CareerMatch["confidence"], BadgeVariant> = {
  high: "success",
  medium: "accent",
  low: "neutral",
};

export function CareerMatchCard({ match, rank }: { match: CareerMatch; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const { career } = match;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>#{rank}</span>
            <Badge variant={CONFIDENCE_VARIANT[match.confidence]}>{match.confidence} confidence</Badge>
          </div>
          <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
            {career.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{career.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold text-primary">{match.matchPercentage}%</p>
          <p className="text-xs text-muted-foreground">match</p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {match.strengths.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {match.strengths.map((s) => (
              <Badge key={s} variant="accent">
                {s}
              </Badge>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Why this matched
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {match.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 rounded-md bg-surface p-4 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Salary range: </span>
            {career.salaryRange}
          </p>
          <p>
            <span className="text-muted-foreground">Job growth: </span>
            {JOB_GROWTH_LABELS[career.jobGrowth]}
          </p>
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Degree track: </span>
            {career.degreeRequirements}
          </p>
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Common majors: </span>
            {career.commonMajors.join(", ")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          {expanded ? "Hide details" : "Show competitiveness & reality check"}
        </button>

        {expanded && (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Competitiveness
              </p>
              <p className="mt-1 text-sm text-foreground">{career.competitiveness}</p>
            </div>
            <div className="rounded-md border border-warning bg-warning-bg p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                Reality check
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">{career.realityCheck}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                High-value skills
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {career.highValueSkills.map((skill) => (
                  <Badge key={skill}>{skill}</Badge>
                ))}
              </div>
            </div>
            <CareerFitPanel career={career} />
          </div>
        )}

        <Link href={`/accelerate?career=${encodeURIComponent(career.title)}`} className="self-start">
          <Button variant="secondary">Build My Acceleration Guide</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
