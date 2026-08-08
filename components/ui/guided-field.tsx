import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GuidedFieldProps {
  /** Only show the hint at all in contexts where it's relevant (e.g. resume review, not manual entry). */
  active: boolean;
  /** Whether the field this wraps is currently empty — the hint only shows while that's true. */
  empty: boolean;
  message: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a form field with a prominent "this wasn't in your resume" hint
 * while the field is empty, so students filling out the post-upload review
 * form know exactly which parts of their profile only they can supply.
 * Always renders a single wrapping div (with or without the decoration) so
 * it drops into flex/grid layouts the same way a plain field wrapper would.
 */
export function GuidedField({ active, empty, message, children, className }: GuidedFieldProps) {
  const showHint = active && empty;

  return (
    <div
      className={cn(
        showHint && "rounded-lg border border-dashed border-accent-foreground/30 bg-accent/50 p-3",
        className,
      )}
    >
      {showHint && (
        <div className="mb-2.5 flex items-start gap-2 text-xs font-medium text-accent-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>{message}</p>
        </div>
      )}
      {children}
    </div>
  );
}
