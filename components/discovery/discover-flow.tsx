"use client";

import { useState } from "react";
import { matchCareers } from "@/lib/matching/engine";
import { QuestionnaireWizard } from "@/components/discovery/questionnaire-wizard";
import { ResultsView } from "@/components/discovery/results-view";
import type { CareerMatch } from "@/types";

export function DiscoverFlow() {
  const [matches, setMatches] = useState<CareerMatch[] | null>(null);

  if (matches) {
    return <ResultsView matches={matches} onRetake={() => setMatches(null)} />;
  }

  return <QuestionnaireWizard onComplete={(answers) => setMatches(matchCareers(answers))} />;
}
