import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RankListProps<T extends string> {
  items?: T[];
  labels: Record<T, string>;
  onChange: (items: T[]) => void;
}

/** Ordered list with up/down controls — accessible ranking without drag-and-drop. */
export function RankList<T extends string>({ items = [], labels, onChange }: RankListProps<T>) {
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={item}
          className={cn(
            "flex items-center justify-between gap-3 rounded-md border border-border bg-background px-4 py-2.5",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-muted-foreground">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-foreground">{labels[item]}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`Move ${labels[item]} up`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Move ${labels[item]} down`}
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
