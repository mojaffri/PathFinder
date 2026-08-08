import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { EvidenceRefType, JobFitAnalysis, RequirementMatchStatus } from "@/types";

/** Only a `project`/`education` ref currently resolves to a page in this app — everything else (experience, GitHub repos not linked to a project, SkillForge assessments) still shows its label and explanation, just not as a link yet. */
function evidenceHref(refType: EvidenceRefType, refId: string | null): string | null {
  if (!refId) return null;
  if (refType === "project") return `/projects/${refId}`;
  return null;
}

const STATUS_VARIANT: Record<RequirementMatchStatus, BadgeVariant> = {
  strong: "success",
  partial: "warning",
  missing: "danger",
};

const STATUS_LABEL: Record<RequirementMatchStatus, string> = {
  strong: "Strong",
  partial: "Partial",
  missing: "Missing",
};

const PRIORITY_VARIANT: Record<"high" | "medium" | "low", BadgeVariant> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

/** The requirement-by-requirement match matrix + component scores + prioritized recommendations — the recruiter-visible core of the job-fit workflow. Deliberately shows the raw numbers/statuses rather than burying them in AI prose. */
export function JobFitResults({ analysis }: { analysis: JobFitAnalysis }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Overall fit</CardTitle>
            <CardDescription>Deterministic — computed from your profile, never AI-generated.</CardDescription>
          </div>
          <p className="text-3xl font-semibold text-primary">{analysis.overallFitScore}%</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {analysis.componentScores.map((c) => (
            <div key={c.key} className="flex items-center gap-3 text-xs">
              <span className="w-56 shrink-0 text-muted-foreground">{c.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-primary" style={{ width: `${c.score}%` }} />
              </div>
              <span className="w-9 shrink-0 text-right font-medium text-foreground">{c.score}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requirement match</CardTitle>
          <CardDescription>Every requirement, its match status, and the evidence behind it.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {analysis.requirementMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requirements to match against.</p>
          ) : (
            analysis.requirementMatches.map((m) => (
              <div key={m.requirementId} className="flex flex-col gap-1.5 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{m.label}</p>
                    <Badge variant="neutral">{m.category}</Badge>
                  </div>
                  <Badge variant={STATUS_VARIANT[m.status]}>{STATUS_LABEL[m.status]}</Badge>
                </div>
                {m.evidence.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {m.evidence.map((e) => {
                      const href = evidenceHref(e.sourceRefType, e.sourceRefId);
                      return (
                        <li key={e.id} className="text-sm text-muted-foreground">
                          {href ? (
                            <Link href={href} className="font-medium text-primary hover:underline">
                              {e.sourceLabel}
                            </Link>
                          ) : (
                            <span className="font-medium text-foreground">{e.sourceLabel}</span>
                          )}{" "}
                          <span className="capitalize">({e.evidenceStrength})</span> — {e.explanation}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {m.gapExplanation && <p className="text-sm text-muted-foreground">{m.gapExplanation}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {analysis.topRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Highest-leverage improvements</CardTitle>
            <CardDescription>Ranked by required-vs-preferred and current evidence strength.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {analysis.topRecommendations.map((r, i) => (
              <div key={`${r.requirementId ?? "rec"}-${i}`} className="flex items-start gap-3">
                <Badge variant={PRIORITY_VARIANT[r.priority]}>{r.priority}</Badge>
                <div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.rationale}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
