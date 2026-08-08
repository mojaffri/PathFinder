"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { SelectableCard } from "@/components/ui/selectable-card";
import { RatingScale } from "@/components/ui/rating-scale";
import { RankList } from "@/components/ui/rank-list";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  CAREER_CATEGORIES,
  EDUCATION_STAGES,
  EMPTY_QUESTIONNAIRE_ANSWERS,
  FAVORITE_SUBJECTS,
  PRIORITY_FACTORS,
  WORK_ENVIRONMENTS,
  WORK_STYLES,
  relevantEnvironments,
  relevantRatingDimensions,
  relevantSubjects,
  relevantWorkStyles,
  type QuestionnaireAnswers,
  type RatingDimension,
} from "@/types";

const MAX_CATEGORY_AFFINITIES = 3;
const MAX_WORK_STYLES = 2;

const PRIORITY_LABELS = Object.fromEntries(PRIORITY_FACTORS.map((p) => [p.value, p.label])) as Record<
  QuestionnaireAnswers["priorityRanking"][number],
  string
>;

const WORK_ENVIRONMENT_LOOKUP = Object.fromEntries(WORK_ENVIRONMENTS.map((e) => [e.value, e]));
const WORK_STYLE_LOOKUP = Object.fromEntries(WORK_STYLES.map((s) => [s.value, s]));
const FAVORITE_SUBJECT_LOOKUP = Object.fromEntries(FAVORITE_SUBJECTS.map((s) => [s.value, s]));

const RATING_CONFIG: Record<
  RatingDimension,
  { question: string; lowLabel: string; highLabel: string; anchors: { one: string; three: string; five: string } }
> = {
  mathComfort: {
    question: "How comfortable are you with heavy math?",
    lowLabel: "Not comfortable",
    highLabel: "Very comfortable",
    anchors: {
      one: "Basic arithmetic / algebra",
      three: "AP Calculus / university calculus",
      five: "Advanced multivariable mathematics / abstract linear algebra",
    },
  },
  technicalProblemSolving: {
    question: "How much do you enjoy technical problem solving?",
    lowLabel: "Not much",
    highLabel: "A lot",
    anchors: {
      one: "Prefers clear instructions",
      three: "Troubleshoots standard systems",
      five: "Designs complex novel logic / systems from scratch",
    },
  },
  tinkeringInterest: {
    question: "How much do you enjoy tinkering or building things?",
    lowLabel: "Not much",
    highLabel: "A lot",
    anchors: {
      one: "Rarely builds things",
      three: "Hobbyist projects / basic coding",
      five: "Deep physical/digital maker building / production tools",
    },
  },
  researchInterest: {
    question: "How interested are you in research?",
    lowLabel: "Not much",
    highLabel: "A lot",
    anchors: {
      one: "Dislikes reading papers",
      three: "Comfortable with structured lab work",
      five: "Passionate about open-ended literature review and experimentation",
    },
  },
  communicationInterest: {
    question: "How much do you enjoy writing, arguing, or persuading?",
    lowLabel: "Not much",
    highLabel: "A lot",
    anchors: {
      one: "Prefers to avoid writing or public speaking",
      three: "Comfortable writing/presenting when needed",
      five: "Energized by debate, persuasive writing, or making the case for something",
    },
  },
};

type StepKey = "basics" | "environment-style" | "subjects-strengths" | "priorities";

const STEPS: StepKey[] = ["basics", "environment-style", "subjects-strengths", "priorities"];

function toggleInArray<T>(list: T[], value: T, max?: number): T[] {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (max && list.length >= max) return list;
  return [...list, value];
}

export function QuestionnaireWizard({
  onComplete,
}: {
  onComplete: (answers: QuestionnaireAnswers) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(EMPTY_QUESTIONNAIRE_ANSWERS);

  const step = STEPS[stepIndex];
  const totalSteps = STEPS.length;

  // Every option list below is constrained by the fields chosen in step 1, so
  // students only ever see career-relevant choices for the rest of the flow.
  const environmentOptions = useMemo(
    () => relevantEnvironments(answers.categoryAffinities).map((v) => WORK_ENVIRONMENT_LOOKUP[v]),
    [answers.categoryAffinities],
  );
  const workStyleOptions = useMemo(
    () => relevantWorkStyles(answers.categoryAffinities).map((v) => WORK_STYLE_LOOKUP[v]),
    [answers.categoryAffinities],
  );
  const subjectOptions = useMemo(
    () => relevantSubjects(answers.categoryAffinities).map((v) => FAVORITE_SUBJECT_LOOKUP[v]),
    [answers.categoryAffinities],
  );
  const ratingDimensions = useMemo(
    () => relevantRatingDimensions(answers.categoryAffinities),
    [answers.categoryAffinities],
  );

  function update<K extends keyof QuestionnaireAnswers>(key: K, value: QuestionnaireAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  // Changing fields on step 1 can make previously chosen environment/style/subject
  // options irrelevant (and thus no longer visible) — prune them so a hidden, stale
  // selection can't silently satisfy a later step's "pick at least one" requirement.
  function updateCategoryAffinities(categories: QuestionnaireAnswers["categoryAffinities"]) {
    setAnswers((prev) => {
      const envAllowed = new Set(relevantEnvironments(categories));
      const styleAllowed = new Set(relevantWorkStyles(categories));
      const subjectAllowed = new Set(relevantSubjects(categories));
      return {
        ...prev,
        categoryAffinities: categories,
        workEnvironments: prev.workEnvironments.filter((v) => envAllowed.has(v)),
        workStylePreferences: prev.workStylePreferences.filter((v) => styleAllowed.has(v)),
        favoriteSubjects: prev.favoriteSubjects.filter((v) => subjectAllowed.has(v)),
      };
    });
  }

  const canProceed = (() => {
    switch (step) {
      case "basics":
        return answers.age !== null && answers.educationStage !== null && answers.categoryAffinities.length > 0;
      case "environment-style":
        return answers.workEnvironments.length > 0 && answers.workStylePreferences.length > 0;
      case "subjects-strengths":
        return answers.favoriteSubjects.length > 0;
      default:
        return true;
    }
  })();

  function next() {
    if (stepIndex === totalSteps - 1) {
      onComplete(answers);
    } else {
      setStepIndex((s) => s + 1);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10">
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Step {stepIndex + 1} of {totalSteps}
        </p>
        <ProgressBar value={((stepIndex + 1) / totalSteps) * 100} />
      </div>

      {step === "basics" && (
        <StepSection title="Let's start with the basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="age" required>
                Age
              </Label>
              <Input
                id="age"
                type="number"
                min={10}
                max={100}
                value={answers.age ?? ""}
                onChange={(e) => update("age", e.target.value ? Number(e.target.value) : null)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="educationStage" required>
                Education stage
              </Label>
              <Select
                id="educationStage"
                value={answers.educationStage ?? ""}
                onChange={(e) =>
                  update("educationStage", (e.target.value || null) as QuestionnaireAnswers["educationStage"])
                }
                className="mt-1.5"
              >
                <option value="">Select...</option>
                {EDUCATION_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-8">
            <Label required>Which fields interest you most?</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick up to {MAX_CATEGORY_AFFINITIES}. This drives every question after this one.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {CAREER_CATEGORIES.map((cat) => (
                <SelectableCard
                  key={cat.value}
                  title={cat.label}
                  selected={answers.categoryAffinities.includes(cat.value)}
                  onClick={() =>
                    updateCategoryAffinities(
                      toggleInArray(answers.categoryAffinities, cat.value, MAX_CATEGORY_AFFINITIES),
                    )
                  }
                />
              ))}
            </div>
          </div>
        </StepSection>
      )}

      {step === "environment-style" && (
        <StepSection
          title="Where and how do you want to work?"
          description="Options here are tailored to the fields you picked."
        >
          <div>
            <Label required>Work environment</Label>
            <p className="mt-1 text-sm text-muted-foreground">Pick as many as feel right.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {environmentOptions.map((env) => (
                <SelectableCard
                  key={env.value}
                  title={env.label}
                  description={env.description}
                  selected={answers.workEnvironments.includes(env.value)}
                  onClick={() => update("workEnvironments", toggleInArray(answers.workEnvironments, env.value))}
                />
              ))}
            </div>
          </div>

          <div className="mt-8">
            <Label required>What kind of work appeals to you?</Label>
            <p className="mt-1 text-sm text-muted-foreground">Pick up to {MAX_WORK_STYLES}.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {workStyleOptions.map((style) => (
                <ToggleChip
                  key={style.value}
                  selected={answers.workStylePreferences.includes(style.value)}
                  onClick={() =>
                    update(
                      "workStylePreferences",
                      toggleInArray(answers.workStylePreferences, style.value, MAX_WORK_STYLES),
                    )
                  }
                >
                  {style.label}
                </ToggleChip>
              ))}
            </div>
          </div>
        </StepSection>
      )}

      {step === "subjects-strengths" && (
        <StepSection
          title="Subjects and strengths"
          description="Also tailored to the fields you picked."
        >
          <div>
            <Label required>Which subjects do you enjoy most?</Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {subjectOptions.map((subject) => (
                <ToggleChip
                  key={subject.value}
                  selected={answers.favoriteSubjects.includes(subject.value)}
                  onClick={() =>
                    update("favoriteSubjects", toggleInArray(answers.favoriteSubjects, subject.value))
                  }
                >
                  {subject.label}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-8">
            {ratingDimensions.map((dimension) => {
              const config = RATING_CONFIG[dimension];
              return (
                <div key={dimension}>
                  <Label>{config.question}</Label>
                  <div className="mt-2">
                    <RatingScale
                      name={dimension}
                      lowLabel={config.lowLabel}
                      highLabel={config.highLabel}
                      value={answers[dimension]}
                      onChange={(v) => update(dimension, v)}
                      anchors={config.anchors}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </StepSection>
      )}

      {step === "priorities" && (
        <StepSection title="What matters most to you in a career?">
          <div className="flex flex-col gap-8">
            <div>
              <Label>How interested are you in remote work?</Label>
              <div className="mt-2">
                <RatingScale
                  name="remoteWorkInterest"
                  lowLabel="Prefer in-person"
                  highLabel="Prefer remote"
                  value={answers.remoteWorkInterest}
                  onChange={(v) => update("remoteWorkInterest", v)}
                />
              </div>
            </div>
            <div>
              <Label>Rank these from most to least important to you</Label>
              <div className="mt-2">
                <RankList
                  items={answers.priorityRanking}
                  labels={PRIORITY_LABELS}
                  onChange={(v) => update("priorityRanking", v)}
                />
              </div>
            </div>
          </div>
        </StepSection>
      )}

      <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
        <Button variant="secondary" onClick={() => setStepIndex((s) => s - 1)} disabled={stepIndex === 0}>
          Back
        </Button>
        <Button onClick={next} disabled={!canProceed}>
          {stepIndex === totalSteps - 1 ? "See my matches" : "Next"}
        </Button>
      </div>
    </div>
  );
}

function StepSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
