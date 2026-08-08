"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { recordAttempt } from "@/services/skillforge-service";
import { diagnoseWeakConcept } from "@/lib/skillforge/diagnosis";
import { cn } from "@/lib/utils";
import type {
  AssessmentQuestion,
  QuestionVerdict,
  SkillAttemptResponse,
  SkillEvaluationResult,
  SkillModule,
  SkillProgress,
} from "@/types";

const VERDICT_LABEL: Record<QuestionVerdict, string> = {
  correct: "Correct",
  "partially-correct": "Partially correct",
  incorrect: "Incorrect",
  "insufficient-evidence": "Not enough to judge",
};

const VERDICT_VARIANT: Record<QuestionVerdict, "success" | "warning" | "danger" | "neutral"> = {
  correct: "success",
  "partially-correct": "warning",
  incorrect: "danger",
  "insufficient-evidence": "neutral",
};

type PanelState = "idle" | "submitting" | "result" | "ungraded";

/**
 * The one real "re-test" surface in SkillForge — shared by the diagnostic
 * ("Test Me First") and the mastery assessment ("Prove it") since both are
 * the same shape: a short set of open-response prompts, graded server-side,
 * with a concrete next step. Never blocks retrying or moving on regardless
 * of the result, per the guided-freedom philosophy.
 */
export function SkillCheckPanel({
  userId,
  skillModule,
  stage,
  questions,
  allModules,
  onProgressChange,
}: {
  userId: string;
  skillModule: SkillModule;
  stage: "diagnostic" | "assessment";
  questions: AssessmentQuestion[];
  allModules: SkillModule[];
  onProgressChange: (p: SkillProgress) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<PanelState>("idle");
  const [result, setResult] = useState<SkillEvaluationResult | null>(null);

  async function submit() {
    const responses: SkillAttemptResponse[] = questions.map((q) => ({
      questionId: q.id,
      answer: (answers[q.id] ?? "").trim(),
    }));

    setState("submitting");

    let evaluation: SkillEvaluationResult | null = null;
    try {
      const res = await fetch("/api/skillforge/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: skillModule.id,
          stage,
          moduleName: skillModule.name,
          moduleDescription: skillModule.description,
          concepts: skillModule.concepts,
          questions,
          responses,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { evaluation: SkillEvaluationResult | null };
        evaluation = data.evaluation;
      }
    } catch {
      evaluation = null;
    }

    const updated = recordAttempt(userId, skillModule, stage, responses, evaluation);
    onProgressChange(updated);
    setResult(evaluation);
    setState(evaluation ? "result" : "ungraded");
  }

  function retry() {
    setAnswers({});
    setResult(null);
    setState("idle");
  }

  if (state === "result" && result) {
    const diagnosis = result.weakestConceptId ? diagnoseWeakConcept(skillModule, allModules, result.weakestConceptId) : null;

    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <ScoreTile label="Knowledge" value={result.knowledgeScore} />
          <ScoreTile label="Ability" value={result.abilityScore} />
        </div>

        <div className="flex flex-col gap-3">
          {result.perQuestion.map((pq) => (
            <div key={pq.questionId} className="rounded-md bg-surface p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {questions.find((q) => q.id === pq.questionId)?.prompt ?? "Question"}
                </p>
                <Badge variant={VERDICT_VARIANT[pq.verdict]}>{VERDICT_LABEL[pq.verdict]}</Badge>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{pq.explanation}</p>
            </div>
          ))}
        </div>

        {(result.strengths.length > 0 || result.weaknesses.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {result.strengths.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strengths</p>
                <ul className="flex flex-col gap-1">
                  {result.strengths.map((s) => (
                    <li key={s} className="text-sm text-foreground">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.weaknesses.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weaknesses</p>
                <ul className="flex flex-col gap-1">
                  {result.weaknesses.map((w) => (
                    <li key={w} className="text-sm text-foreground">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {diagnosis && (
          <div className="rounded-md border border-warning bg-warning-bg p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
              {diagnosis.withinSameSkill ? "Targeted review" : "Root cause found"}
            </p>
            <p className="mt-1 text-sm text-foreground">{diagnosis.explanation}</p>
            <p className="mt-1 text-xs text-muted-foreground">~{diagnosis.estimatedReviewMinutes} min review</p>
            {!diagnosis.withinSameSkill && (
              <Link href={`/skillforge/skills/${diagnosis.recommendedSkillId}`} className="mt-2 inline-block">
                <Button size="sm" variant="secondary">
                  Review {diagnosis.recommendedSkillName}
                </Button>
              </Link>
            )}
          </div>
        )}

        <div className="rounded-md bg-accent/40 p-3 text-sm text-foreground">
          <span className="font-medium">Recommended next step: </span>
          {result.recommendedNextStep}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={retry}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (state === "ungraded") {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
          We couldn&apos;t grade this automatically right now. Your answers are saved — you can retry grading anytime.
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={submit}>
            Retry grading
          </Button>
          <Button type="button" variant="ghost" onClick={retry}>
            Start over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q) => (
        <div key={q.id}>
          <Label htmlFor={`q-${q.id}`}>{q.prompt}</Label>
          <Textarea
            id={`q-${q.id}`}
            className="mt-1.5"
            value={answers[q.id] ?? ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            disabled={state === "submitting"}
          />
        </div>
      ))}
      <div>
        <Button type="button" onClick={submit} disabled={state === "submitting"}>
          {state === "submitting" ? (
            <>
              <Spinner className="h-4 w-4" />
              Grading...
            </>
          ) : (
            "Submit for grading"
          )}
        </Button>
      </div>
    </div>
  );
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-surface p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold text-foreground")}>{value}%</p>
    </div>
  );
}
