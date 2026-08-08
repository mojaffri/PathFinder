import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { SKILL_CONFIDENCE_LEVELS } from "@/types";
import type { SkillConfidenceLevel } from "@/types";

const VARIANT: Record<SkillConfidenceLevel, BadgeVariant> = {
  unverified: "neutral",
  low: "danger",
  moderate: "warning",
  high: "success",
  "very-high": "accent",
};

export function ConfidenceBadge({ level, className }: { level: SkillConfidenceLevel; className?: string }) {
  const label = SKILL_CONFIDENCE_LEVELS.find((l) => l.value === level)?.label ?? level;
  return (
    <Badge variant={VARIANT[level]} className={className}>
      {label}
    </Badge>
  );
}
