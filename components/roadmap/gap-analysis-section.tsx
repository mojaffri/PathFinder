import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GapAnalysis, GapCategory, GapPriority } from "@/types";

const PRIORITY_VARIANT: Record<GapPriority, BadgeVariant> = {
  critical: "danger",
  high: "warning",
  medium: "accent",
  low: "neutral",
};

const CATEGORY_LABELS: Record<GapCategory, string> = {
  academic: "Academic",
  technical: "Technical",
  experience: "Experience",
  professional: "Professional",
};

function formatCareerList(titles: string[]): string {
  if (titles.length <= 1) return titles[0] ?? "";
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

export function GapAnalysisSection({
  gapAnalysis,
  demonstratedGapIds,
}: {
  gapAnalysis: GapAnalysis;
  /** Gap ids the student has demonstrated Proficient+ mastery for via SkillForge (see `getDemonstratedGapIds`). Optional so every existing caller keeps working unchanged. */
  demonstratedGapIds?: Set<string>;
}) {
  const categories: GapCategory[] = ["academic", "technical", "experience", "professional"];
  const isVersatile = gapAnalysis.targetCareers.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gap analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Where you stand today vs. what {formatCareerList(gapAnalysis.targetCareers)} actually reward
          {isVersatile ? "" : "s"}.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Current profile
          </p>
          <ul className="flex flex-col gap-1">
            {gapAnalysis.currentStateSummary.map((line) => (
              <li key={line} className="text-sm text-foreground">
                {line}
              </li>
            ))}
          </ul>
        </div>

        {categories.map((category) => {
          const gaps = gapAnalysis.gaps.filter((g) => g.category === category);
          if (gaps.length === 0) return null;
          return (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[category]}
              </p>
              <div className="flex flex-col gap-2">
                {gaps.map((gap) => (
                  <div key={gap.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{gap.title}</p>
                      <div className="flex items-center gap-2">
                        {demonstratedGapIds?.has(gap.id) && <Badge variant="success">Demonstrated ✓</Badge>}
                        {isVersatile && gap.relevantCareers.length > 1 && (
                          <Badge variant="success">Helps {gap.relevantCareers.length} careers</Badge>
                        )}
                        {gap.timeHorizon === "long-term" && <Badge variant="neutral">Tracked for later</Badge>}
                        <Badge variant={PRIORITY_VARIANT[gap.priority]}>{gap.priority}</Badge>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{gap.description}</p>
                    {isVersatile && gap.relevantCareers.length > 0 && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Relevant to: {gap.relevantCareers.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
