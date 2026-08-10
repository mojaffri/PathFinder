import { requestStructuredAI } from "@/lib/ai/structured-output";
import { AI_ROADMAP_JSON_SCHEMA, AIRoadmapContentSchema, type AIRoadmapContent, type RoadmapRequest } from "./schema";
import { formatGpa } from "@/lib/gpa";
import { resolvePlaybooksForCareers } from "./playbooks";
import { getStageStrategy } from "./stage-strategy";
import type { GapAnalysis, ResolvedCareer } from "@/types";

const TOOL_NAME = "generate_roadmap";

function formatEducation(request: RoadmapRequest): string {
  if (request.education.length === 0) return "Not provided";
  return request.education
    .map((e) => {
      const dates = [e.startDate, e.endDate].filter(Boolean).join(" - ");
      return `${e.institution ?? "Unknown institution"} — ${[e.degree, e.major].filter(Boolean).join(", ")}${e.gpa ? `, GPA ${e.gpa}` : ""}${dates ? ` (${dates})` : ""}`;
    })
    .join("; ");
}

function formatExperience(request: RoadmapRequest): string {
  if (request.experience.length === 0) return "None listed";
  return request.experience
    .map((e) => {
      const dates = [e.startDate, e.endDate].filter(Boolean).join(" - ");
      const bullets = e.bullets.length > 0 ? ` [${e.bullets.join("; ")}]` : e.summary ? ` [${e.summary}]` : "";
      return `${e.title ?? "Role"} at ${e.organization ?? "unknown org"}${dates ? ` (${dates})` : ""}${bullets}`;
    })
    .join(" | ");
}

function formatProjects(request: RoadmapRequest): string {
  if (request.projects.length === 0) return "None listed";
  return request.projects
    .map((p) => {
      const tech = p.technologies.length > 0 ? ` using ${p.technologies.join(", ")}` : "";
      const bullets = p.bullets.length > 0 ? ` [${p.bullets.join("; ")}]` : p.summary ? ` [${p.summary}]` : "";
      return `${p.title}${tech}${bullets}`;
    })
    .join(" | ");
}

function formatAwards(request: RoadmapRequest): string {
  if (request.awards.length === 0) return "None listed";
  return request.awards.map((a) => `${a.name}${a.organization ? ` (${a.organization})` : ""}`).join(", ");
}

function formatCertifications(request: RoadmapRequest): string {
  if (request.certifications.length === 0) return "None listed";
  return request.certifications.map((c) => c.name).join(", ");
}

function formatCareerList(titles: string[]): string {
  if (titles.length <= 1) return titles[0] ?? "your target career";
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

function buildPrompt(request: RoadmapRequest, resolvedCareers: ResolvedCareer[], gapAnalysis: GapAnalysis): string {
  const targetList = formatCareerList(request.targetCareers);
  const isVersatile = request.targetCareers.length > 1;
  const stage = getStageStrategy(request.educationStage);

  const competitivenessBlock = resolvedCareers
    .map(({ title, career }) => {
      if (!career) {
        return `"${title}" isn't in our structured career database, so reason about it generally — be honest that this analysis is less grounded than for a recognized career. Treat it as a genuine professional or academic career path and build real, field-appropriate guidance for it, whatever field it's in.`;
      }
      return `=== ${title} ===\nCompetitiveness factors (weight 1-5):\n${career.competitivenessFactors
        .map((f) => `- ${f.factor} (weight ${f.weight}/5): ${f.description}`)
        .join("\n")}\n\nDegree requirements: ${career.degreeRequirements}\nCommon entry-level roles: ${career.commonEntryLevelRoles.join(", ")}\nHigh-value skills: ${career.highValueSkills.join(", ")}\nInternship expectations: ${career.internshipExpectations}\nPortfolio expectations: ${career.portfolioExpectations}\nResearch expectations: ${career.researchExpectations}\nCommon mistakes candidates make: ${career.commonMistakes.join("; ")}\nDifferentiation strategies: ${career.differentiationStrategies.join("; ")}\nAvailable certifications and honest guidance on each:\n${career.certifications.map((c) => `- ${c.name} (${c.recommend ? "worth considering" : "usually not worth it"}): ${c.reasoning}`).join("\n")}`;
    })
    .join("\n\n");

  const gapsBlock = gapAnalysis.gaps
    .map((g) => `- [${g.priority.toUpperCase()} | ${g.timeHorizon}] (${g.category}, ~${g.estimatedHours}h to address, relevant to: ${g.relevantCareers.join(", ") || "general"}) ${g.title}: ${g.description}`)
    .join("\n");

  const playbooks = resolvePlaybooksForCareers(resolvedCareers);
  const playbooksBlock = playbooks
    .map((p) => `=== ${p.field} playbook ===\nGating exam: ${p.gatingExam ?? "none - no single dominant standardized test for this career"}${p.gatingExam ? ` (${p.gatingExamPolicy === "program-dependent" ? "program-dependent: verify the student's actual shortlist before recommending registration or preparation" : p.gatingExamReadiness === "requires-upperclass-standing" ? "only a realistic near-term priority once the student has upperclass standing; otherwise keep it long-range" : "eligible whenever"})` : ""}\n${p.keyTools.length > 0 ? `Tools to prioritize learning first for immediate resume leverage: ${p.keyTools.join(", ")}\n` : ""}Immediate resume builders that belong in Phase A regardless of any credential timeline:\n${p.immediateResumeBuilders.map((b) => `- ${b}`).join("\n")}\nNetworking specificity for this career: reach out to ${p.networkingTemplate.roles}, focused on ${p.networkingTemplate.focusAreas} - never just "network with people in the field".\nBanned generic phrases for this career: ${p.genericPhrasesToAvoid.map((g) => `"${g}"`).join(", ")}.`)
    .join("\n\n");

  return `Build a detailed, honest, phase-by-phase career acceleration roadmap for a student targeting ${isVersatile ? `${request.targetCareers.length} careers: ${targetList}` : `"${targetList}"`}.

You are given an authoritative, pre-computed gap analysis. Do not invent new gaps — explain and act on the ones given. Every phase and recommendation should trace back to closing one or more of these gaps, or to a genuine competitive advantage worth reinforcing. Each gap in the analysis below is tagged with which target career(s) it's relevant to — a gap tagged with more than one career is an overlap opportunity.

Student profile:
- Name: ${request.name || "Not provided"}
- Age: ${request.age ?? "Not provided"}
- Education stage: ${request.educationStage ?? "Not provided"}
- GPA: ${formatGpa(request.gpa)}
- Target industry: ${request.targetIndustry || "Not provided"}
- Education history: ${formatEducation(request)}
- Current skills: ${request.currentSkills.join(", ") || "None listed"}
- Interests: ${request.interests.join(", ") || "None listed"}
- Experience: ${formatExperience(request)}
- Projects: ${formatProjects(request)}
- Awards: ${formatAwards(request)}
- Certifications: ${formatCertifications(request)}
- Career goals: ${request.careerGoals || "Not provided"}
- Weekly hours available: ${request.weeklyHoursAvailable ?? "Not provided"}

Deterministic stage strategy (authoritative):
- Current position: ${stage.positionSummary}
- Immediate focus: ${stage.immediateFocus}
- Right-sized experience target: ${stage.experienceGoal}
- Application approach: ${stage.applicationApproach}
- Competitive edge after the baseline is covered: ${stage.competitiveEdge}
- Recommended scope for one substantial project at this stage: about ${stage.recommendedProjectHours} hours

Pre-computed gap analysis (authoritative — build on this, don't contradict it). Each gap is tagged with a priority AND a timeHorizon (immediate / near-term / long-term) computed from the student's actual stage and each credential's real eligibility rules — treat timeHorizon as an instruction about which phase it belongs in, not a suggestion:
${gapsBlock}

Target career competitiveness data:
${competitivenessBlock}
${playbooksBlock ? `\nDomain-specific expert playbooks for the student's target field(s) — use these to inject real, industry-standard milestones and concrete phrasing instead of generic advice:\n${playbooksBlock}` : ""}

Requirements:
- STAY ON THE STUDENT'S ACTUAL TARGET(S): never pivot toward a different field or industry than the one(s) the student named. Every recommendation must build real, field-appropriate competitiveness for ${isVersatile ? `${targetList}` : `"${targetList}"`}, whether that's engineering, software, law, medicine, business, policy, or any other legitimate professional or academic path.
${isVersatile
    ? `- VERSATILITY IS THE POINT: this student wants ONE resume that's competitive across all ${request.targetCareers.length} target careers, not ${request.targetCareers.length} separate disconnected plans. Actively prioritize skills, projects, and experience that count toward MORE THAN ONE target career, and call these out explicitly ("this project counts toward both X and Y"). Only recommend something narrowly specific to a single career when it's genuinely essential (e.g. a required credential); otherwise favor the highest-overlap path. The executiveSummary should state this strategy directly: what's shared across the targets, and what (if anything) is genuinely career-specific and can't be avoided.`
    : "- BE SPECIFIC, NOT GENERIC: reference the student's actual evidence by name."}
- Reference the student's actual evidence by name. Instead of "go deeper on one of your existing skills," say something like "your resume shows MATLAB experience but no evidence of Python-based data analysis, so spend time building a small Python data-analysis project relevant to [target field]." Every recommendation should name a specific missing skill, tool, project type, or experience relevant to the target career(s) it addresses, not abstract advice that could apply to any field.
- Include exactly 3 phases in this order: "academic-technical-edge", "experience-portfolio", "execution-interview". Each needs a "whyItMattersForTarget" explanation tying it to the specific career(s) it serves${isVersatile ? ", calling out when it serves more than one" : ""}.
- Every recommendedAction and milestone needs a realistic "estimatedHours" (a real number like 10, 20, 40, not a vague label) reflecting actual effort required. Also include tier ("must-do", "high-leverage", or "nice-to-have"), impact (1-5), effort (1-5), prerequisite (or null), whyItMatters, and evidenceOfCompletion. Take milestone "estimatedHours" especially seriously: the app sums each phase's milestone hours and divides by the student's weekly availability to compute that phase's actual calendar window, so an inflated or padded number directly distorts the schedule the student sees.
- Each phase's "timeline" field is a placeholder the app recalculates deterministically from milestone hours after you respond, so it is never shown to the student as-is. Fill it with any short, reasonable phrase (e.g. "Academic and technical groundwork") rather than guessing specific month numbers.
- Do not recommend certifications just because they sound impressive. Use the honest certification guidance given above, and prefer recommending a project or internship instead when that's genuinely more valuable. Only include certifications actually worth mentioning.
- Ground salary, competitiveness, and timeline claims in reality, don't oversell. The realityCheck field should cover concrete tradeoffs (entry-level competition, degree/grad-school expectations, internship importance, geographic flexibility, common misconceptions, what separates strong candidates from average ones) without fear-based language or invented statistics${isVersatile ? ", including the real tradeoff of pursuing versatility (e.g. some roles specifically want depth in one area, not breadth)" : ""}.
- Keep every list item concrete and actionable, not abstract advice.
- STAGE FIT IS NON-NEGOTIABLE: do not give a high-school student a college internship-volume campaign, tell an early undergraduate to spend months on a distant admissions test, tell a graduate student to make a beginner tutorial project, or tell a career changer to erase their prior experience. Use the deterministic stage strategy above. First restore missing foundations, then recommend one concrete, reviewable piece of work that shows stronger judgment or depth than a typical peer project.
- OPTIONAL OR PROGRAM-DEPENDENT TESTS: never tell the student to register or prepare until a requirement matrix for their actual shortlisted programs shows the test is required or strategically useful. Verification is the action; test prep is not the default.
- VALUE TEST: remove any recommendation whose only output is passive consumption, a generic certificate, an unreviewed tutorial, or application volume without fit. Every substantial task must produce skill, evidence, access, or meaningful application or interview readiness.

TITLES MUST BE POSITIVE ACTIONS, NEVER DIAGNOSES: every phase title, milestone title, and recommendedAction title must read as something the student goes and DOES, never as an audit finding pointing out what's missing or lacking. Banned patterns: "Missing X", "No X yet", "Lacking X", "X not demonstrated", "Weak X". Instead, name the concrete action with the specific thing involved: "Clear the FE Chemical Exam" instead of "Missing FE Exam credential"; "Build a Python-based distillation column simulation" instead of "No Python experience shown"; "Secure 2-3 informational chats with process engineers" instead of "No documented networking". The gaps given to you above are diagnostic input for your reasoning, not phrasing to copy into output titles.

TONE: write like a sharp, grounded senior engineer or mentor talking directly to the student, not like an AI assistant summarizing a report. Keep sentences plain, direct, and conversational. Do not use em dashes anywhere in the output. Do not force colons into titles or short phrases. Avoid corporate buzzwords and AI-cadence filler (leverage, synergy, holistic, dynamic, robust, tailored, unlock, elevate, delve, foster, streamline, in today's competitive landscape, it's important to note that). "whyItMatters" and "whyItMattersForTarget" should sound like a mentor explaining their reasoning, not a formal justification.

CONCRETE EVIDENCE AND RESOURCES, NOT PLACEHOLDERS: "evidenceOfCompletion" must name a specific, real, checkable artifact tied to the actual skill/action in that item and to the student's actual field, e.g. "a GitHub repo with a working demo link" for a coding-heavy field, "a polished legal memo or brief" for law, "a stock pitch or financial model" for finance, "a published policy brief" for policy work, "your FE exam registration confirmation", "a LinkedIn message thread with a reply from someone working in the field". Never use vague placeholders like "a document you can point to" or "evidence of the skill". Every "resources" entry must name a specific real tool, platform, or community the student can go use right now, matched to their actual field (e.g. "LeetCode" or "GitHub Pages" for coding fields, "Westlaw" or "LSAC" for law, "Bloomberg Terminal" or "Wall Street Prep" for finance, "Coursera", "Handshake", a relevant professional association's student chapter), never generic placeholders like "University career center" or "relevant open courseware".

MILESTONES AND RECOMMENDED ACTIONS ARE DIFFERENT LEVELS OF GRANULARITY, NEVER THE SAME TEXT: a milestone is the big, phase-level target the student is working toward, e.g. "Pass the FE Exam" or "Complete a process simulation project", with its own estimatedHours (the full target timeframe) and evidenceOfCompletion (the evidence that the target itself was reached). Each milestone needs 2-4 associated recommendedActions elsewhere in the same phase's recommendedActions array that are the granular, step-by-step operational tasks that actually get the student to that milestone, e.g. for "Pass the FE Exam": "Schedule 3 practice tests using NCEES official study materials", "Review mass-balance and thermodynamics problem sets", "Complete module 2 of your review course". A recommendedAction title must NEVER restate a milestone title verbatim or near-verbatim. If you catch yourself writing the same phrase for both, that phrase belongs at the milestone level and needs to be broken down into real sub-steps for the actions.

TEMPORAL PROXIMITY & ELIGIBILITY FILTER — DO NOT LET DISTANT CREDENTIALS DOMINATE PHASE A: a gap tagged "long-term" is structurally gated behind further progress the student hasn't made yet (a licensing exam that requires finishing school or years of work experience first, or an admissions test the student isn't upperclass yet for) — it belongs in Phase C ("execution-interview"), described as something to track for later, never as an urgent Phase A milestone, no matter how academically important the career data makes it sound. A gap tagged "near-term" (an admissions test the student IS eligible for now, an internship search, networking) belongs in Phase B. Only "immediate" gaps belong in Phase A. Getting this wrong looks like: telling a college freshman targeting law to spend Phase A prepping for the Bar Exam or LSAT — the Bar Exam requires finishing law school first (always Phase C, regardless of stage) and the LSAT isn't realistic until upperclass standing (Phase C if the student isn't there yet, Phase B once they are). Phase A must instead be built entirely from "immediate" gaps: real, resume-ready work the student can start today (projects, technical tools, foundational experience) — this is true for every field, not just technical ones.

STRATEGIC PHASING LOGIC: structure the three phases chronologically by what a candidate can actually act on, in this order — Phase A ("academic-technical-edge") is immediate resume-building and project/experience depth; Phase B ("experience-portfolio") is networking, momentum, and interview readiness; Phase C ("execution-interview") is long-range credential execution (when the timeline genuinely demands it) plus final application/interview execution. Never reorder this or blend a later phase's content into an earlier one just because it's easy to talk about.

DOMAIN-SPECIFIC PLAYBOOKS, NOT GENERIC ADVICE: use the playbooks given above to inject real, industry-standard milestones automatically — a Pre-Law roadmap must prioritize legal experience and a properly-phased LSAT timeline, Pre-Med must prioritize clinical hours and staged MCAT prep, Engineering must prioritize technical software and project depth before the FE Exam. Every milestone and action must reflect the specific nuances of that profession, not advice generic enough to paste into any other field's roadmap. If a field isn't covered by a playbook above, reason about its real industry norms directly using the same standard of specificity.

QUALITY GUARDRAIL — NO GENERIC OR SURFACE-LEVEL ADVICE: never write a vague action like "network with lawyers", "gain experience", "learn the field", or "build your skills". Every action must name the specific role, tool, exam, practice area, or artifact involved. Compare: BAD — "network with lawyers"; GOOD — "reach out to firm associates for informational interviews focusing on litigation practices". BAD — "gain clinical experience"; GOOD — "shadow an emergency medicine physician for 20 hours and log specific patient interactions you observed". If a title or whyItMatters could be pasted unchanged into a roadmap for a different career, rewrite it until it couldn't be.`;
}

export async function generateRoadmapWithAI(
  request: RoadmapRequest,
  resolvedCareers: ResolvedCareer[],
  gapAnalysis: GapAnalysis,
): Promise<AIRoadmapContent | null> {
  try {
    const result = await requestStructuredAI({
      feature: "roadmap-generation",
      schema: AIRoadmapContentSchema,
      toolSchema: AI_ROADMAP_JSON_SCHEMA,
      toolName: TOOL_NAME,
      toolDescription: "Generate a structured career acceleration roadmap.",
      prompt: buildPrompt(request, resolvedCareers, gapAnalysis),
      maxTokens: 8000,
      timeoutMs: 35_000,
    });
    return result.data;
  } catch {
    return null;
  }
}
