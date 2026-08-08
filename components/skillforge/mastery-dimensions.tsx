import { cn } from "@/lib/utils";
import type { ConfidenceLevel, EvidenceStrength, MasteryResult } from "@/types";

const EVIDENCE_LABEL: Record<EvidenceStrength, string> = {
  none: "None yet",
  weak: "Weak",
  moderate: "Moderate",
  strong: "Strong",
};

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

function DimensionRow({ label, display, confidence }: { label: string; display: string; confidence?: ConfidenceLevel }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="font-medium text-foreground">{display}</span>
        {confidence && <span className="text-xs text-muted-foreground">({CONFIDENCE_LABEL[confidence]})</span>}
      </span>
    </div>
  );
}

/**
 * Renders the four tracked dimensions exactly as specced: three as
 * supporting percentages, evidence as a qualitative strength label — never a
 * raw evidence percentage, since a number there would imply false precision.
 * Knowledge/Ability also carry a confidence label — a fact about how much
 * demonstrated evidence backs the number, not the AI's own self-reported
 * confidence (see `computeConfidence` in `lib/skillforge/mastery.ts`).
 */
export function MasteryDimensions({ mastery, className }: { mastery: MasteryResult; className?: string }) {
  const { dimensions } = mastery;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <DimensionRow label="Knowledge" display={`${dimensions.knowledge}%`} confidence={mastery.confidence.knowledge} />
      <DimensionRow label="Ability" display={`${dimensions.ability}%`} confidence={mastery.confidence.ability} />
      <DimensionRow label="Evidence" display={EVIDENCE_LABEL[mastery.evidenceStrength]} />
      <DimensionRow label="Interview" display={`${dimensions.interview}%`} />
    </div>
  );
}
