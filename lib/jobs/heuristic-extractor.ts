import type { JobExtraction, JobRequirementExtraction } from "./schema";

/**
 * Regex/keyword job-description extraction, used when no Anthropic API key
 * is configured or the AI extraction call fails after retries. Deliberately
 * simple and conservative — real job postings vary too much in structure to
 * parse with total confidence heuristically, which is exactly why extracted
 * requirements always go through an editable review step before being
 * trusted (same contract as `lib/resume/heuristic-extractor.ts`).
 */

const SKILL_KEYWORDS = [
  "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust", "SQL", "R",
  "React", "Angular", "Vue", "Node.js", "Django", "Flask", "Spring", "Ruby", "Ruby on Rails",
  "AWS", "Azure", "Google Cloud", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD",
  "Git", "Linux", "REST", "GraphQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka",
  "Machine Learning", "TensorFlow", "PyTorch", "Data Analysis", "Pandas", "NumPy",
  "Excel", "Tableau", "Power BI", "Salesforce", "SAP", "Jira", "Agile", "Scrum",
  "Figma", "HTML", "CSS", "Swift", "Kotlin", "Communication", "Leadership", "Project Management",
];

const TOOL_SET = new Set([
  "aws", "azure", "google cloud", "gcp", "docker", "kubernetes", "terraform", "git", "postgresql",
  "mysql", "mongodb", "redis", "kafka", "tensorflow", "pytorch", "excel", "tableau", "power bi",
  "salesforce", "sap", "jira", "figma", "react", "angular", "vue", "node.js", "django", "flask", "spring",
]);

const REQUIRED_HEADERS = ["REQUIREMENTS", "REQUIRED SKILLS", "QUALIFICATIONS", "MINIMUM QUALIFICATIONS", "WHAT YOU NEED", "WHAT YOU BRING", "YOU BRING", "WHO YOU ARE", "MUST HAVE", "MUST HAVES", "BASIC QUALIFICATIONS", "CANDIDATE PROFILE"];
const PREFERRED_HEADERS = ["PREFERRED QUALIFICATIONS", "PREFERRED SKILLS", "PREFERRED", "DESIRED QUALIFICATIONS", "NICE TO HAVE", "NICE TO HAVES", "BONUS", "BONUS POINTS", "PLUS"];
const RESPONSIBILITY_HEADERS = ["RESPONSIBILITIES", "WHAT YOU'LL DO", "WHAT YOULL DO", "WHAT YOU WILL DO", "DUTIES", "YOUR IMPACT", "THE ROLE", "ABOUT THE ROLE", "KEY RESPONSIBILITIES"];
const STOP_HEADERS = ["BENEFITS", "PERKS", "ABOUT US", "ABOUT THE COMPANY", "COMPENSATION", "SALARY", "HOW TO APPLY", "EQUAL OPPORTUNITY", "EEO STATEMENT"];

function normalizeHeader(line: string): string {
  return line.toUpperCase().replace(/[^A-Z\s]/g, "").replace(/\s+/g, " ").trim();
}

function stripBullet(line: string): string {
  return line.replace(/^[-•*◦]\s*/, "").trim();
}

const YEARS_RE = /(\d+)\+?\s*(?:to\s*\d+\s*)?years?/i;

function findYears(text: string): number | null {
  const match = text.match(YEARS_RE);
  return match ? Number(match[1]) : null;
}

function extractEducationRequirement(text: string): string | null {
  const match = text.match(
    /\b((?:bachelor|master|associate|ph\.?d|doctorate)'?s?[^.\n]{0,60}(?:degree)?[^.\n]{0,40})/i,
  );
  return match ? match[0].trim().replace(/\s+/g, " ") : null;
}

function dedupeRequirements(items: JobRequirementExtraction[]): JobRequirementExtraction[] {
  const byKey = new Map<string, JobRequirementExtraction>();
  for (const item of items) {
    const key = item.label.toLowerCase();
    const existing = byKey.get(key);
    // required beats preferred if the same item shows up in both sections.
    if (!existing || (existing.category === "preferred" && item.category === "required")) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

function headingMatch(line: string): { header: string; remainder: string } {
  const delimiter = line.match(/^(.{2,55}?)(?:\s*:\s*|\s+[–—-]\s+)(.+)$/);
  if (!delimiter) return { header: normalizeHeader(line), remainder: "" };
  return { header: normalizeHeader(delimiter[1]), remainder: delimiter[2].trim() };
}

function looksLikeJobTitle(line: string): boolean {
  return /\b(?:engineer|developer|analyst|scientist|designer|manager|consultant|specialist|intern|co-?op|researcher|architect|technician|associate|director)\b/i.test(line);
}

function skillRequirements(lines: string[], category: "required" | "preferred"): JobRequirementExtraction[] {
  return lines.flatMap((line) => SKILL_KEYWORDS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![A-Za-z0-9+#])${escaped}(?![A-Za-z0-9+#])`, "i").test(line);
  }).map((skill) => ({
    category,
    kind: TOOL_SET.has(skill.toLowerCase()) ? "tool" as const : "skill" as const,
    label: skill,
    minYears: null,
  })));
}

export function extractJobDataHeuristically(rawText: string): JobExtraction {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim());

  const firstLines = lines.filter(Boolean).slice(0, 8);
  const labeledTitle = rawText.match(/^\s*(?:job\s+)?title\s*:\s*(.+)$/im)?.[1]?.trim() ?? null;
  const titleCandidate = labeledTitle ?? firstLines.find((line) => line.length < 100 && looksLikeJobTitle(line)) ?? firstLines[0] ?? "";
  const title = titleCandidate.length > 0 && titleCandidate.length < 100 ? titleCandidate : null;

  const labeledCompany = rawText.match(/^\s*(?:company|organization)\s*:\s*(.+)$/im)?.[1]?.trim() ?? null;
  const companyMatch = rawText.match(/\bat\s+([A-Z][A-Za-z0-9&.,' -]{1,60}?)(?=\s+(?:is|seeks|for|on|to|we)|[,.\n]|$)/);
  const company = labeledCompany ?? (companyMatch ? companyMatch[1].trim() : null);

  type Section = "required" | "preferred" | "responsibilities" | "skip" | null;
  let currentSection: Section = null;

  const requirementLines: string[] = [];
  const preferredLines: string[] = [];
  const responsibilityLines: string[] = [];
  let foundRequiredHeader = false;

  for (const line of lines) {
    const { header, remainder } = headingMatch(line);
    if (header.length > 0) {
      if (REQUIRED_HEADERS.includes(header)) {
        currentSection = "required";
        foundRequiredHeader = true;
        if (remainder) requirementLines.push(remainder);
        continue;
      }
      if (PREFERRED_HEADERS.includes(header)) {
        currentSection = "preferred";
        if (remainder) preferredLines.push(remainder);
        continue;
      }
      if (RESPONSIBILITY_HEADERS.includes(header)) {
        currentSection = "responsibilities";
        if (remainder) responsibilityLines.push(stripBullet(remainder));
        continue;
      }
      if (STOP_HEADERS.includes(header)) {
        currentSection = "skip";
        continue;
      }
    }

    if (!line || currentSection === null || currentSection === "skip") continue;
    if (currentSection === "required") requirementLines.push(line);
    else if (currentSection === "preferred") preferredLines.push(line);
    else if (currentSection === "responsibilities") responsibilityLines.push(stripBullet(line));
  }

  // Unheaded postings often express qualifications in prose. Classify each
  // line by its own language so "AWS is a plus" never becomes a must-have.
  if (!foundRequiredHeader) {
    for (const line of lines) {
      const hasSkill = SKILL_KEYWORDS.some((skill) => line.toLowerCase().includes(skill.toLowerCase()));
      const hasEducationOrExperience = /\b(?:bachelor|master|associate|ph\.?d|doctorate)'?s?\b|\b\d+\+?\s+years?\b/i.test(line);
      if (!hasSkill && !hasEducationOrExperience) continue;
      if (/\b(?:preferred|nice to have|bonus|a plus|desirable|ideally|advantage)\b/i.test(line)) preferredLines.push(line);
      else if (!/\b(?:build|develop|design|maintain|collaborate|lead|support|deliver|responsible for)\b/i.test(line)) requirementLines.push(line);
    }
  }

  const requirementSearchText = requirementLines.join(" ");
  const preferredSearchText = preferredLines.join(" ");

  const minExperienceYears = findYears(requirementSearchText);
  const preferredExperienceYears = findYears(preferredSearchText);
  const educationRequirement = extractEducationRequirement(requirementSearchText);
  const preferredEducationRequirement = extractEducationRequirement(preferredSearchText);
  const requirements = dedupeRequirements([
    ...skillRequirements(requirementLines, "required"),
    ...skillRequirements(preferredLines, "preferred"),
    ...(minExperienceYears === null ? [] : [{ category: "required" as const, kind: "experience" as const, label: `${minExperienceYears}+ years of experience`, minYears: minExperienceYears }]),
    ...(preferredExperienceYears === null ? [] : [{ category: "preferred" as const, kind: "experience" as const, label: `${preferredExperienceYears}+ years of experience`, minYears: preferredExperienceYears }]),
    ...(educationRequirement === null ? [] : [{ category: "required" as const, kind: "education" as const, label: educationRequirement, minYears: null }]),
    ...(preferredEducationRequirement === null ? [] : [{ category: "preferred" as const, kind: "education" as const, label: preferredEducationRequirement, minYears: null }]),
  ]);

  const keywordsFound = new Set(requirements.map((r) => r.label.toLowerCase()));
  const keywords = SKILL_KEYWORDS.filter((s) => !keywordsFound.has(s.toLowerCase()) && new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(rawText)).slice(0, 15);

  const sectionsFound = [requirementLines.length > 0, preferredLines.length > 0, responsibilityLines.length > 0].filter(Boolean).length;
  const extractionConfidence: JobExtraction["extractionConfidence"] =
    rawText.trim().length < 200
      ? "low"
      : sectionsFound >= 2 && requirements.length >= 3
        ? "high"
        : sectionsFound >= 1 || requirements.length >= 1
          ? "medium"
          : "low";

  return {
    title,
    company,
    minExperienceYears,
    preferredExperienceYears,
    educationRequirement,
    responsibilities: responsibilityLines.filter((l) => l.length > 3).slice(0, 15),
    keywords,
    requirements: requirements.slice(0, 40),
    extractionConfidence,
  };
}
