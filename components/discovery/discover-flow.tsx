"use client";

import { useState } from "react";
import { matchCareers } from "@/lib/matching/engine";
import { QuestionnaireWizard } from "@/components/discovery/questionnaire-wizard";
import { ResultsView } from "@/components/discovery/results-view";
import type { CareerMatch } from "@/types";

export function DiscoverFlow() {
  const [matches, setMatches] = useState<CareerMatch[] | null>(null);

  function handleComplete(answers: Parameters<typeof matchCareers>[0]) {
    const results = matchCareers(answers);
    setMatches(results);
    // Best-effort: a signed-in student's results show up later on
    // /dashboard. Discover itself never depends on this succeeding — an
    // anonymous visitor (or a 401 from the route) is a normal, silent no-op.
    fetch("/api/career-matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matches: results }),
    }).catch(() => {});
  }

  if (matches) {
    return <ResultsView matches={matches} onRetake={() => setMatches(null)} />;
  }

  return <QuestionnaireWizard onComplete={handleComplete} />;
}
