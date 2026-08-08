import { cn } from "@/lib/utils";

export interface ToggleChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
}

/** Pill-shaped toggle button used for multi-select questionnaire options and skill/tag pickers. */
export function ToggleChip({ selected, className, ...props }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "border-primary bg-accent text-accent-foreground"
          : "border-border bg-background text-foreground hover:bg-surface",
        className,
      )}
      {...props}
    />
  );
}
