import type { AIRoadmapContent, RoadmapRequest } from "./schema";
import type { GapAnalysis, GapItem, RatingScale, RecommendationTier, ResolvedCareer, RoadmapRecommendation } from "@/types";
import { resolvePlaybooksForCareers } from "./playbooks";

/**
 * Rich, deterministic fallback roadmap, used whenever ANTHROPIC_API_KEY isn't
 * configured or the AI call fails. Unlike a generic template, this is built
 * directly from the same structured gap analysis and career competitiveness
 * data the AI path uses, so it stays specific even without a model call.
 *
 * Milestones and recommended actions are deliberately DIFFERENT content: a
 * milestone is the high-level target a gap represents ("Clear the FE
 * Chemical Exam"); recommended actions are that same gap's granular
 * `tacticalActions` ("Schedule 3 practice tests using NCEES official study
 * materials"). They must never restate the same title.
 */

/**
 * Placeholder only — the route handler always overwrites every phase's
 * `timeline` with a computed, non-overlapping window (see
 * `computePhaseTimelines` in lib/roadmap/pacing.ts) sized to that phase's
 * actual milestone hours and the student's real weekly availability. Never
 * hardcode a preset range here; it would just get replaced anyway.
 */
const PLACEHOLDER_TIMELINE = "Pending pacing calculation";

function tierForPriority(priority: GapItem["priority"]): RecommendationTier {
  if (priority === "critical" || priority === "high") return "must-do";
  if (priority === "medium") return "high-leverage";
  return "nice-to-have";
}

function effortForHours(hours: number): RatingScale {
  if (hours <= 3) return 1;
  if (hours <= 8) return 2;
  if (hours <= 20) return 3;
  if (hours <= 45) return 4;
  return 5;
}

/** Expands one gap into its granular tactical steps, each a distinct recommended action (never the milestone title itself). */
function gapToRecommendations(gap: GapItem): RoadmapRecommendation[] {
  return gap.tacticalActions.map((action, i) => ({
    id: `${gap.id}-action-${i}`,
    title: action.title,
    tier: tierForPriority(gap.priority),
    impact: gap.impact,
    effort: effortForHours(action.estimatedHours),
    estimatedHours: action.estimatedHours,
    prerequisite: i === 0 ? null : gap.tacticalActions[i - 1].title,
    whyItMatters: action.detail,
    evidenceOfCompletion: action.evidenceOfCompletion,
  }));
}

const PRIORITY_RANK: Record<GapItem["priority"], number> = { critical: 4, high: 3, medium: 2, low: 1 };

/** Highest-value gaps first within a phase, so a slice cap never cuts a critical item for a low-priority one. */
function byPriority(gaps: GapItem[]): GapItem[] {
  return [...gaps].sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.impact - a.impact);
}

function formatExperienceForSummary(request: RoadmapRequest): string | null {
  const entry = request.experience[0];
  if (!entry) return null;
  const org = entry.organization ? ` at ${entry.organization}` : "";
  return `${entry.title ?? "a role"}${org}`;
}

function formatProjectForSummary(request: RoadmapRequest): string | null {
  const project = request.projects[0];
  return project?.title ?? null;
}

function formatCareerList(titles: string[]): string {
  if (titles.length <= 1) return titles[0] ?? "your target career";
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

/** Deduplicates by a derived key, keeping the first occurrence — used to merge per-career lists without repeats. */
function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    result.push(item);
  }
  return result;
}

export function generateFallbackRoadmap(
  request: RoadmapRequest,
  resolvedCareers: ResolvedCareer[],
  gapAnalysis: GapAnalysis,
): AIRoadmapContent {
  const withCareer = resolvedCareers.filter((rc): rc is { title: string; career: NonNullable<ResolvedCareer["career"]> } => rc.career !== null);
  const title = formatCareerList(request.targetCareers);
  const isVersatile = request.targetCareers.length > 1;
  const playbooks = resolvePlaybooksForCareers(resolvedCareers);
  const gatingPlaybook = playbooks.find((p) => p.gatingExam !== null);

  const experienceSummary = formatExperienceForSummary(request);
  const projectSummary = formatProjectForSummary(request);

  const strengths: string[] = [];
  if (request.currentSkills.length > 0) strengths.push(`Existing skills in ${request.currentSkills.slice(0, 2).join(" and ")}`);
  if (projectSummary) strengths.push(`Hands-on project experience ("${projectSummary}") to point to`);
  if (experienceSummary) strengths.push(`Prior experience as ${experienceSummary}`);
  if (request.awards.length > 0) strengths.push(`Recognition: ${request.awards[0].name}`);
  if (request.careerGoals) strengths.push("A clear sense of what you want out of this career");
  if (strengths.length === 0) strengths.push("Willingness to build a structured plan this early");

  const mistakesToAvoid = withCareer.length > 0
    ? dedupeBy(withCareer.flatMap((rc) => rc.career.commonMistakes), (m) => m.toLowerCase()).slice(0, 6)
    : [
        "Waiting until the last year to start building a portfolio or gaining experience",
        "Applying broadly without tailoring your materials to the specific role",
        "Treating coursework as a substitute for hands-on, self-directed work",
      ];
  if (isVersatile) {
    mistakesToAvoid.unshift("Splitting your time evenly across every target career instead of doubling down on what counts toward more than one");
  }

  const certificationGuidance = dedupeBy(
    withCareer.flatMap((rc) => rc.career.certifications),
    (c) => c.name.toLowerCase(),
  ).map((c) => ({ name: c.name, recommend: c.recommend, reasoning: c.reasoning }));

  const rankedTools = dedupeBy(withCareer.flatMap((rc) => rc.career.commonTools), (t) => t.toLowerCase());
  const rankedInterviewTypes = dedupeBy(withCareer.flatMap((rc) => rc.career.interviewTypes), (t) => t.toLowerCase());
  const topOverlapSkill = gapAnalysis.gaps.find((g) => g.category === "technical" && g.relevantCareers.length > 1);

  // Phases are keyed off WHEN a gap belongs, not what kind it is — this is
  // what stops a long-horizon credential (Bar Exam, FE Exam, MCAT) from
  // crowding out immediate resume-building just because it's academically
  // important. Phase A is pure resume leverage available right now; Phase B
  // is networking and momentum; Phase C is long-range credentials, pushed
  // here specifically so they never compete with what the student can
  // actually act on this month.
  const phaseAGaps = byPriority(gapAnalysis.gaps.filter((g) => g.timeHorizon === "immediate")).slice(0, 5);
  const phaseBGaps = byPriority(gapAnalysis.gaps.filter((g) => g.timeHorizon === "near-term")).slice(0, 4);
  const phaseCGaps = byPriority(gapAnalysis.gaps.filter((g) => g.timeHorizon === "long-term")).slice(0, 4);

  return {
    executiveSummary: isVersatile
      ? `Here's the plan for becoming a genuinely competitive candidate across all ${request.targetCareers.length} of your target careers (${title}) at the same time. The focus is on the skills and experience that count toward more than one path, so you're not splitting your effort evenly and getting nowhere fast. Everything below comes straight from comparing your actual profile against what each field rewards, not boilerplate advice.`
      : `Here's a concrete plan for becoming a strong, competitive candidate for ${title}. Everything below comes straight from comparing your actual profile against what this field rewards, not boilerplate advice.`,
    currentProfileAssessment: gapAnalysis.currentStateSummary.join(". ") + ".",
    competitiveAdvantages: strengths.slice(0, 5),
    mistakesToAvoid,
    phases: [
      {
        key: "academic-technical-edge",
        title: "Phase A - Immediate Resume Builders",
        objective: `Build the concrete, resume-ready proof points that make you credible for ${title} right now, before anything that requires a further-off credential or application cycle.`,
        timeline: PLACEHOLDER_TIMELINE,
        whyItMattersForTarget: withCareer.length > 0
          ? withCareer.slice(0, 3).map((rc) => `${rc.title} candidates are evaluated first on ${rc.career.competitivenessFactors.slice(0, 2).map((f) => f.factor).join(" and ")}.`).join(" ")
          : "Concrete, provable work is the foundation every later step depends on.",
        milestones: phaseAGaps.map((g, i) => ({
          id: `phase-a-milestone-${i}`,
          title: g.title,
          description: g.description,
          estimatedHours: g.estimatedHours,
          impact: g.impact,
          evidenceOfCompletion: g.evidenceOfCompletion,
        })),
        recommendedActions: phaseAGaps.flatMap(gapToRecommendations).slice(0, 8),
        resources: [
          "Coursera or edX for a structured, credential-backed course in your weakest skill",
          "freeCodeCamp, Khan Academy, or MIT OpenCourseWare for free foundational material",
          "Your target field's professional society student chapter (e.g. IEEE, ACM, ASME, ABA Law Student Division, CFA Institute student chapter) for mentorship and job leads",
        ],
      },
      {
        key: "experience-portfolio",
        title: "Phase B - Interview Prep & Momentum",
        objective: "Turn the resume-ready work from Phase A into real conversations and interview readiness.",
        timeline: PLACEHOLDER_TIMELINE,
        whyItMattersForTarget: withCareer.length === 1
          ? withCareer[0].career.internshipExpectations
          : withCareer.length > 1
            ? `Across your target careers, ${withCareer.slice(0, 3).map((rc) => rc.career.internshipExpectations).join(" ")}`
            : "Momentum from conversations and interview practice is what turns resume-ready work into actual offers.",
        milestones: phaseBGaps.map((g, i) => ({
          id: `phase-b-milestone-${i}`,
          title: g.title,
          description: g.description,
          estimatedHours: g.estimatedHours,
          impact: g.impact,
          evidenceOfCompletion: g.evidenceOfCompletion,
        })),
        recommendedActions: phaseBGaps.length > 0
          ? phaseBGaps.flatMap(gapToRecommendations).slice(0, 8)
          : [
              {
                id: "near-term-fallback-1",
                title: "Research the specific interview format for your target field",
                tier: "high-leverage",
                impact: 4,
                effort: 2,
                estimatedHours: 3,
                prerequisite: null,
                whyItMatters: "Knowing the actual format (case, technical, behavioral, panel) before you're in it is a free advantage most candidates skip.",
                evidenceOfCompletion: "Written notes on the typical interview stages and format for your target field",
              },
              {
                id: "near-term-fallback-2",
                title: "Schedule one mock interview or practice conversation before you need it for real",
                tier: "nice-to-have",
                impact: 3,
                effort: 2,
                estimatedHours: 2,
                prerequisite: null,
                whyItMatters: "Practicing once under low stakes is what makes the first real one feel familiar instead of stressful.",
                evidenceOfCompletion: "A completed practice session and notes on what to tighten up",
              },
            ],
        resources: [
          "LinkedIn's alumni search (yourschool.edu/people on LinkedIn) to find people to talk to",
          "Handshake for internships tied to your school",
          "GitHub Pages, Vercel, or a personal site to host a portfolio for free (or a LinkedIn Featured section for a writing sample or case study)",
        ],
      },
      {
        key: "execution-interview",
        title: "Phase C - Long-Range Credentials & Execution",
        objective: gatingPlaybook
          ? `Handle the ${gatingPlaybook.gatingExam} and any other longer-range requirement once the timeline actually demands it, and convert everything from Phases A and B into offers.`
          : "Convert everything from Phases A and B into offers through disciplined applications and interview performance.",
        timeline: PLACEHOLDER_TIMELINE,
        whyItMattersForTarget: rankedInterviewTypes.length > 0
          ? `${withCareer.length > 1 ? "Across your target careers, interviews" : "Interviews for this field"} typically include ${rankedInterviewTypes.join(", ")}.`
          : "Even strong candidates lose offers to weak execution, and this phase closes that gap.",
        milestones: phaseCGaps.length > 0
          ? phaseCGaps.map((g, i) => ({
              id: `phase-c-milestone-${i}`,
              title: g.title,
              description: g.description,
              estimatedHours: g.estimatedHours,
              impact: g.impact,
              evidenceOfCompletion: g.evidenceOfCompletion,
            }))
          : [
              {
                id: "phase-c-milestone-0",
                title: "Track any long-range requirements for later",
                description: "Nothing here is urgent yet for your target field and stage, but keeping a lightweight record now means nothing catches you by surprise later.",
                estimatedHours: 3,
                impact: 2 as RatingScale,
                evidenceOfCompletion: "A saved note or calendar entry listing any future credential/licensing requirement and its realistic timing",
              },
            ],
        recommendedActions: phaseCGaps.length > 0
          ? phaseCGaps.flatMap(gapToRecommendations).slice(0, 8)
          : [
              {
                id: "long-term-fallback-1",
                title: "Note the realistic timing for any future licensing or credential requirement",
                tier: "nice-to-have",
                impact: 2,
                effort: 1,
                estimatedHours: 1,
                prerequisite: null,
                whyItMatters: "A one-line note now beats a surprised scramble two years from now.",
                evidenceOfCompletion: "A saved note naming the requirement and roughly when it becomes relevant",
              },
              {
                id: "long-term-fallback-2",
                title: "Run mock interviews and apply in weekly batches through this final stretch",
                tier: "must-do",
                impact: 4,
                effort: 3,
                estimatedHours: 20,
                prerequisite: null,
                whyItMatters: "This is where most candidates lose offers despite having the right resume and conversations behind them.",
                evidenceOfCompletion: "Completed mock interview sessions and an applications tracker showing steady weekly submissions",
              },
            ],
        resources: [
          "Pramp or interviewing.io for free live mock interviews with real people (technical/coding roles)",
          "Glassdoor's interview question database for your target companies, or LeetCode specifically for coding interviews",
          ...(gatingPlaybook?.officialPrepResource ? [gatingPlaybook.officialPrepResource] : ["Your career center's mock interview program, booked at least three weeks out"]),
        ],
      },
    ],
    certificationGuidance,
    portfolioIdeas: [
      projectSummary
        ? `Expand on "${projectSummary}" with a more advanced feature or a public write-up`
        : "A small, complete work sample (a project, writing sample, or case analysis) that solves a real, specific problem, not a generic exercise",
      topOverlapSkill
        ? `A project that specifically demonstrates skills valued across ${formatCareerList(topOverlapSkill.relevantCareers)}, so one build counts toward multiple target careers`
        : withCareer[0]
          ? `A project that specifically uses ${withCareer[0].career.highValueSkills[0] ?? "a core tool"} for this field`
          : "A project that uses one tool or technique this field specifically values",
    ],
    interviewPreparation: [
      "Prepare a concise, specific answer to 'walk me through your background'",
      "Practice explaining your best project clearly to a non-expert",
      rankedInterviewTypes.length > 0 ? `Prepare specifically for ${rankedInterviewTypes.join(", ")}` : "Research the typical interview format for this specific field",
    ],
    recommendedTools: rankedTools.length > 0 ? rankedTools.slice(0, 8) : (request.currentSkills.length > 0 ? request.currentSkills.slice(0, 5) : ["Identify field-standard tools and commit to learning them hands-on"]),
    recommendedResources: [
      "Your field's professional association student membership, often free or discounted",
      "A focused subreddit or Discord for your field (e.g. r/csMajors, r/EngineeringStudents, r/LawSchool, r/FinancialCareers, r/gradadmissions)",
      "One mentor found via LinkedIn or your school's alumni network you check in with monthly",
    ],
    realityCheck: withCareer.length > 0
      ? withCareer.length === 1
        ? withCareer[0].career.realityCheck
        : withCareer.map((rc) => `For ${rc.title}, ${rc.career.realityCheck}`).join(" ")
      : `"${title}" isn't in our structured career database yet, so treat this roadmap as a starting point rather than a fully researched analysis. Validate it against people actually working in the field.`,
  };
}
