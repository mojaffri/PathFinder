import { CAREER_CATEGORIES } from "@/types";
import type { Career, CareerFitBreakdown, CareerFitComponentScore, StudentProfile } from "@/types";
import { clamp, demonstratedSkillText, fuzzyIncludes } from "@/lib/matching/evidence";

/**
 * Deterministic, explainable career-fit scoring against a student's full
 * confirmed profile — distinct from `lib/matching/engine.ts#matchCareers`
 * (which scores the Discover questionnaire's preference answers alone, and
 * is left untouched per CLAUDE.md). This engine answers a different
 * question: "given everything this student has actually put in their
 * profile — skills, experience, education, projects — how competitive are
 * they for this specific career, and why?" It's the recruiter-visible
 * flagship breakdown (component scores + evidence + strengths + gaps), not
 * a replacement for the Discover matcher.
 *
 * Every component score is 0-100 and comes from a documented formula over
 * structured profile/career data — no LLM call anywhere in this file. Ratios
 * involving user counts are clamped to a fixed ceiling (never "count / 0")
 * so an empty profile always produces a valid, low-but-defined score rather
 * than NaN or a crash.
 */

const WEIGHTS: Record<CareerFitComponentScore["key"], { label: string; weight: number }> = {
  skillMatch: { label: "Skill match", weight: 25 },
  experienceMatch: { label: "Experience match", weight: 20 },
  educationMatch: { label: "Education match", weight: 15 },
  projectEvidence: { label: "Project evidence", weight: 15 },
  interestAlignment: { label: "Interest alignment", weight: 10 },
  preferenceAlignment: { label: "Preference / work-style alignment", weight: 10 },
  roleRequirements: { label: "Role-specific requirements (certifications)", weight: 5 },
};

function closeness(a: number, b: number): number {
  return 1 - Math.abs(a - b) / 4;
}

interface ComponentResult {
  score: number;
  evidence: string[];
  gap: string | null;
}

function skillMatch(profile: StudentProfile, career: Career): ComponentResult {
  const demonstrated = demonstratedSkillText(profile);
  const skills = career.highValueSkills;
  if (skills.length === 0) return { score: 60, evidence: [], gap: null };

  const matched = skills.filter((skill) => fuzzyIncludes(demonstrated, skill));
  const score = clamp(Math.round((matched.length / skills.length) * 100));
  const gap =
    matched.length < skills.length
      ? `Missing evidence for ${skills.filter((s) => !matched.includes(s)).slice(0, 3).join(", ")}.`
      : null;

  return { score, evidence: matched.slice(0, 5).map((s) => `Demonstrated: ${s}`), gap };
}

function experienceMatch(profile: StudentProfile, career: Career): ComponentResult {
  const count = profile.experience.length;
  const relevantRoles = profile.experience.filter(
    (e) => e.title && career.commonEntryLevelRoles.some((role) => fuzzyIncludes([e.title ?? ""], role) || fuzzyIncludes([role], e.title ?? "")),
  );

  const base = count === 0 ? 10 : clamp(count * 20, 0, 70);
  const bonus = clamp(relevantRoles.length * 15, 0, 30);
  const score = clamp(base + bonus);

  const evidence = profile.experience
    .slice(0, 3)
    .map((e) => [e.title, e.organization].filter(Boolean).join(" at "))
    .filter((s) => s.length > 0);

  const gap = count === 0 ? "No internships or hands-on experience listed yet." : null;
  return { score, evidence, gap };
}

function educationMatch(profile: StudentProfile, career: Career): ComponentResult {
  if (!profile.major) {
    return { score: 40, evidence: [], gap: "No declared major yet." };
  }

  const aligned = fuzzyIncludes(career.commonMajors, profile.major);
  let score = aligned ? 90 : 55;
  const evidence: string[] = aligned ? [`${profile.major} is a common major for this career.`] : [];

  if (career.advancedDegreeTypical && profile.educationStage === "graduate-student") {
    score = clamp(score + 10);
    evidence.push("Already pursuing graduate-level education, which this career typically expects.");
  }

  const gap = aligned
    ? null
    : `${profile.major} isn't among the majors most common for this career (commonly ${career.commonMajors.slice(0, 3).join(", ")}).`;

  return { score, evidence, gap };
}

function projectEvidence(profile: StudentProfile, career: Career): ComponentResult {
  if (profile.projects.length === 0) {
    return { score: 15, evidence: [], gap: "No portfolio projects listed yet." };
  }

  const relevant = profile.projects.filter((p) => {
    const text = [p.title, p.summary ?? "", ...p.bullets, ...p.technologies];
    return career.highValueSkills.some((skill) => fuzzyIncludes(text, skill)) || career.commonTools.some((tool) => fuzzyIncludes(text, tool));
  });

  const score = clamp(30 + relevant.length * 25);
  const evidence = relevant.slice(0, 3).map((p) => `Project: ${p.title}`);
  const gap = relevant.length === 0 ? "None of your listed projects use this career's core tools/skills yet." : null;

  return { score, evidence, gap };
}

function interestAlignment(profile: StudentProfile, career: Career): ComponentResult {
  if (profile.interests.length === 0) {
    return { score: 50, evidence: [], gap: null };
  }

  const categoryLabel = CAREER_CATEGORIES.find((c) => c.value === career.category)?.label ?? career.category;
  const matched = profile.interests.filter(
    (interest) => fuzzyIncludes([categoryLabel], interest) || fuzzyIncludes([career.title], interest) || fuzzyIncludes([interest], career.category),
  );

  const score = matched.length > 0 ? 90 : 45;
  const evidence = matched.map((i) => `Stated interest: ${i}`);
  const gap = matched.length === 0 ? "None of your stated interests obviously line up with this field yet." : null;
  return { score, evidence, gap };
}

function preferenceAlignment(profile: StudentProfile, career: Career): ComponentResult {
  const prefs = profile.workPreferences;
  const envOverlap =
    prefs.environments.length > 0
      ? prefs.environments.filter((e) => career.workEnvironments.includes(e)).length / prefs.environments.length
      : 0.5;

  const remoteScore = closeness(prefs.remoteInterest, career.remotePotential);
  const salaryScore = closeness(prefs.salaryImportance, career.salaryPotential);
  const leadershipScore = closeness(prefs.leadershipInterest, career.businessIntensity);

  const score = clamp(Math.round(((envOverlap + remoteScore + salaryScore + leadershipScore) / 4) * 100));
  const evidence = envOverlap > 0.5 ? [`Preferred work environment overlaps with ${career.workEnvironments.join(", ")}.`] : [];
  const gap = score < 50 ? "Your stated work-style preferences don't closely match this career's typical environment." : null;

  return { score, evidence, gap };
}

function roleRequirements(profile: StudentProfile, career: Career): ComponentResult {
  const recommended = career.certifications.filter((c) => c.recommend);
  if (recommended.length === 0) return { score: 100, evidence: [], gap: null };

  const certNames = profile.certifications.map((c) => c.name);
  const matched = recommended.filter((c) => fuzzyIncludes(certNames, c.name));
  const score = clamp(Math.round((matched.length / recommended.length) * 100));
  const evidence = matched.map((c) => `Certification: ${c.name}`);
  const gap =
    matched.length < recommended.length
      ? `Missing ${recommended.filter((c) => !matched.includes(c)).slice(0, 2).map((c) => c.name).join(", ")}.`
      : null;

  return { score, evidence, gap };
}

const COMPONENT_FNS: Record<CareerFitComponentScore["key"], (profile: StudentProfile, career: Career) => ComponentResult> = {
  skillMatch,
  experienceMatch,
  educationMatch,
  projectEvidence,
  interestAlignment,
  preferenceAlignment,
  roleRequirements,
};

export function computeCareerFitBreakdown(profile: StudentProfile, career: Career): CareerFitBreakdown {
  const keys = Object.keys(WEIGHTS) as CareerFitComponentScore["key"][];

  const results = keys.map((key) => ({ key, ...COMPONENT_FNS[key](profile, career) }));
  const components: CareerFitComponentScore[] = results.map(({ key, score, evidence }) => ({
    key,
    label: WEIGHTS[key].label,
    weight: WEIGHTS[key].weight,
    score,
    evidence,
  }));

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const overallScore = clamp(Math.round(components.reduce((sum, c) => sum + c.weight * c.score, 0) / totalWeight));

  const strengths = components
    .filter((c) => c.score >= 75)
    .sort((a, b) => b.score - a.score)
    .flatMap((c) => (c.evidence.length > 0 ? c.evidence : [`Strong ${c.label.toLowerCase()}`]))
    .slice(0, 5);

  const gaps = results
    .filter((r) => r.score < 50 && r.gap !== null)
    .sort((a, b) => a.score - b.score)
    .map((r) => r.gap as string)
    .slice(0, 5);

  const topComponents = [...components].sort((a, b) => b.score - a.score).slice(0, 2).map((c) => c.label.toLowerCase());
  const weakComponents = [...components].sort((a, b) => a.score - b.score).slice(0, 2).filter((c) => c.score < 60).map((c) => c.label.toLowerCase());

  const explanation =
    `${career.title} — ${overallScore}%. Strongest in ${topComponents.join(" and ")}.` +
    (weakComponents.length > 0 ? ` Biggest opportunities: ${weakComponents.join(" and ")}.` : "");

  return {
    careerId: career.id,
    careerTitle: career.title,
    overallScore,
    components,
    strengths: strengths.length > 0 ? strengths : ["General fit based on your profile."],
    gaps,
    explanation,
  };
}
