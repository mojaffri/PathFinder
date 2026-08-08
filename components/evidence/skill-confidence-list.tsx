"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { ConfidenceBadge } from "@/components/evidence/confidence-badge";
import { AddEvidenceForm } from "@/components/evidence/add-evidence-form";
import { deleteManualEvidence, getSkillConfidenceScores } from "@/services/evidence-service";
import type { SkillConfidenceScore } from "@/types";

/**
 * Every tracked skill's confidence report, explorable one at a time —
 * "avoid overwhelming the dashboard, prioritize explainability" means this
 * defaults to collapsed rows (name + badge only) with the full evidence
 * ledger + dimension breakdown one click away, not everything rendered at
 * once.
 */
export function SkillConfidenceList() {
  const [scores, setScores] = useState<SkillConfidenceScore[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingFor, setAddingFor] = useState<string | null>(null);

  function refresh() {
    getSkillConfidenceScores().then(setScores);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (scores === null) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No skills to score yet"
        description="Add skills to your profile, upload a resume, or analyze a GitHub repo to start building evidence-backed confidence scores."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {scores.map((score) => {
        const isOpen = expanded === score.skillName;
        return (
          <Card key={score.skillName}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
              onClick={() => setExpanded(isOpen ? null : score.skillName)}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">{score.skillName}</span>
                <ConfidenceBadge level={score.confidence} />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{score.evidenceCount} evidence source{score.evidenceCount === 1 ? "" : "s"}</span>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {isOpen && (
              <CardContent className="flex flex-col gap-4 pt-0">
                <p className="text-sm text-muted-foreground">{score.explanation}</p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {score.components.map((c) => (
                    <div key={c.dimension} className="rounded-md border border-border p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
                      <p className={`mt-1 text-sm ${c.present ? "text-foreground" : "text-muted-foreground"}`}>{c.detail}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</p>
                  <ul className="flex flex-col gap-2">
                    {score.evidence.map((e) => (
                      <li key={e.id} className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                        <div>
                          <p className="text-foreground">
                            <span className="font-medium">{e.sourceLabel}</span>{" "}
                            <span className="text-muted-foreground">— {e.explanation}</span>
                          </p>
                          <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                            {e.evidenceStrength} · {e.verificationStatus} · {e.origin === "manual" ? "manually added" : "auto-detected"}
                          </p>
                        </div>
                        {e.origin === "manual" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await deleteManualEvidence(e.id);
                              refresh();
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {addingFor === score.skillName ? (
                  <AddEvidenceForm
                    skillName={score.skillName}
                    onDone={() => {
                      setAddingFor(null);
                      refresh();
                    }}
                    onCancel={() => setAddingFor(null)}
                  />
                ) : (
                  <Button variant="secondary" size="sm" className="self-start" onClick={() => setAddingFor(score.skillName)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add evidence
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
