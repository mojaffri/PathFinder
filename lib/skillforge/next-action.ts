import { diagnoseWeakConcept } from "./diagnosis";
import type { NextBestAction, ReadinessCheck, SkillModule, SkillProgress } from "@/types";

/**
 * The single always-available answer to "what am I supposed to do now?"
 * (spec rule 16) — a deterministic decision ladder over the student's actual
 * demonstrated state, not a vague suggestion. Every branch is a concrete,
 * clickable next step.
 */
export function computeNextBestAction(
  module: SkillModule,
  progress: SkillProgress,
  readiness: ReadinessCheck,
  allModules: SkillModule[],
): NextBestAction {
  const { dimensions, level } = progress.mastery;

  if (level === "resume-ready") {
    return {
      type: "advance",
      label: "Move to your next priority skill",
      description: "You've demonstrated resume-ready mastery here — spend your remaining hours on the next highest-priority skill instead.",
    };
  }

  const hasStartedAnything =
    progress.attempts.length > 0 || progress.completedResourceIds.length > 0 || progress.completedExerciseIds.length > 0;

  if (!hasStartedAnything) {
    return {
      type: "diagnostic",
      label: "Test yourself first",
      description: readiness.ready
        ? "See what you already know before working through material you might not need."
        : `See what you already know first — heads up, ${readiness.gaps[0]?.skillName ?? "a prerequisite"} isn't fully demonstrated yet, so the diagnostic will show you exactly where you stand.`,
    };
  }

  // Checks the most recent GRADED attempt regardless of stage — a student who
  // only took "Test Me First" (diagnostic) and never touched the mastery
  // assessment still deserves a targeted recommendation from that result,
  // not a generic "keep learning" fallback that ignores what the diagnostic
  // already found.
  const lastGradedAttempt = [...progress.attempts].reverse().find((a) => a.evaluation !== null);
  if (lastGradedAttempt?.evaluation?.weakestConceptId) {
    const diagnosis = diagnoseWeakConcept(module, allModules, lastGradedAttempt.evaluation.weakestConceptId);
    return {
      type: "learn",
      label: diagnosis ? `Review ${diagnosis.conceptTitle}` : "Review the flagged gap",
      description: lastGradedAttempt.evaluation.recommendedNextStep,
    };
  }

  if (dimensions.knowledge < 55) {
    return {
      type: "learn",
      label: "Continue learning the core material",
      description: "Your demonstrated knowledge is still below a working level — keep going through the Learn section, or jump to the assessment if you think you already know it.",
    };
  }

  if (dimensions.ability < 50) {
    return {
      type: "practice",
      label: "Practice applying it",
      description: "You understand the concepts — now build ability by working through the practice exercises.",
    };
  }

  const hasUnstartedProject = module.projectChallenges.some(
    (p) => (progress.projectChallengeStatus[p.id] ?? "not-started") === "not-started",
  );
  if (hasUnstartedProject) {
    return {
      type: "build",
      label: "Start the project challenge",
      description: "You're ready to apply this to something real — start the project to build actual evidence.",
    };
  }

  if (dimensions.evidence < 45) {
    return {
      type: "build",
      label: "Build stronger evidence",
      description: "Add or finish a piece of evidence (a submitted or reviewed project, writing sample, or artifact) to back up what you've learned.",
    };
  }

  if (dimensions.interview < 55) {
    return {
      type: "interview",
      label: "Rate your interview readiness",
      description: "Everything else is solid — spend time practicing how you'd explain this skill out loud in an interview.",
    };
  }

  return {
    type: "assessment",
    label: "Take the mastery assessment",
    description: "You look ready — prove it with the mastery assessment to confirm and lock in this level.",
  };
}
