"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RatingScale } from "@/components/ui/rating-scale";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { MasteryBadge } from "@/components/skillforge/mastery-badge";
import { MasteryDimensions } from "@/components/skillforge/mastery-dimensions";
import { SkillCheckPanel } from "@/components/skillforge/skill-check-panel";
import { useProfile } from "@/hooks/use-profile";
import { getRoadmaps } from "@/services/roadmap-service";
import {
  addEvidence,
  getSkillProgressMap,
  markExerciseCompleted,
  markResourceCompleted,
  removeEvidence,
  setInterviewSelfRating,
  setProjectChallengeStatus,
} from "@/services/skillforge-service";
import { getAllSkillModules, getSkillModule } from "@/lib/skillforge/catalog";
import { findRoadmapConnection } from "@/lib/skillforge/roadmap-connection";
import { checkReadiness } from "@/lib/skillforge/readiness";
import { computeNextBestAction } from "@/lib/skillforge/next-action";
import { diagnoseWeakConcept } from "@/lib/skillforge/diagnosis";
import { freshProgress } from "@/lib/skillforge/mastery";
import { calculateExpectedDuration } from "@/lib/roadmap/pacing";
import { MASTERY_LEVELS } from "@/types";
import type {
  NextBestActionType,
  ProjectChallengeStatus,
  RatingScale as RatingScaleValue,
  SkillEvidence,
  SkillModule,
  SkillProgress,
} from "@/types";

const SECTION_ID: Record<NextBestActionType, string | null> = {
  diagnostic: "diagnostic-section",
  learn: "learn-section",
  practice: "practice-section",
  build: "build-section",
  assessment: "assessment-section",
  interview: "interview-section",
  advance: null,
};

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const PROJECT_STATUS_OPTIONS: { value: ProjectChallengeStatus; label: string }[] = [
  { value: "not-started", label: "Not started" },
  { value: "in-progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "reviewed", label: "Reviewed" },
];

const EVIDENCE_TYPE_OPTIONS: { value: SkillEvidence["type"]; label: string }[] = [
  { value: "project", label: "Project" },
  { value: "writing-sample", label: "Writing sample" },
  { value: "certificate", label: "Certificate" },
  { value: "portfolio-link", label: "Portfolio link" },
  { value: "other", label: "Other" },
];

export function SkillDetailView({ skillId }: { skillId: string }) {
  const { profile, isAuthenticated, isLoading } = useProfile();
  // Keyed by skill id: this module plus its direct prerequisites, which is
  // exactly what the (synchronous, deterministic) readiness check needs —
  // fetched once as a map so `checkReadiness` never has to await anything.
  const [progressMap, setProgressMap] = useState<Record<string, SkillProgress> | null>(null);
  const [whyText, setWhyText] = useState<string | null>(null);

  const skillModule = useMemo(() => getSkillModule(skillId), [skillId]);

  useEffect(() => {
    if (!profile || !skillModule) return;
    let cancelled = false;
    const idsNeeded = [skillModule.id, ...skillModule.prerequisites];
    getSkillProgressMap(idsNeeded).then((map) => {
      if (!cancelled) setProgressMap(map);
    });

    getRoadmaps().then((roadmaps) => {
      if (cancelled) return;
      const connection = findRoadmapConnection(skillModule, roadmaps[0]?.roadmap.gapAnalysis ?? null);
      setWhyText(connection.whyText);
    });

    return () => {
      cancelled = true;
    };
  }, [profile, skillModule]);

  const progress = progressMap?.[skillModule?.id ?? ""] ?? null;
  const setProgress = (updated: SkillProgress) => {
    if (!skillModule) return;
    setProgressMap((prev) => ({ ...prev, [skillModule.id]: updated }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!skillModule) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Skill not found</h1>
        <Link href="/skillforge" className="mt-6 inline-block">
          <Button variant="secondary">Back to SkillForge</Button>
        </Link>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in to track progress</h1>
        <Link href={`/login?redirectTo=/skillforge/skills/${skillId}`} className="mt-6 inline-block">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Set up your profile to track progress</h1>
        <Link href="/onboarding" className="mt-6 inline-block">
          <Button>Start onboarding</Button>
        </Link>
      </div>
    );
  }

  if (!progress || !progressMap) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <SkillDetailBody
      skillModule={skillModule}
      progress={progress}
      onProgressChange={setProgress}
      progressMap={progressMap}
      weeklyHoursAvailable={profile.weeklyHoursAvailable}
      whyText={whyText ?? skillModule.whyItMatters}
    />
  );
}

function SkillDetailBody({
  skillModule,
  progress,
  onProgressChange,
  progressMap,
  weeklyHoursAvailable,
  whyText,
}: {
  skillModule: SkillModule;
  progress: SkillProgress;
  onProgressChange: (p: SkillProgress) => void;
  progressMap: Record<string, SkillProgress>;
  weeklyHoursAvailable: number | null;
  whyText: string;
}) {
  const duration = calculateExpectedDuration(skillModule.estimatedHours, weeklyHoursAvailable);
  const prerequisiteModules = skillModule.prerequisites
    .map((id) => getSkillModule(id))
    .filter((m): m is SkillModule => m !== null);

  const allModules = useMemo(() => getAllSkillModules(), []);
  const readiness = useMemo(
    () => checkReadiness(skillModule, allModules, (id) => progressMap[id] ?? freshProgress(id)),
    [skillModule, allModules, progressMap],
  );
  const nextBestAction = useMemo(
    () => computeNextBestAction(skillModule, progress, readiness, allModules),
    [skillModule, progress, readiness, allModules],
  );
  // A "learn" recommendation can point at a DIFFERENT (prerequisite) skill via
  // root-cause backtracking — in that case the banner must link to that
  // skill's page instead of scrolling this page's own Learn section.
  const nbaBacktrack = useMemo(() => {
    if (nextBestAction.type !== "learn") return null;
    const lastGraded = [...progress.attempts].reverse().find((a) => a.evaluation !== null);
    const weakestConceptId = lastGraded?.evaluation?.weakestConceptId;
    if (!weakestConceptId) return null;
    const diagnosis = diagnoseWeakConcept(skillModule, allModules, weakestConceptId);
    return diagnosis && !diagnosis.withinSameSkill ? diagnosis : null;
  }, [nextBestAction.type, progress.attempts, skillModule, allModules]);
  const [readinessDismissed, setReadinessDismissed] = useState(false);

  const coreResources = skillModule.learningResources.filter((r) => r.depth === "core");
  const deeperResources = skillModule.learningResources.filter((r) => r.depth === "deeper");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/skillforge" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to SkillForge
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{skillModule.name}</h1>
            <MasteryBadge level={progress.mastery.level} />
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{skillModule.description}</p>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-border bg-accent/40 p-4 text-sm text-foreground">
        <span className="font-medium">Why this is on your list: </span>
        {whyText}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => scrollToSection("learn-section")}>
          Start Learning
        </Button>
        <Button variant="secondary" size="sm" onClick={() => scrollToSection("practice-section")}>
          Practice First
        </Button>
        <Button variant="secondary" size="sm" onClick={() => scrollToSection("diagnostic-section")}>
          Test Me First
        </Button>
        <Button variant="secondary" size="sm" onClick={() => scrollToSection("build-section")}>
          Start Project
        </Button>
      </div>

      <Card className="mt-6 border-primary/30 bg-accent/30">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next best action</p>
            <p className="mt-1 text-sm font-medium text-foreground">{nextBestAction.label}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{nextBestAction.description}</p>
            {nbaBacktrack && (
              <p className="mt-1 text-xs text-muted-foreground">
                Root cause traced to <span className="font-medium text-foreground">{nbaBacktrack.recommendedSkillName}</span>{" "}
                — a prerequisite skill, not this one.
              </p>
            )}
          </div>
          {nbaBacktrack ? (
            <Link href={`/skillforge/skills/${nbaBacktrack.recommendedSkillId}`}>
              <Button size="sm">
                Go to {nbaBacktrack.recommendedSkillName}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            SECTION_ID[nextBestAction.type] && (
              <Button size="sm" onClick={() => scrollToSection(SECTION_ID[nextBestAction.type]!)}>
                Go
                <ArrowRight className="h-4 w-4" />
              </Button>
            )
          )}
        </CardContent>
      </Card>

      {!readiness.ready && !readinessDismissed && (
        <div className="mt-6 rounded-md border border-warning bg-warning-bg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-warning">Heads up — not a block</p>
          <p className="mt-1.5 text-sm text-foreground">
            You&apos;re free to start anything on this page. Based on your current progress, you may be missing some
            background that usually makes this easier.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {readiness.gaps.map((gap) => (
              <div key={gap.skillId} className="text-sm text-foreground">
                <span className="font-medium">Potential gap: {gap.skillName}</span>
                <p className="text-muted-foreground">
                  {gap.reason} Estimated review: ~{gap.estimatedReviewHours}h.
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Link href={`/skillforge/skills/${readiness.gaps[0]?.skillId}`}>
              <Button size="sm" variant="secondary">
                Review recommended skill
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={() => setReadinessDismissed(true)}>
              Start anyway
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mastery</CardTitle>
          </CardHeader>
          <CardContent>
            <MasteryDimensions mastery={progress.mastery} />
            <p className="mt-3 text-xs text-muted-foreground">{skillModule.masteryRequirements[progress.mastery.level]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Effort & timing</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estimated effort</span>
              <span className="font-medium text-foreground">{skillModule.estimatedHours} hours</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Your availability</span>
              <span className="font-medium text-foreground">
                {weeklyHoursAvailable ? `${weeklyHoursAvailable} hrs/week` : "Not set"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Expected duration</span>
              <span className="font-medium text-foreground">~{duration.expectedWeeks} weeks</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Priority</span>
              <Badge variant="neutral">{skillModule.priority}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {prerequisiteModules.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Prerequisites</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {prerequisiteModules.map((p) => (
              <Link key={p.id} href={`/skillforge/skills/${p.id}`}>
                <Badge variant="neutral">{p.name}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6" id="diagnostic-section">
        <CardHeader>
          <CardTitle className="text-base">Test Me First</CardTitle>
          <p className="text-sm text-muted-foreground">{skillModule.diagnostic.instructions}</p>
        </CardHeader>
        <CardContent>
          <SkillCheckPanel
            skillModule={skillModule}
            stage="diagnostic"
            questions={skillModule.diagnostic.prompts}
            allModules={allModules}
            onProgressChange={onProgressChange}
          />
        </CardContent>
      </Card>

      <Card className="mt-6" id="learn-section">
        <CardHeader>
          <CardTitle className="text-base">Learn</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div>
            <p className="text-sm leading-relaxed text-foreground">{skillModule.learnOverview.explanation}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <LearnList title="Objectives" items={skillModule.learnOverview.objectives} />
              <LearnList title="Key concepts" items={skillModule.learnOverview.keyConcepts} />
              <LearnList title="Examples" items={skillModule.learnOverview.examples} />
              <LearnList title="Common mistakes" items={skillModule.learnOverview.commonMistakes} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Core resources</p>
            <div className="flex flex-col gap-3">
              {coreResources.map((resource) => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  checked={progress.completedResourceIds.includes(resource.id)}
                  onChange={(checked) => markResourceCompleted(skillModule.id, resource.id, checked).then(onProgressChange)}
                />
              ))}
            </div>
          </div>

          {deeperResources.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Go deeper (optional)</p>
              <div className="flex flex-col gap-3">
                {deeperResources.map((resource) => (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    checked={progress.completedResourceIds.includes(resource.id)}
                    onChange={(checked) => markResourceCompleted(skillModule.id, resource.id, checked).then(onProgressChange)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6" id="practice-section">
        <CardHeader>
          <CardTitle className="text-base">Practice</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {skillModule.practiceExercises.map((exercise) => {
            const checked = progress.completedExerciseIds.includes(exercise.id);
            return (
              <label key={exercise.id} className="flex cursor-pointer items-start gap-3 rounded-md bg-surface p-3">
                <Checkbox
                  checked={checked}
                  onChange={(e) => markExerciseCompleted(skillModule.id, exercise.id, e.target.checked).then(onProgressChange)}
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{exercise.title}</p>
                    <Badge variant="neutral">{exercise.difficulty}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{exercise.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">~{exercise.estimatedMinutes} min</p>
                </div>
              </label>
            );
          })}
        </CardContent>
      </Card>

      <Card className="mt-6" id="build-section">
        <CardHeader>
          <CardTitle className="text-base">Build</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {skillModule.projectChallenges.map((challenge) => {
            const status = progress.projectChallengeStatus[challenge.id] ?? "not-started";
            return (
              <div key={challenge.id} className="rounded-md bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{challenge.title}</p>
                  <Select
                    value={status}
                    onChange={(e) =>
                      setProjectChallengeStatus(skillModule.id, challenge.id, e.target.value as ProjectChallengeStatus).then(
                        onProgressChange,
                      )
                    }
                    className="h-8 w-auto text-xs"
                  >
                    {PROJECT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{challenge.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Evidence of completion: </span>
                  {challenge.evidenceOfCompletion}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="mt-6" id="assessment-section">
        <CardHeader>
          <CardTitle className="text-base">Prove it — mastery assessment</CardTitle>
          <p className="text-sm text-muted-foreground">
            {skillModule.assessment.description}{" "}
            <span className="text-foreground">{skillModule.assessment.passingCriteria}</span>
          </p>
        </CardHeader>
        <CardContent>
          <SkillCheckPanel
            skillModule={skillModule}
            stage="assessment"
            questions={skillModule.assessment.questions}
            allModules={allModules}
            onProgressChange={onProgressChange}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Evidence</CardTitle>
          <p className="text-sm text-muted-foreground">Real, credible artifacts backing this skill — a repo, a document, a link.</p>
        </CardHeader>
        <CardContent>
          <EvidenceList skillModule={skillModule} progress={progress} onProgressChange={onProgressChange} />
        </CardContent>
      </Card>

      <Card className="mt-6" id="interview-section">
        <CardHeader>
          <CardTitle className="text-base">Interview</CardTitle>
          <p className="text-sm text-muted-foreground">{skillModule.interviewRelevance}</p>
        </CardHeader>
        <CardContent>
          <Label>How ready do you feel explaining this in an interview right now?</Label>
          <div className="mt-2">
            <RatingScale
              name="interviewSelfRating"
              lowLabel="Not ready"
              highLabel="Very ready"
              value={progress.interviewSelfRating ?? 3}
              onChange={(v: RatingScaleValue) => setInterviewSelfRating(skillModule.id, v).then(onProgressChange)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Mastery ladder for this skill</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {MASTERY_LEVELS.map((level) => (
            <div key={level.value} className="flex items-start gap-3">
              <Badge variant={level.value === progress.mastery.level ? "accent" : "neutral"} className="shrink-0">
                {level.label}
              </Badge>
              <p className="text-sm text-muted-foreground">{skillModule.masteryRequirements[level.value]}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function LearnList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item} className="text-sm text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResourceRow({
  resource,
  checked,
  onChange,
}: {
  resource: SkillModule["learningResources"][number];
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md bg-surface p-3">
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{resource.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {resource.type} &middot; ~{resource.estimatedMinutes} min
        </p>
        {resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open resource
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <p className="mt-1 text-xs italic text-muted-foreground">No verified link yet — search for this by title.</p>
        )}
      </div>
    </div>
  );
}

function EvidenceList({
  skillModule,
  progress,
  onProgressChange,
}: {
  skillModule: SkillModule;
  progress: SkillProgress;
  onProgressChange: (p: SkillProgress) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<SkillEvidence["type"]>("project");
  const [url, setUrl] = useState("");

  function commit() {
    if (!title.trim()) return;
    addEvidence(skillModule.id, {
      title: title.trim(),
      type,
      url: url.trim() || undefined,
      // A student-added artifact starts as "moderate" — genuinely stronger
      // than nothing, but not "strong" until it's actually been reviewed.
      strength: "moderate",
    }).then(onProgressChange);
    setTitle("");
    setUrl("");
    setType("project");
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {progress.evidence.length > 0 && (
        <div className="flex flex-col gap-2">
          {progress.evidence.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.type} &middot; {item.strength}
                  {item.url ? (
                    <>
                      {" "}
                      &middot;{" "}
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        link
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${item.title}`}
                onClick={() => removeEvidence(skillModule.id, item.id).then(onProgressChange)}
                className="shrink-0 text-muted-foreground hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <div>
            <Label htmlFor="evidence-title">What did you make or complete?</Label>
            <Input id="evidence-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" autoFocus />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="evidence-type">Type</Label>
              <Select id="evidence-type" value={type} onChange={(e) => setType(e.target.value as SkillEvidence["type"])} className="mt-1.5">
                {EVIDENCE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="evidence-url">Link (optional)</Label>
              <Input id="evidence-url" value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1.5" placeholder="https://" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={commit} disabled={!title.trim()}>
              Add evidence
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          Add evidence
        </Button>
      )}
    </div>
  );
}
