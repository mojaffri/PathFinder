import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateExpectedDuration } from "@/lib/roadmap/pacing";
import type { TopMove } from "@/types";

export function TopMoves({ moves, weeklyHoursAvailable }: { moves: TopMove[]; weeklyHoursAvailable: number | null }) {
  if (moves.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-accent/30">
      <CardHeader>
        <CardTitle>Your 3 highest-priority moves</CardTitle>
        <p className="text-sm text-muted-foreground">
          Start in this order. The time estimate reflects your weekly availability, even when a move spans more than one month.
        </p>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4">
          {moves.map((move, index) => {
            const duration = calculateExpectedDuration(move.estimatedHours, weeklyHoursAvailable);
            return (
              <li key={move.id} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{move.title}</p>
                    {move.relevantCareers.length > 1 && (
                      <Badge variant="success">Helps {move.relevantCareers.length} careers</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">Estimated time: {duration.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{move.why}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
