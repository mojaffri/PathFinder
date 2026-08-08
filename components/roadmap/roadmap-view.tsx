import { AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhaseCard } from "@/components/roadmap/phase-card";
import { TopMoves } from "@/components/roadmap/top-moves";
import { GapAnalysisSection } from "@/components/roadmap/gap-analysis-section";
import { AIAdvantageSection } from "@/components/roadmap/ai-advantage-section";
import { TargetResumeSection } from "@/components/roadmap/target-resume-section";
import type { Roadmap } from "@/types";

function ListCard({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function RoadmapView({
  roadmap,
  actions,
  demonstratedGapIds,
}: {
  roadmap: Roadmap;
  actions?: React.ReactNode;
  demonstratedGapIds?: Set<string>;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Roadmap: {roadmap.targetCareers.join(", ")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {roadmap.executiveSummary}
          </p>
        </div>
        {actions}
      </div>

      {roadmap.source === "fallback" && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-surface p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Generated from our built-in gap-analysis engine rather than AI, and still a complete, data-grounded roadmap.
        </div>
      )}

      <TopMoves moves={roadmap.topMoves} weeklyHoursAvailable={roadmap.weeklyHoursAvailable} />

      <div className="rounded-md border border-warning bg-warning-bg p-4">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wide">Reality check</p>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground">{roadmap.realityCheck}</p>
      </div>

      <GapAnalysisSection gapAnalysis={roadmap.gapAnalysis} demonstratedGapIds={demonstratedGapIds} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where you stand</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">{roadmap.currentProfileAssessment}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <ListCard title="Competitive advantages" items={roadmap.competitiveAdvantages} />
        <ListCard title="Mistakes to avoid" items={roadmap.mistakesToAvoid} />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Your roadmap</h2>
        {roadmap.phases.map((phase, i) => (
          <PhaseCard
            key={phase.key}
            phase={phase}
            weeklyHoursAvailable={roadmap.weeklyHoursAvailable}
            defaultOpen={i === 0}
          />
        ))}
      </div>

      {roadmap.certificationGuidance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Certification guidance</CardTitle>
            <p className="text-sm text-muted-foreground">
              Honest guidance. We don&apos;t recommend certifications just because they sound impressive.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {roadmap.certificationGuidance.map((cert) => (
              <div key={cert.name} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{cert.name}</p>
                  <Badge variant={cert.recommend ? "success" : "neutral"}>
                    {cert.recommend ? "Worth considering" : "Usually not worth it"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{cert.reasoning}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AIAdvantageSection advantage={roadmap.aiAdvantage} />

      <TargetResumeSection benchmark={roadmap.targetResumeBenchmark} />

      <div className="grid gap-4 sm:grid-cols-2">
        <ListCard title="Portfolio ideas" items={roadmap.portfolioIdeas} />
        <ListCard title="Interview preparation" items={roadmap.interviewPreparation} />
        <ListCard title="Recommended tools" items={roadmap.recommendedTools} />
        <ListCard title="Recommended resources" items={roadmap.recommendedResources} />
      </div>
    </div>
  );
}
