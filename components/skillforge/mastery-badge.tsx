import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { MASTERY_LEVELS, type MasteryLevel } from "@/types";

const MASTERY_VARIANT: Record<MasteryLevel, BadgeVariant> = {
  exposure: "neutral",
  familiar: "neutral",
  working: "accent",
  proficient: "accent",
  "interview-ready": "warning",
  "resume-ready": "success",
};

const MASTERY_LABEL = Object.fromEntries(MASTERY_LEVELS.map((l) => [l.value, l.label])) as Record<MasteryLevel, string>;

export function MasteryBadge({ level, className }: { level: MasteryLevel; className?: string }) {
  return (
    <Badge variant={MASTERY_VARIANT[level]} className={className}>
      {MASTERY_LABEL[level]}
    </Badge>
  );
}
