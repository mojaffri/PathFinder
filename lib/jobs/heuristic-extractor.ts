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

const REQUIRED_HEADERS = ["REQUIREMENTS", "QUALIFICATIONS", "MINIMUM QUALIFICATIONS", "WHAT YOU NEED", "MUST HAVE", "MUST HAVES", "BASIC QUALIFICATIONS"];
const PREFERRED_HEADERS = ["PREFERRED QUALIFICATIONS", "PREFERRED", "NICE TO HAVE", "NICE TO HAVES", "BONUS", "BONUS POINTS", "PLUS"];
const RESPONSIBILITY_HEADERS = ["RESPONSIBILITIES", "WHAT YOU'LL DO", "WHAT YOULL DO", "DUTIES", "THE ROLE", "ABOUT THE ROLE", "KEY RESPONSIBILITIES"];
const STOP_HEADERS = ["BENEFITS", "PERKS", "ABOUT US", "ABOUT THE COMPANY", "COMPENSATION", "HOW TO APPLY", "EQUAL OPPORTUNITY"];

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

export function extractJobDataHeuristically(rawText: string): JobExtraction {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim());

  const firstNonEmpty = lines.find((l) => l.length > 0) ?? "";
  const title = firstNonEmpty.length > 0 && firstNonEmpty.length < 100 ? firstNonEmpty : null;

  const companyMatch = rawText.match(/\bat\s+([A-Z][A-Za-z0-9&.,' -]{1,60})(?=[\s,.\n]|$)/);
  const company = companyMatch ? companyMatch[1].trim() : null;

  type Section = "required" | "preferred" | "responsibilities" | "skip" | null;
  let currentSection: Section = null;

  const requirementLines: string[] = [];
  const preferredLines: string[] = [];
  const responsibilityLines: string[] = [];

  for (const line of lines) {
    const header = normalizeHeader(line);
    if (header.length > 0) {
      if (REQUIRED_HEADERS.includes(header)) {
        currentSection = "required";
        continue;
      }
      if (PREFERRED_HEADERS.includes(header)) {
        currentSection = "preferred";
        continue;
      }
      if (RESPONSIBILITY_HEADERS.includes(header)) {
        currentSection = "responsibilities";
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

  // If no explicit "Requirements" heading was found, fall back to scanning
  // the whole document for skill keywords rather than returning nothing.
  const requirementSearchText = requirementLines.length > 0 ? requirementLines.join(" ") : rawText;
  const preferredSearchText = preferredLines.join(" ");

  function keywordRequirements(text: string, category: "required" | "preferred"): JobRequirementExtraction[] {
    return SKILL_KEYWORDS.filter((skill) => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?<![A-Za-z0-9+#])${escaped}(?![A-Za-z0-9+#])`, "i").test(text);
    }).map((skill) => ({
      category,
      kind: TOOL_SET.has(skill.toLowerCase()) ? "tool" : "skill",
      label: skill,
      minYears: null,
    }));
  }

  const requirements = dedupeRequirements([
    ...keywordRequirements(requirementSearchText, "required"),
    ...keywordRequirements(preferredSearchText, "preferred"),
  ]);

  const minExperienceYears = findYears(requirementSearchText);
  const preferredExperienceYears = findYears(preferredSearchText);
  const educationRequirement = extractEducationRequirement(rawText);

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
