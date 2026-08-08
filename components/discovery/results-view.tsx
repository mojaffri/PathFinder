import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CareerMatchCard } from "@/components/discovery/career-match-card";
import type { CareerMatch } from "@/types";

export function ResultsView({
  matches,
  onRetake,
}: {
  matches: CareerMatch[];
  onRetake: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your career matches</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Ranked by fit based on your answers. Every match is explainable, so expand a card to see the
            reasoning.
          </p>
        </div>
        <Button variant="secondary" onClick={onRetake}>
          <RotateCcw className="h-4 w-4" />
          Retake
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {matches.map((match, index) => (
          <CareerMatchCard key={match.career.id} match={match} rank={index + 1} />
        ))}
      </div>
    </div>
  );
}
