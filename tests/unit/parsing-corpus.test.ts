import { describe, expect, it } from "vitest";
import { extractJobDataHeuristically } from "@/lib/jobs/heuristic-extractor";
import { JobExtractionSchema } from "@/lib/jobs/schema";
import { extractResumeDataHeuristically } from "@/lib/resume/heuristic-extractor";
import { ResumeExtractionSchema } from "@/lib/resume/schema";

const RESUME_HEADINGS = [
  ["WORK EXPERIENCE", "PROJECTS", "EDUCATION", "TECHNICAL SKILLS", "CERTIFICATIONS", "AWARDS"],
  ["CAREER HISTORY", "PORTFOLIO", "ACADEMIC BACKGROUND", "CORE COMPETENCIES", "CREDENTIALS", "HONORS & DISTINCTIONS"],
  ["PROFESSIONAL BACKGROUND", "RELEVANT PROJECTS", "EDUCATION & TRAINING", "TOOLS & TECHNOLOGIES", "LICENSES & CERTIFICATIONS", "AWARDS & DISTINCTIONS"],
] as const;
const ENTRY_SEPARATORS = [" | ", " — ", " – "] as const;
const DATE_SEPARATORS = [" - ", " – ", " to "] as const;
const BULLETS = ["- ", "• ", "◦ "] as const;

function generatedResume(index: number): string {
  const headings = RESUME_HEADINGS[index % RESUME_HEADINGS.length];
  const separator = ENTRY_SEPARATORS[Math.floor(index / 3) % ENTRY_SEPARATORS.length];
  const dateSeparator = DATE_SEPARATORS[Math.floor(index / 9) % DATE_SEPARATORS.length];
  const bullet = BULLETS[Math.floor(index / 27) % BULLETS.length];
  const endDate = Math.floor(index / 81) % 2 === 0 ? "Present" : "Current";
  const sections = [
    `${headings[0]}\nSoftware Engineer Intern${separator}Northstar Labs${separator}Austin, TX${separator}Jun 2024${dateSeparator}${endDate}\n${bullet}Built Python and SQL services for a production analytics workflow.`,
    `${headings[1]}\nPathFinder Portfolio\nhttps://github.com/example/pathfinder\n${bullet}Developed a TypeScript roadmap engine with React.`,
    `${headings[2]}\nLakeview University | Bachelor of Science in Computer Science | GPA: 3.8 | 2022${dateSeparator}2026`,
    `${headings[3]}\nLanguages: Python; SQL; TypeScript\nFrameworks: React | Node.js`,
    `${headings[4]}\nAWS Certified Cloud Practitioner | Amazon Web Services | 2025`,
    `${headings[5]}\n${bullet}Dean's List | Lakeview University | 2024`,
  ];
  const rotation = Math.floor(index / 6) % sections.length;
  return [...sections.slice(rotation), ...sections.slice(0, rotation)].join("\n\n");
}

describe("deterministic resume layout corpus", () => {
  for (let index = 0; index < 162; index++) {
    it(`sorts generated resume variant ${index + 1} into the correct sections`, () => {
      const result = extractResumeDataHeuristically(generatedResume(index));
      expect(ResumeExtractionSchema.safeParse(result).success).toBe(true);
      expect(result.experience).toHaveLength(1);
      expect(result.experience[0]).toMatchObject({
        title: "Software Engineer Intern",
        organization: "Northstar Labs",
        location: "Austin, TX",
        startDate: "Jun 2024",
      });
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].title).toBe("PathFinder Portfolio");
      expect(result.projects[0].githubUrl).toBe("https://github.com/example/pathfinder");
      expect(result.education[0]).toMatchObject({
        institution: "Lakeview University",
        degree: "Bachelor of Science",
        major: "Computer Science",
        gpa: 3.8,
      });
      expect(result.certifications[0]).toMatchObject({
        name: "AWS Certified Cloud Practitioner",
        issuer: "Amazon Web Services",
        date: "2025",
      });
      expect(result.awards[0]?.name).toBe("Dean's List");
      expect(result.skills).toEqual(expect.arrayContaining(["Python", "SQL", "TypeScript", "React", "Node.js"]));
    });
  }

  it("sorts stacked organization, title, location, and date lines", () => {
    const result = extractResumeDataHeuristically(`WORK HISTORY
Northstar Labs
Software Engineer Intern
Austin, TX
June 2024 to Current
• Built production services.
EDUCATION
Bachelor of Science in Mechanical Engineering
Lakeview University
2022 to 2026
GPA: 3.7
SKILLS
Python / SQL / MATLAB`);
    expect(result.experience[0]).toMatchObject({
      title: "Software Engineer Intern",
      organization: "Northstar Labs",
      location: "Austin, TX",
      startDate: "June 2024",
      endDate: "Current",
    });
    expect(result.education[0]).toMatchObject({
      institution: "Lakeview University",
      degree: "Bachelor of Science",
      major: "Mechanical Engineering",
      startDate: "2022",
      endDate: "2026",
      gpa: 3.7,
    });
    expect(result.skills).toEqual(expect.arrayContaining(["Python", "SQL", "MATLAB"]));
  });
});

const JOB_HEADINGS = [
  ["Requirements", "Preferred qualifications", "Responsibilities"],
  ["What you bring", "Nice to have", "Your impact"],
  ["Candidate profile", "Desired qualifications", "What you will do"],
] as const;

function generatedJob(index: number): string {
  const headings = JOB_HEADINGS[index % JOB_HEADINGS.length];
  const inline = index % 2 === 0;
  const companyHeader = index % 3 === 0
    ? "Company: Northstar Labs\nJob title: Backend Software Engineer"
    : "Backend Software Engineer\nWe are hiring at Northstar Labs for our platform team.";
  const required = inline
    ? `${headings[0]}: 3+ years of experience with Python, SQL, and PostgreSQL`
    : `${headings[0]}\n- 3+ years of experience with Python\n- Strong SQL and PostgreSQL knowledge`;
  const preferred = inline
    ? `${headings[1]}: AWS and Docker experience`
    : `${headings[1]}\n- AWS experience\n- Familiarity with Docker`;
  const responsibilities = inline
    ? `${headings[2]}: Build and maintain backend services`
    : `${headings[2]}\n- Build and maintain backend services`;
  return `${companyHeader}\n\n${required}\n\n${preferred}\n\n${responsibilities}\n\nBenefits\nHealth coverage`;
}

describe("deterministic job-posting layout corpus", () => {
  for (let index = 0; index < 18; index++) {
    it(`sorts generated job-posting variant ${index + 1} into the correct sections`, () => {
      const result = extractJobDataHeuristically(generatedJob(index));
      expect(JobExtractionSchema.safeParse(result).success).toBe(true);
      expect(result.title).toBe("Backend Software Engineer");
      expect(result.company).toBe("Northstar Labs");
      expect(result.minExperienceYears).toBe(3);
      expect(result.requirements.find((item) => item.label === "Python")?.category).toBe("required");
      expect(result.requirements.find((item) => item.label === "PostgreSQL")?.category).toBe("required");
      expect(result.requirements.find((item) => item.label === "AWS")?.category).toBe("preferred");
      expect(result.requirements.find((item) => item.label === "Docker")?.category).toBe("preferred");
      expect(result.requirements.find((item) => item.kind === "experience")).toMatchObject({ minYears: 3 });
      expect(result.responsibilities).toContain("Build and maintain backend services");
    });
  }

  it("uses sentence-level qualifiers when a posting has no section headings", () => {
    const result = extractJobDataHeuristically(`Data Engineer\nOrganization: Meridian Health\nYou must be proficient in Python and SQL.\nAWS would be a plus.\nDocker experience is nice to have.`);
    expect(result.requirements.find((item) => item.label === "Python")?.category).toBe("required");
    expect(result.requirements.find((item) => item.label === "SQL")?.category).toBe("required");
    expect(result.requirements.find((item) => item.label === "AWS")?.category).toBe("preferred");
    expect(result.requirements.find((item) => item.label === "Docker")?.category).toBe("preferred");
  });

  it("does not turn technologies mentioned only in responsibilities into qualifications", () => {
    const result = extractJobDataHeuristically(`Software Engineer
Company: Northstar Labs
Qualifications
- Strong communication skills
Responsibilities
- Build Python services on AWS
- Maintain PostgreSQL databases`);
    expect(result.requirements.find((item) => item.label === "Communication")?.category).toBe("required");
    expect(result.requirements.some((item) => item.label === "Python")).toBe(false);
    expect(result.requirements.some((item) => item.label === "AWS")).toBe(false);
    expect(result.requirements.some((item) => item.label === "PostgreSQL")).toBe(false);
  });

  it("keeps a preferred degree from becoming the minimum education requirement", () => {
    const result = extractJobDataHeuristically(`Product Analyst
Company: Northstar Labs
SQL proficiency is required.
A bachelor's degree is preferred.`);
    expect(result.educationRequirement).toBeNull();
    expect(result.requirements.find((item) => item.kind === "education")?.category).toBe("preferred");
  });
});
