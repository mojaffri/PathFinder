import { CAREERS } from "@/data/careers";
import { rankToImportance, SUBJECT_CATEGORY_AFFINITY } from "@/types";
import type { Career, CareerMatch, MatchConfidence, QuestionnaireAnswers } from "@/types";

/**
 * Deterministic, explainable weighted-scoring career matcher. No LLM is
 * involved: every dimension below maps a specific questionnaire answer to a
 * specific, documented career attribute, so a match percentage can always be
 * traced back to a concrete reason.
 */

function closeness(a: number, b: number): number {
  return 1 - Math.abs(a - b) / 4;
}

/** How strongly a workStyle preference maps onto a career's own intensity attributes. */
function workStyleScore(style: QuestionnaireAnswers["workStylePreferences"][number], career: Career): number {
  switch (style) {
    case "coding":
      return career.codingIntensity / 5;
    case "physical-systems":
      return career.handsOnIntensity / 5;
    case "data":
      return (career.mathIntensity + career.codingIntensity) / 10;
    case "science":
      return career.researchIntensity / 5;
    case "writing-communication":
      return career.communicationIntensity / 5;
    case "strategy-analysis":
      return (career.businessIntensity + career.researchIntensity) / 10;
  }
}

interface DimensionScore {
  label: string;
  weight: number;
  score: number; // 0-1
  reason?: string;
}

function scoreCareer(answers: QuestionnaireAnswers, career: Career): DimensionScore[] {
  const dimensions: DimensionScore[] = [];

  if (answers.workEnvironments.length > 0) {
    const overlap = answers.workEnvironments.filter((e) => career.workEnvironments.includes(e)).length;
    const score = overlap / answers.workEnvironments.length;
    dimensions.push({
      label: "work environment",
      weight: 12,
      score,
      reason:
        overlap > 0
          ? `Matches your preferred work environment (${career.workEnvironments.join(", ")}).`
          : undefined,
    });
  }

  if (answers.categoryAffinities.length > 0) {
    const matched = answers.categoryAffinities.includes(career.category);
    dimensions.push({
      label: "field interest",
      weight: 20,
      score: matched ? 1 : 0.3,
      reason: matched ? `You said ${career.category.replace(/-/g, " ")} interests you.` : undefined,
    });
  }

  dimensions.push({
    label: "math comfort",
    weight: 10,
    score: closeness(answers.mathComfort, career.mathIntensity),
    reason:
      answers.mathComfort >= 4 && career.mathIntensity >= 4
        ? "Your comfort with heavy math lines up with this field's math intensity."
        : undefined,
  });

  dimensions.push({
    label: "technical problem solving",
    weight: 8,
    score: closeness(answers.technicalProblemSolving, career.technicalIntensity),
  });

  dimensions.push({
    label: "hands-on / tinkering",
    weight: 8,
    score: closeness(answers.tinkeringInterest, career.handsOnIntensity),
    reason:
      answers.tinkeringInterest >= 4 && career.handsOnIntensity >= 4
        ? "You enjoy building and tinkering, and this role is hands-on."
        : undefined,
  });

  dimensions.push({
    label: "research interest",
    weight: 8,
    score: closeness(answers.researchInterest, career.researchIntensity),
    reason:
      answers.researchInterest >= 4 && career.researchIntensity >= 4
        ? "You're drawn to research, and this field is research-heavy."
        : undefined,
  });

  dimensions.push({
    label: "communication / writing interest",
    weight: 8,
    score: closeness(answers.communicationInterest, career.communicationIntensity),
    reason:
      answers.communicationInterest >= 4 && career.communicationIntensity >= 4
        ? "You enjoy writing and argumentation, and this field leans heavily on communication."
        : undefined,
  });

  if (answers.workStylePreferences.length > 0) {
    const avg =
      answers.workStylePreferences.reduce((sum, style) => sum + workStyleScore(style, career), 0) /
      answers.workStylePreferences.length;
    dimensions.push({
      label: "work style",
      weight: 15,
      score: avg,
      reason: avg >= 0.7 ? "The day-to-day work style here is close to what you said you enjoy." : undefined,
    });
  }

  const salaryImportance = rankToImportance(answers.priorityRanking, "salary");
  const salaryCloseness = career.salaryPotential / 5;
  dimensions.push({
    label: "salary priority",
    weight: 7,
    score: 1 - (salaryImportance / 5) * (1 - salaryCloseness),
    reason:
      salaryImportance >= 4 && career.salaryPotential >= 4
        ? "You ranked salary as a top priority, and this field pays well relative to other careers in the dataset."
        : undefined,
  });

  const wlbImportance = rankToImportance(answers.priorityRanking, "work-life-balance");
  const remoteImportance = Math.max(answers.remoteWorkInterest, wlbImportance) / 5;
  const remoteCloseness = closeness(answers.remoteWorkInterest, career.remotePotential);
  dimensions.push({
    label: "remote flexibility / work-life balance",
    weight: 8,
    score: 1 - remoteImportance * (1 - remoteCloseness),
    reason:
      answers.remoteWorkInterest >= 4 && career.remotePotential >= 4
        ? "You'd like remote flexibility, and this field supports that reasonably well."
        : undefined,
  });

  const leadershipImportance = rankToImportance(answers.priorityRanking, "leadership-entrepreneurship");
  dimensions.push({
    label: "leadership / business orientation",
    weight: 4,
    score: 1 - (leadershipImportance / 5) * (1 - career.businessIntensity / 5),
    reason:
      leadershipImportance >= 4 && career.businessIntensity >= 4
        ? "You ranked leadership highly, and this field leans business/strategy-oriented."
        : undefined,
  });

  if (answers.favoriteSubjects.length > 0) {
    const matchedSubjects = answers.favoriteSubjects.filter((s) =>
      SUBJECT_CATEGORY_AFFINITY[s].includes(career.category),
    );
    dimensions.push({
      label: "favorite subjects",
      weight: 5,
      score: matchedSubjects.length > 0 ? 1 : 0.5,
      reason:
        matchedSubjects.length > 0
          ? `Draws on subjects you said you enjoy (${matchedSubjects.join(", ")}).`
          : undefined,
    });
  }

  return dimensions;
}

function computeConfidence(answers: QuestionnaireAnswers): MatchConfidence {
  const ratings = [
    answers.mathComfort,
    answers.technicalProblemSolving,
    answers.tinkeringInterest,
    answers.researchInterest,
    answers.communicationInterest,
    answers.remoteWorkInterest,
  ];
  const decisiveness = ratings.reduce((sum, r) => sum + Math.abs(r - 3) / 2, 0) / ratings.length;
  const hasSelections =
    answers.workEnvironments.length > 0 &&
    answers.favoriteSubjects.length > 0 &&
    answers.workStylePreferences.length > 0 &&
    answers.categoryAffinities.length > 0;

  if (decisiveness > 0.5 && hasSelections) return "high";
  if (decisiveness > 0.25 || hasSelections) return "medium";
  return "low";
}

export function matchCareers(
  answers: QuestionnaireAnswers,
  careers: Career[] = CAREERS,
  topN = 6,
): CareerMatch[] {
  const confidence = computeConfidence(answers);

  const scored = careers.map((career) => {
    const dimensions = scoreCareer(answers, career);
    const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
    const weightedScore = dimensions.reduce((sum, d) => sum + d.weight * d.score, 0) / totalWeight;

    const reasons = dimensions
      .filter((d) => d.reason)
      .sort((a, b) => b.weight * b.score - a.weight * a.score)
      .map((d) => d.reason!)
      .slice(0, 4);

    const strengths: string[] = [];
    if (answers.mathComfort >= 4 && career.mathIntensity >= 4) strengths.push("Strong comfort with math");
    if (answers.technicalProblemSolving >= 4 && career.technicalIntensity >= 4)
      strengths.push("Strong technical problem-solving");
    if (answers.tinkeringInterest >= 4 && career.handsOnIntensity >= 4)
      strengths.push("Hands-on building and tinkering");
    if (answers.researchInterest >= 4 && career.researchIntensity >= 4)
      strengths.push("Research-oriented mindset");
    if (answers.communicationInterest >= 4 && career.communicationIntensity >= 4)
      strengths.push("Strong writing and communication");

    return {
      career,
      matchPercentage: Math.round(weightedScore * 100),
      confidence,
      reasons: reasons.length > 0 ? reasons : ["General fit based on your questionnaire answers."],
      strengths,
    } satisfies CareerMatch;
  });

  return scored.sort((a, b) => b.matchPercentage - a.matchPercentage).slice(0, topN);
}
