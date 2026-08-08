"use client";

import { useProfile } from "@/hooks/use-profile";
import { computeCareerFitBreakdown } from "@/lib/matching/career-fit";
import type { Career } from "@/types";

/**
 * The recruiter-visible "why this score" breakdown against the student's
 * actual confirmed profile (skills/experience/education/projects) —
 * distinct from the questionnaire-preference reasons already shown above it
 * in `CareerMatchCard`. Only renders once a profile exists; Discover itself
 * works fully without one (see `lib/matching/engine.ts`'s header comment).
 */
export function CareerFitPanel({ career }: { career: Career }) {
  const { profile } = useProfile();
  if (!profile) return null;

  const breakdown = computeCareerFitBreakdown(profile, career);

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Profile fit breakdown
        </p>
        <p className="text-sm font-semibold text-foreground">{breakdown.overallScore}%</p>
      </div>
      <p className="text-sm text-muted-foreground">{breakdown.explanation}</p>

      <div className="flex flex-col gap-2">
        {breakdown.components.map((c) => (
          <div key={c.key} className="flex items-center gap-3 text-xs">
            <span className="w-40 shrink-0 text-muted-foreground">{c.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${c.score}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right font-medium text-foreground">{c.score}%</span>
          </div>
        ))}
      </div>

      {breakdown.strengths.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strengths</p>
          <ul className="mt-1 flex flex-col gap-1">
            {breakdown.strengths.map((s) => (
              <li key={s} className="text-sm text-foreground">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {breakdown.gaps.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gaps</p>
          <ul className="mt-1 flex flex-col gap-1">
            {breakdown.gaps.map((g) => (
              <li key={g} className="text-sm text-foreground">• {g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
