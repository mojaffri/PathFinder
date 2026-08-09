import type { RoadmapRequest } from "./schema";
import type { ResolvedCareer, ResumeBenchmarkItem, TargetResumeBenchmark } from "@/types";

function evidenceTargets(career: NonNullable<ResolvedCareer["career"]>): { experience: string; work: string; roleSuffix: string; organization: string } {
  if (career.category === "healthcare") return {
    experience: "Sustained, supervised clinical exposure plus the prerequisites required by your target programs",
    work: "1-2 substantial clinical, service, research, or quality-improvement contributions with verified outcomes",
    roleSuffix: "Experience target",
    organization: "[Target clinic, hospital, lab, community organization, or training program]",
  };
  if (career.category === "law") return {
    experience: "Relevant legal, policy, advocacy, research, or client-service experience with strong writing evidence",
    work: "2-3 polished writing, research, case-analysis, or advocacy samples appropriate to your current stage",
    roleSuffix: "Experience target",
    organization: "[Target legal, policy, government, nonprofit, or research organization]",
  };
  if (career.category === "science-research" || career.category === "biotech-life-sciences") return {
    experience: "Sustained research or laboratory experience with a clearly owned contribution",
    work: "1-2 rigorous studies, posters, analyses, protocols, or reproducible research artifacts",
    roleSuffix: "Research target",
    organization: "[Target lab, research group, institute, or science employer]",
  };
  if (career.category === "humanities-social-sciences") return {
    experience: "Relevant field, research, policy, communications, public-service, or community experience",
    work: "2-3 decision-ready writing, research, campaign, reporting, or policy samples with real audiences",
    roleSuffix: "Experience target",
    organization: "[Target newsroom, agency, government office, nonprofit, research group, or community partner]",
  };
  return {
    experience: /essential|mandatory|close to|strongly/i.test(career.internshipExpectations)
      ? "1-2 relevant internships, co-ops, or equivalent results-bearing experiences"
      : "1 relevant internship or equivalent hands-on experience",
    work: "2-3 strong, non-tutorial work samples (depth and external validation over quantity)",
    roleSuffix: "Experience target",
    organization: "[Target employer, client, lab, or partner organization]",
  };
}

/**
 * Deterministic "current vs. target" resume benchmark. Placeholders use
 * bracket markers (e.g. "[Quantified outcome to capture]") specifically so
 * nothing here reads as an invented, already-achieved fact — the student
 * fills these in with their own real results.
 *
 * With multiple target careers, the "target" side synthesizes across all of
 * them — skills/tools that show up for more than one target career are
 * surfaced first, since demonstrating those is what actually builds a
 * versatile resume rather than one that's diluted across unrelated paths.
 */
export function buildTargetResumeBenchmark(request: RoadmapRequest, resolvedCareers: ResolvedCareer[]): TargetResumeBenchmark {
  const withCareer = resolvedCareers.filter((rc): rc is { title: string; career: NonNullable<ResolvedCareer["career"]> } => rc.career !== null);
  const comparisons: ResumeBenchmarkItem[] = [];
  const primaryEvidence = withCareer[0] ? evidenceTargets(withCareer[0].career) : null;

  comparisons.push({
    label: "Experience",
    current: request.experience.length > 0 ? `${request.experience.length} experience entr${request.experience.length === 1 ? "y" : "ies"}` : "No internship yet",
    target: primaryEvidence?.experience ?? "One relevant, results-bearing experience",
  });

  comparisons.push({
    label: "Projects",
    current: request.projects.length > 0 ? `${request.projects.length} project(s)` : "No projects yet",
    target: withCareer.length > 1
      ? `${primaryEvidence?.work ?? "2-3 strong work samples"}; include one that demonstrates skills shared across your targets`
      : primaryEvidence?.work ?? "2-3 strong work samples (depth over quantity)",
  });

  const skillCounts = new Map<string, number>();
  for (const { career } of withCareer) {
    for (const skill of career.highValueSkills) {
      skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1);
    }
  }
  const rankedSkills = [...skillCounts.entries()].sort((a, b) => b[1] - a[1]).map(([skill]) => skill);

  comparisons.push({
    label: "Skills",
    current: request.currentSkills.length > 0 ? request.currentSkills.slice(0, 4).join(", ") : "No skills listed yet",
    target: rankedSkills.length > 0 ? rankedSkills.slice(0, 4).join(" + ") : "A focused, demonstrable skill set for your target field",
  });

  const certCounts = new Map<string, number>();
  for (const { career } of withCareer) {
    for (const cert of career.certifications) {
      if (cert.recommend) certCounts.set(cert.name, (certCounts.get(cert.name) ?? 0) + 1);
    }
  }
  const rankedCerts = [...certCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  if (rankedCerts.length > 0) {
    comparisons.push({
      label: "Certifications",
      current: request.certifications.length > 0 ? request.certifications.map((c) => c.name).join(", ") : "None yet",
      target: rankedCerts.join(", "),
    });
  }

  const roleTitle = withCareer[0]?.career.commonEntryLevelRoles[0] ?? "Entry-Level Role";
  const topSkills = rankedSkills.slice(0, 3);
  const toolCounts = new Map<string, number>();
  for (const { career } of withCareer) {
    for (const tool of career.commonTools) {
      toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + 1);
    }
  }
  const rankedTools = [...toolCounts.entries()].sort((a, b) => b[1] - a[1]).map(([tool]) => tool);

  return {
    comparisons,
    targetExperience: {
      roleTitle: `${roleTitle} — ${primaryEvidence?.roleSuffix ?? "Experience target"}`,
      organizationPlaceholder: primaryEvidence?.organization ?? "[Target organization]",
      timeframePlaceholder: "[Target summer/semester]",
      bullets: [
        `[Achievement you should aim to produce], using ${topSkills[0] ?? "your core technical skill"}`,
        `[Technical responsibility you should seek out], applying ${topSkills[1] ?? "a relevant tool"}`,
        "[Quantified outcome to capture], replace with a real number once you have one",
      ],
    },
    targetProjects: [
      {
        title: topSkills[0]
          ? `A project demonstrating ${topSkills[0]}${withCareer.length > 1 && skillCounts.get(topSkills[0])! > 1 ? " (valued across multiple of your target careers)" : ""}`
          : "A focused, real-world project",
        tools: rankedTools.slice(0, 4),
        bullets: [
          "[Problem the project solves], pick something real, not a tutorial clone",
          `[What you built], using ${topSkills.join(", ") || "relevant tools"}`,
          "[Outcome or result you can quantify or demo]",
        ],
      },
    ],
    instructions:
      "These are placeholders, not achievements you already have. Complete the roadmap's phases and replace each bracketed placeholder with your real, honest outcome as you earn it.",
  };
}
