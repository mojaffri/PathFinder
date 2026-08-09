import type { EducationStage } from "../../types/profile";
import type { ReadinessGate } from "../../types/career";
import type { GapTimeHorizon } from "../../types/roadmap";

export type CareerStageGroup =
  | "secondary-school"
  | "early-undergraduate"
  | "upper-undergraduate"
  | "post-college-transition"
  | "alternative-training"
  | "graduate-school"
  | "career-change"
  | "unknown";

export interface StageStrategy {
  group: CareerStageGroup;
  label: string;
  positionSummary: string;
  immediateFocus: string;
  experienceGoal: string;
  applicationApproach: string;
  competitiveEdge: string;
  credentialWindowOpen: boolean;
  recommendedProjectHours: number;
}

const STRATEGIES: Record<CareerStageGroup, StageStrategy> = {
  "secondary-school": {
    group: "secondary-school",
    label: "high-school student",
    positionSummary: "You are early enough to explore cheaply while building foundations that keep several strong options open.",
    immediateFocus: "course selection, foundational skill practice, and one small finished project or field-exposure experience",
    experienceGoal: "field exposure through a school team, supervised lab or clinical volunteering, job shadowing, a community project, or a structured summer program",
    applicationApproach: "favor accessible local and school-based opportunities before mass-applying to internships designed for college students",
    competitiveEdge: "finish and publicly explain one real project, investigation, memo, or service contribution before college",
    credentialWindowOpen: false,
    recommendedProjectHours: 18,
  },
  "early-undergraduate": {
    group: "early-undergraduate",
    label: "early undergraduate",
    positionSummary: "Your best return now comes from building prerequisites and credible proof before recruiting becomes compressed.",
    immediateFocus: "core coursework, one target-aligned work sample, campus organizations with real output, and the first relevant experience",
    experienceGoal: "a first internship, lab role, clinic or public-service role, competition team, campus consulting engagement, or faculty-led project",
    applicationApproach: "combine targeted applications with campus organizations, faculty outreach, alumni conversations, and smaller employers that hire for potential",
    competitiveEdge: "start the recruiting and relationship-building cycle one year earlier than most classmates",
    credentialWindowOpen: false,
    recommendedProjectHours: 28,
  },
  "upper-undergraduate": {
    group: "upper-undergraduate",
    label: "upper-level undergraduate",
    positionSummary: "You are close enough to recruiting or professional-school deadlines that evidence, timing, and interview execution now matter as much as coursework.",
    immediateFocus: "relevant experience, a defensible flagship work sample, current-cycle recruiting, and any genuinely required admissions or licensure step",
    experienceGoal: "a target-aligned internship, co-op, research role, clinic, fellowship, or substantial client-facing project",
    applicationApproach: "run a focused campaign around active recruiting windows, warm introductions, strong work samples, and repeated interview practice",
    competitiveEdge: "produce one unusually deep artifact and get it reviewed by practitioners before applications peak",
    credentialWindowOpen: true,
    recommendedProjectHours: 40,
  },
  "post-college-transition": {
    group: "post-college-transition",
    label: "recent graduate",
    positionSummary: "The priority is to create fresh, target-aligned evidence and a disciplined bridge into the field rather than collecting unrelated credentials.",
    immediateFocus: "a current work sample, bridge experience, targeted applications, practitioner feedback, and interview repetition",
    experienceGoal: "a paid role where possible, or a bounded contract, fellowship, research, volunteer, open-source, clinic, or client project that produces verifiable work",
    applicationApproach: "pair a narrow employer list and warm outreach with weekly applications; use bridge work to prevent an unexplained gap",
    competitiveEdge: "show recent output and field-specific relationships instead of relying only on the degree you already earned",
    credentialWindowOpen: true,
    recommendedProjectHours: 36,
  },
  "alternative-training": {
    group: "alternative-training",
    label: "bootcamp or alternative-path learner",
    positionSummary: "Because your credential may be screened inconsistently, demonstrated work and trusted referrals must carry more of the signal.",
    immediateFocus: "fundamentals, one production-quality work sample, real users or a real client, and referral-quality professional relationships",
    experienceGoal: "a client project, apprenticeship, open-source contribution, contract, lab or community engagement, or internship that validates work outside the classroom",
    applicationApproach: "target employers open to skills-based hiring and lead with shipped work, outcomes, and referrals instead of application volume alone",
    competitiveEdge: "have a practitioner review your work and document an external user, maintainer, client, or stakeholder outcome",
    credentialWindowOpen: false,
    recommendedProjectHours: 45,
  },
  "graduate-school": {
    group: "graduate-school",
    label: "graduate student",
    positionSummary: "Your degree is no longer the differentiator by itself; the advantage comes from translating specialized work into evidence employers or research groups can evaluate quickly.",
    immediateFocus: "specialized depth, publishable or deployable output, external collaboration, and a clear translation from research to target-role value",
    experienceGoal: "an industry collaboration, internship, practicum, teaching or research leadership role, conference contribution, or open artifact tied to the target field",
    applicationApproach: "use advisor, alumni, conference, and collaborator networks while tailoring evidence to the exact role rather than describing only academic topics",
    competitiveEdge: "turn one advanced project into a concise public artifact, talk, poster, benchmark, dataset, or case study a hiring team can inspect",
    credentialWindowOpen: true,
    recommendedProjectHours: 50,
  },
  "career-change": {
    group: "career-change",
    label: "career changer",
    positionSummary: "The fastest credible route is a bridge that reuses your existing domain strengths while proving the missing target-field capability.",
    immediateFocus: "transferable-skill positioning, one target-aligned proof project, a low-risk bridge engagement, and relationships in the new field",
    experienceGoal: "a cross-functional project in your current organization, contract, volunteer engagement, apprenticeship, fellowship, or client project that creates target-role evidence",
    applicationApproach: "target adjacent roles and organizations where your prior domain knowledge is an advantage; avoid presenting yourself as if you have no experience at all",
    competitiveEdge: "combine a hard-to-copy strength from your prior career with a newly demonstrated target-field skill",
    credentialWindowOpen: true,
    recommendedProjectHours: 42,
  },
  unknown: {
    group: "unknown",
    label: "learner",
    positionSummary: "Your current stage is unclear, so the roadmap should start with actions that are useful now and verify eligibility before scheduling gated credentials.",
    immediateFocus: "one bounded proof project, direct field research, and clarification of your education or career stage",
    experienceGoal: "the most accessible target-aligned project, shadowing, volunteer, research, internship, or client opportunity available to you",
    applicationApproach: "verify eligibility and recruiting timing before investing heavily in applications or test preparation",
    competitiveEdge: "complete one real artifact and get feedback from someone already doing the work",
    credentialWindowOpen: false,
    recommendedProjectHours: 30,
  },
};

export function stageGroupFor(stage: string | null): CareerStageGroup {
  if (!stage) return "unknown";
  if (stage.startsWith("high-school-") || stage === "recent-hs-grad-gap-year") return "secondary-school";
  if (stage === "college-freshman" || stage === "college-sophomore") return "early-undergraduate";
  if (stage === "college-junior" || stage === "college-senior") return "upper-undergraduate";
  if (stage === "recent-college-grad-undecided") return "post-college-transition";
  if (stage === "bootcamp-alternative-student") return "alternative-training";
  if (stage === "graduate-student") return "graduate-school";
  if (stage === "career-changer") return "career-change";
  return "unknown";
}

export function getStageStrategy(stage: string | null): StageStrategy {
  return STRATEGIES[stageGroupFor(stage)];
}

export function isEducationStage(value: string | null): value is EducationStage {
  return value !== null && stageGroupFor(value) !== "unknown";
}

export function credentialHorizonForStage(
  gate: ReadinessGate | undefined,
  stage: string | null,
): GapTimeHorizon {
  if (gate === "requires-program-completion") return "long-term";
  if (gate === "requires-upperclass-standing") {
    return getStageStrategy(stage).credentialWindowOpen ? "near-term" : "long-term";
  }
  return "immediate";
}
