import { cn } from "@/lib/utils";
import type { RatingScale as RatingScaleValue } from "@/types";

export interface RatingScaleAnchors {
  one: string;
  three: string;
  five: string;
}

export interface RatingScaleProps {
  value: RatingScaleValue;
  onChange: (value: RatingScaleValue) => void;
  lowLabel: string;
  highLabel: string;
  name: string;
  /** Full behavioral/academic anchor descriptions for 1/3/5, always rendered visibly (not a tooltip). */
  anchors?: RatingScaleAnchors;
}

/** 1-5 rating picker rendered as five selectable buttons, used across the discovery questionnaire. */
export function RatingScale({ value, onChange, lowLabel, highLabel, name, anchors }: RatingScaleProps) {
  return (
    <div>
      <div className="flex gap-2" role="radiogroup" aria-label={name}>
        {([1, 2, 3, 4, 5] as RatingScaleValue[]).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-surface",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {anchors ? (
        <dl className="mt-2.5 flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex gap-1.5">
            <dt className="shrink-0 font-semibold text-foreground">1 =</dt>
            <dd>{anchors.one}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="shrink-0 font-semibold text-foreground">3 =</dt>
            <dd>{anchors.three}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="shrink-0 font-semibold text-foreground">5 =</dt>
            <dd>{anchors.five}</dd>
          </div>
        </dl>
      ) : (
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}
