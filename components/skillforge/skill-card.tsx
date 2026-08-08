import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MasteryBadge } from "@/components/skillforge/mastery-badge";
import { MasteryDimensions } from "@/components/skillforge/mastery-dimensions";
import { calculateExpectedDuration } from "@/lib/roadmap/pacing";
import type { GapPriority, SkillModule, SkillProgress } from "@/types";

const PRIORITY_VARIANT: Record<GapPriority, "danger" | "warning" | "accent" | "neutral"> = {
  critical: "danger",
  high: "warning",
  medium: "accent",
  low: "neutral",
};

export function SkillCard({
  module,
  progress,
  weeklyHoursAvailable,
}: {
  module: SkillModule;
  progress: SkillProgress;
  weeklyHoursAvailable: number | null;
}) {
  const duration = calculateExpectedDuration(module.estimatedHours, weeklyHoursAvailable);

  return (
    <Link href={`/skillforge/skills/${module.id}`}>
      <Card className="h-full transition-colors hover:border-border-strong">
        <CardHeader className="flex-row items-start justify-between space-y-0 gap-2">
          <CardTitle className="text-base">{module.name}</CardTitle>
          <Badge variant={PRIORITY_VARIANT[module.priority]}>{module.priority}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{module.description}</p>
          <div className="flex items-center justify-between">
            <MasteryBadge level={progress.mastery.level} />
            <span className="text-xs text-muted-foreground">Estimated: {duration.label}</span>
          </div>
          <MasteryDimensions mastery={progress.mastery} />
        </CardContent>
      </Card>
    </Link>
  );
}
