import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectableCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
  title: string;
  description?: string;
}

/** Larger card-styled alternative to ToggleChip, used for higher-stakes single/multi-select questions. */
export function SelectableCard({ selected, title, description, className, ...props }: SelectableCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "border-primary bg-accent"
          : "border-border bg-background hover:bg-surface",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-sm font-medium", selected ? "text-accent-foreground" : "text-foreground")}>
          {title}
        </span>
        {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
      </div>
      {description && <span className="text-xs text-muted-foreground">{description}</span>}
    </button>
  );
}
