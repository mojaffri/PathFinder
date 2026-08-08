import { Badge } from "@/components/ui/badge";
import type { DetectedSignal } from "@/types";

/** Renders every detector's result — including "not detected" ones, greyed out — so a gap is as visible as a strength, per "explainability" over hiding negative information. */
export function RepoSignalBadges({ signals }: { signals: DetectedSignal[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {signals.map((s) => (
        <Badge key={s.key} variant={s.detected ? "success" : "neutral"} title={s.evidence.join(", ") || "Not detected"}>
          {s.label}
        </Badge>
      ))}
    </div>
  );
}
