import assert from "node:assert/strict";
import test from "node:test";
import { CAREERS } from "../data/careers";
import { analyzeGaps, deriveTopMoves } from "../lib/gap-analysis/engine";
import { generateFallbackRoadmap } from "../lib/roadmap/fallback";
import { computePhaseTimelines } from "../lib/roadmap/pacing";
import { resolvePlaybookForCareer } from "../lib/roadmap/playbooks";
import type { RoadmapRequest } from "../lib/roadmap/schema";
import { credentialHorizonForStage, getStageStrategy } from "../lib/roadmap/stage-strategy";
import { EDUCATION_STAGES, type EducationStage } from "../types/profile";
import { resolveCareers } from "../types/career";

function requestFor(careerTitle: string, educationStage: EducationStage, major: string): RoadmapRequest {
  return {
    name: "Roadmap Test",
    age: null,
    educationStage,
    school: "",
    major,
    gpa: { raw: null, scale: "4.0", normalized4: null },
    education: [],
    targetIndustry: "",
    targetCareers: [careerTitle],
    currentSkills: [],
    interests: [],
    experience: [],
    projects: [],
    awards: [],
    certifications: [],
    careerGoals: "",
    weeklyHoursAvailable: 6,
  };
}

test("phase timelines are contiguous and do not overstate one-month phases", () => {
  assert.deepEqual(computePhaseTimelines([20, 40, 20], 5), ["Month 1", "Months 2-3", "Month 4"]);
});

test("every supported career has a complete, specific playbook", () => {
  assert.equal(CAREERS.length, 46);
  for (const career of CAREERS) {
    const playbook = resolvePlaybookForCareer(career);
    assert.equal(playbook.field, career.title, career.id);
    assert.ok(playbook.immediateResumeBuilders.length >= 3, `${career.id} needs at least three resume builders`);
    assert.ok(playbook.keyTools.every((tool) => tool.trim().length > 0), `${career.id} has a blank prioritized tool`);
    assert.ok(playbook.keyTools.length <= 4, `${career.id} should prioritize rather than dump a tool list`);
    assert.ok(playbook.networkingTemplate.roles.trim().length > 5, `${career.id} needs specific networking roles`);
    assert.ok(playbook.networkingTemplate.focusAreas.trim().length > 8, `${career.id} needs specific networking focus`);
  }
});

test("stage strategy covers every education stage and gates distant credentials", () => {
  for (const { value } of EDUCATION_STAGES) {
    const strategy = getStageStrategy(value);
    assert.notEqual(strategy.group, "unknown", value);
    assert.ok(strategy.recommendedProjectHours >= 18 && strategy.recommendedProjectHours <= 50, value);
  }
  assert.equal(credentialHorizonForStage("requires-upperclass-standing", "high-school-senior"), "long-term");
  assert.equal(credentialHorizonForStage("requires-upperclass-standing", "college-freshman"), "long-term");
  assert.equal(credentialHorizonForStage("requires-upperclass-standing", "college-junior"), "near-term");
  assert.equal(credentialHorizonForStage("requires-program-completion", "career-changer"), "long-term");
});

test("every career and stage produces actionable, paced fallback guidance", () => {
  for (const career of CAREERS) {
    for (const { value: stage } of EDUCATION_STAGES) {
      const major = stage.startsWith("high-school-") || stage === "recent-hs-grad-gap-year" ? "" : career.commonMajors[0] ?? "";
      const request = requestFor(career.title, stage, major);
      const resolved = resolveCareers(CAREERS, request.targetCareers);
      const analysis = analyzeGaps(request, resolved);
      assert.ok(analysis.gaps.length >= 2, `${career.id}/${stage} produced too little guidance`);

      for (const gap of analysis.gaps) {
        assert.ok(gap.estimatedHours > 0, `${career.id}/${stage}/${gap.title} has no time estimate`);
        assert.ok(gap.tacticalActions.length > 0, `${career.id}/${stage}/${gap.title} has no actions`);
        const actionHours = gap.tacticalActions.reduce((sum, action) => sum + action.estimatedHours, 0);
        assert.equal(actionHours, gap.estimatedHours, `${career.id}/${stage}/${gap.title} hours do not match its actions`);
        assert.ok(gap.evidenceOfCompletion.length >= 20, `${career.id}/${stage}/${gap.title} lacks checkable evidence`);
      }

      const topMoves = deriveTopMoves(analysis);
      assert.equal(topMoves.length, 3, `${career.id}/${stage} should have three prioritized moves`);
      const fallback = generateFallbackRoadmap(request, resolved, analysis);
      assert.equal(fallback.phases.length, 3, `${career.id}/${stage} should have three phases`);
      assert.ok(fallback.phases.every((phase) => phase.milestones.length > 0), `${career.id}/${stage} has an empty phase`);

      const text = JSON.stringify({ analysis, fallback });
      assert.doesNotMatch(text, /PCAT/i, `${career.id}/${stage} references a retired exam`);
      if (stage.startsWith("high-school-") || stage === "recent-hs-grad-gap-year") {
        assert.doesNotMatch(text, /register for and study for the (LSAT|MCAT|DAT|GRE|FE)/i, `${career.id}/${stage} schedules premature test prep`);
        assert.doesNotMatch(text, /20\+ employers/i, `${career.id}/${stage} receives a college-style application campaign`);
      }
      if (stage === "career-changer") {
        assert.doesNotMatch(text, /Declare a major or field of study/i, `${career.id}/${stage} ignores prior education`);
      }
    }
  }
});

test("program-dependent exams trigger requirement verification instead of automatic registration", () => {
  for (const careerId of ["robotics-engineer", "physician-assistant", "physical-therapist", "research-scientist-physical-sciences"]) {
    const career = CAREERS.find((candidate) => candidate.id === careerId);
    assert.ok(career, careerId);
    const request = requestFor(career.title, "college-junior", career.commonMajors[0] ?? "");
    const resolved = resolveCareers(CAREERS, [career.title]);
    const text = JSON.stringify(analyzeGaps(request, resolved));
    assert.match(text, /verify whether each shortlisted program actually requires or values/i, careerId);
    assert.doesNotMatch(text, /test registration confirmation and a score report/i, careerId);
  }
});

test("users with baseline evidence receive a get-ahead selection signal", () => {
  const career = CAREERS.find((candidate) => candidate.id === "software-engineer");
  assert.ok(career);
  const request = requestFor(career.title, "college-sophomore", career.commonMajors[0]);
  request.projects = [{ id: "p", title: "Course project", technologies: ["JavaScript"], date: null, summary: null, bullets: ["Built a class assignment"] }];
  const analysis = analyzeGaps(request, resolveCareers(CAREERS, [career.title]));
  const edge = analysis.gaps.find((gap) => gap.title.includes("hard-to-copy selection signal"));
  assert.ok(edge);
  assert.match(edge.description, /not another completion certificate/i);
  assert.equal(edge.tacticalActions.reduce((sum, action) => sum + action.estimatedHours, 0), edge.estimatedHours);
});
