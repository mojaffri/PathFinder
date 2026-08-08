import { ArrowRight, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TargetResumeBenchmark } from "@/types";

export function TargetResumeSection({ benchmark }: { benchmark: TargetResumeBenchmark }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your target resume</CardTitle>
        <p className="text-sm text-muted-foreground">
          What your resume could look like once you complete this roadmap, not what you have today.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-semibold">Area</th>
                <th className="py-2 pr-4 font-semibold">Current</th>
                <th className="py-2 font-semibold">Target</th>
              </tr>
            </thead>
            <tbody>
              {benchmark.comparisons.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-foreground">{row.label}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.current}</td>
                  <td className="py-2.5 text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                      {row.target}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{benchmark.targetExperience.roleTitle}</p>
            <Badge variant="accent">Target</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {benchmark.targetExperience.organizationPlaceholder} · {benchmark.targetExperience.timeframePlaceholder}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {benchmark.targetExperience.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        {benchmark.targetProjects.map((project) => (
          <div key={project.title} className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{project.title}</p>
              <Badge variant="accent">Target</Badge>
            </div>
            {project.tools.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {project.tools.map((tool) => (
                  <Badge key={tool}>{tool}</Badge>
                ))}
              </div>
            )}
            <ul className="mt-2 flex flex-col gap-1">
              {project.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="flex items-start gap-2 rounded-md border border-border bg-surface p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {benchmark.instructions}
        </div>
      </CardContent>
    </Card>
  );
}
