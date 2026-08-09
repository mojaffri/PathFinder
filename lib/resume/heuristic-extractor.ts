import type { ResumeExtraction } from "./schema";
import type { AwardRecord, EducationRecord, ExperienceRecord, ProjectRecord } from "@/types";

/**
 * Regex/structural resume extraction, used when no Anthropic API key is
 * configured or the AI extraction call fails. Deliberately simple and
 * deterministic — it will miss things a real reader wouldn't, which is why
 * results always go through an editable review step before being trusted.
 *
 * Unlike a pure keyword scan, this does real structural parsing: it detects
 * entry boundaries in Experience/Projects via date-range patterns, and reads
 * labeled Skills sub-categories, so domain-specific STEM skills (lab
 * technique, process engineering, instrumentation — not just programming
 * languages) are captured, not just a fixed software-skill keyword list.
 */

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const DATE_TOKEN = `(?:${MONTH}\\.?\\s+\\d{4}|\\d{4}|present)`;
const DATE_RANGE_RE = new RegExp(`(${DATE_TOKEN})\\s*[-–—]{1,2}\\s*(${DATE_TOKEN})`, "i");
// Bare years are restricted to a plausible resume-date range (19xx/20xx) so
// unrelated 4-digit tokens — course codes like "ENGR 2110", room numbers,
// etc. — don't get misread as a date and trigger a spurious new entry.
const SINGLE_DATE_RE = new RegExp(`\\b(${MONTH}\\s+\\d{4}|(?:19|20)\\d{2})\\b`, "i");
// Marks where a title line (seen before its date line arrived) was spliced
// onto the header — lets splitHeaderFields recover the title precisely
// instead of guessing from punctuation.
const TITLE_MARKER = "␟";

const FALLBACK_SKILL_KEYWORDS = [
  "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "SQL", "R",
  "MATLAB", "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Git",
  "React", "Node.js", "Linux", "Excel", "Tableau", "Power BI", "AutoCAD",
  "SolidWorks", "Machine Learning", "Data Analysis", "TensorFlow", "PyTorch",
  "HTML", "CSS", "Swift", "Kotlin", "Figma", "Statistics", "Pandas", "NumPy",
];

const SECTION_HEADERS: Record<string, "experience" | "projects" | "awards" | "certifications" | "education" | "skills"> = {
  INTERNSHIP: "experience",
  INTERNSHIPS: "experience",
  EXPERIENCE: "experience",
  "WORK EXPERIENCE": "experience",
  "RELEVANT EXPERIENCE": "experience",
  "PROFESSIONAL EXPERIENCE": "experience",
  "RESEARCH EXPERIENCE": "experience",
  EMPLOYMENT: "experience",
  LEADERSHIP: "experience",
  "LEADERSHIP EXPERIENCE": "experience",
  ACTIVITIES: "experience",
  "EXTRACURRICULAR ACTIVITIES": "experience",
  "ACTIVITIES LEADERSHIP": "experience",
  "LEADERSHIP ACTIVITIES": "experience",
  PROJECT: "projects",
  PROJECTS: "projects",
  "ACADEMIC PROJECTS": "projects",
  "PERSONAL PROJECTS": "projects",
  "SELECTED PROJECTS": "projects",
  "TECHNICAL PROJECTS": "projects",
  "AWARDS HONORS": "awards",
  AWARDS: "awards",
  HONORS: "awards",
  "HONORS AWARDS": "awards",
  CERTIFICATION: "certifications",
  CERTIFICATIONS: "certifications",
  EDUCATION: "education",
  SKILLS: "skills",
  "TECHNICAL SKILLS": "skills",
  "SKILLS INTERESTS": "skills",
};

function normalizeHeader(line: string): string {
  return line.toUpperCase().replace(/[^A-Z\s]/g, "").replace(/\s+/g, " ").trim();
}

function stripBullet(line: string): string {
  return line.replace(/^[-•*•]\s*/, "").trim();
}

function newId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

function extractEducationStage(text: string): string | null {
  const lower = text.toLowerCase();
  const isHighSchool = /high school/.test(lower);
  const isCollegeContext = /\b(university|college|bachelor'?s?|b\.?s\.?|b\.?a\.?)\b/.test(lower);

  if (/\bph\.?d\b|doctorate/.test(lower)) return "graduate-student";
  if (/\bmaster'?s?\b|\bm\.?s\.?\b|\bm\.?eng\.?\b/.test(lower)) return "graduate-student";

  const yearMatch = lower.match(/\b(freshman|sophomore|junior|senior)\b/);
  if (yearMatch) {
    const year = yearMatch[1];
    return isHighSchool ? `high-school-${year}` : `college-${year}`;
  }

  if (isCollegeContext) return null; // known undergrad, unknown year — let the student pick
  return null;
}

function hasDateSignal(line: string): boolean {
  return DATE_RANGE_RE.test(line) || (SINGLE_DATE_RE.test(line) && line.length < 100);
}

/**
 * Looks a few lines ahead from `startIndex` for a date-bearing line, giving
 * up as soon as a bullet is hit (bullets mean we're already inside body
 * content, so nothing after them can be an upcoming entry's date). Used to
 * recognize "Title\nOrganization ... Date Range"-style entries where the
 * title arrives on its own line before any date has appeared yet, even for
 * the 2nd+ entry in a section.
 */
function hasDateWithinLines(lines: string[], startIndex: number, lookahead: number): boolean {
  for (let i = startIndex; i < Math.min(lines.length, startIndex + lookahead); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^[-•*•]/.test(line)) return false;
    if (hasDateSignal(line)) return true;
  }
  return false;
}

/**
 * Groups a section's raw lines into entries. A new entry starts at a line
 * containing a date range (or, failing that, a single trailing date) — the
 * common "Title ......... Date Range" resume convention. Everything up to
 * the next such line becomes that entry's organization line + bullets.
 *
 * Some resumes put the title on its own line ABOVE the "Organization ...
 * Date Range" line. Those dateless lead-in lines are held as a pending
 * title rather than being spliced onto whatever entry is currently open —
 * that splice is what used to shatter one job into two records (a
 * title-only entry and a separate dates-only entry), or worse, glue a
 * second job's title onto the end of the first job's last bullet. A
 * dateless line only counts as a new pending title when it looks like one
 * (title-cased, not a stray sentence fragment) AND a date genuinely shows
 * up within the next couple of lines; otherwise it's treated as this
 * entry's org/location line or a wrapped bullet continuation, and
 * groupBodyLines() sorts out which.
 */
function splitIntoEntries(lines: string[]): { headerLine: string; bodyLines: string[] }[] {
  const entries: { headerLine: string; bodyLines: string[] }[] = [];
  let pendingTitleLines: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) continue;

    const isBullet = /^[-•*•]/.test(line);

    if (isBullet) {
      if (entries.length > 0) {
        entries[entries.length - 1].bodyLines.push(line);
      } else {
        pendingTitleLines.push(line);
      }
      continue;
    }

    if (hasDateSignal(line)) {
      const headerLine =
        pendingTitleLines.length > 0 ? `${pendingTitleLines.join(" ")} ${TITLE_MARKER} ${line}` : line;
      entries.push({ headerLine, bodyLines: [] });
      pendingTitleLines = [];
      continue;
    }

    const looksLikeUpcomingTitle =
      entries.length > 0 &&
      line.length < 90 &&
      /^[A-Z]/.test(line) &&
      hasDateWithinLines(lines, index + 1, 2);

    if (looksLikeUpcomingTitle) {
      pendingTitleLines.push(line);
    } else if (entries.length > 0) {
      // Belongs to the currently-open entry — either its org/location line,
      // or (once bullets are underway) a wrapped continuation of the last
      // bullet. groupBodyLines() sorts out which, further down the pipeline.
      entries[entries.length - 1].bodyLines.push(line);
    } else {
      // No entry open yet — this is a title line whose date hasn't shown up
      // on this line. Hold it instead of letting it become its own
      // header-less entry.
      pendingTitleLines.push(line);
      if (pendingTitleLines.length > 3) pendingTitleLines.shift();
    }
  }

  if (pendingTitleLines.length > 0) {
    entries.push({ headerLine: pendingTitleLines.join(" "), bodyLines: [] });
  }

  return entries;
}

/**
 * Splits a (date-stripped) header line into title/organization/location.
 * Only acts when there's an explicit, high-confidence separator — a
 * TITLE_MARKER (from a pending title line reattached above), a pipe
 * ("Title | Organization | Location"), or a spaced em/en dash — so the
 * common single-segment case ("Engineer Intern", with organization on its
 * own line below) is left exactly as before.
 */
function splitHeaderFields(text: string): { title: string | null; organization: string | null; location: string | null } {
  let title: string | null = null;
  let rest = text;

  const markerIdx = rest.indexOf(TITLE_MARKER);
  if (markerIdx !== -1) {
    title = rest.slice(0, markerIdx).trim() || null;
    rest = rest.slice(markerIdx + TITLE_MARKER.length).trim();
  }

  const pipeParts = rest.split("|").map((p) => p.trim()).filter(Boolean);
  if (pipeParts.length > 1) {
    if (title === null) title = pipeParts.shift() ?? null;
    return { title, organization: pipeParts[0] ?? null, location: pipeParts[1] ?? null };
  }

  const dashParts = rest.split(/\s+[–—]\s+/).map((p) => p.trim()).filter(Boolean);
  if (dashParts.length > 1) {
    if (title === null) title = dashParts.shift() ?? null;
    return { title, organization: dashParts[0] ?? null, location: dashParts[1] ?? null };
  }

  if (title !== null) {
    // The date-line remainder had no separators, but the pending title line
    // itself might (e.g. "Title | Organization | Location" seen before its
    // date line ever appeared) — split it there instead of leaving the raw
    // separators sitting inside the title string.
    const titlePipeParts = title.split("|").map((p) => p.trim()).filter(Boolean);
    if (titlePipeParts.length > 1) {
      return {
        title: titlePipeParts[0] ?? null,
        organization: titlePipeParts[1] ?? null,
        location: titlePipeParts[2] ?? (rest || null),
      };
    }
    const titleDashParts = title.split(/\s+[–—]\s+/).map((p) => p.trim()).filter(Boolean);
    if (titleDashParts.length > 1) {
      return {
        title: titleDashParts[0] ?? null,
        organization: titleDashParts[1] ?? null,
        location: titleDashParts[2] ?? (rest || null),
      };
    }
    return { title, organization: rest || null, location: null };
  }

  return { title: rest || null, organization: null, location: null };
}

function extractDateRange(text: string): { startDate: string | null; endDate: string | null; titleWithoutDates: string } {
  const match = text.match(DATE_RANGE_RE);
  if (match) {
    return {
      startDate: match[1].trim(),
      endDate: match[2].trim(),
      titleWithoutDates: text.slice(0, match.index).trim(),
    };
  }
  const single = text.match(SINGLE_DATE_RE);
  if (single) {
    return {
      startDate: null,
      endDate: single[0].trim(),
      titleWithoutDates: text.slice(0, single.index).trim(),
    };
  }
  return { startDate: null, endDate: null, titleWithoutDates: text.trim() };
}

/**
 * Groups a single entry's body lines into an organization line + bullets.
 * PDF text extraction often wraps one logical bullet across two raw lines —
 * any line that isn't itself a bullet marker or the (first) org line is
 * treated as a wrapped continuation and appended to the previous bullet,
 * rather than silently dropped.
 */
function groupBodyLines(bodyLines: string[]): { orgLine: string | null; bullets: string[] } {
  let orgLine: string | null = null;
  const bullets: string[] = [];

  for (const line of bodyLines) {
    if (/^[-•*•]/.test(line)) {
      bullets.push(stripBullet(line));
    } else if (orgLine === null && bullets.length === 0) {
      orgLine = line;
    } else if (bullets.length > 0) {
      bullets[bullets.length - 1] = `${bullets[bullets.length - 1]} ${line}`.trim();
    } else {
      orgLine = `${orgLine} ${line}`.trim();
    }
  }

  return { orgLine, bullets };
}

function parseExperienceEntries(lines: string[], idPrefix: string): ExperienceRecord[] {
  return splitIntoEntries(lines)
    .slice(0, 8)
    .map((entry, i) => {
      const { startDate, endDate, titleWithoutDates } = extractDateRange(entry.headerLine);
      const headerFields = splitHeaderFields(titleWithoutDates);
      const { orgLine, bullets } = groupBodyLines(entry.bodyLines);
      const organization = headerFields.organization ?? orgLine;

      return {
        id: newId(idPrefix, i),
        title: headerFields.title,
        organization,
        location: headerFields.location,
        startDate,
        endDate,
        summary: bullets.length === 0 ? organization : null,
        bullets: bullets.slice(0, 8),
      };
    });
}

function parseProjectEntries(lines: string[], idPrefix: string): ProjectRecord[] {
  return splitProjectEntries(lines)
    .slice(0, 8)
    .map((entry, i) => {
      const { endDate, titleWithoutDates } = extractDateRange(entry.headerLine);
      const inlineUrl = titleWithoutDates.match(/\b(?:https?:\/\/|www\.)\S+/i)?.[0] ?? null;
      const titleText = inlineUrl ? titleWithoutDates.replace(inlineUrl, "").trim() : titleWithoutDates;
      const headerFields = splitHeaderFields(titleText);
      const bullets = [inlineUrl, ...entry.bodyLines].filter((line): line is string => Boolean(line)).map(stripBullet);

      return {
        id: newId(idPrefix, i),
        title: headerFields.title || `Project ${i + 1}`,
        technologies: [],
        date: endDate,
        summary: headerFields.organization,
        bullets: bullets.slice(0, 8),
        githubUrl: inlineUrl,
      };
    });
}

function isProjectUrl(line: string): boolean {
  return /^(?:https?:\/\/|www\.)/i.test(stripBullet(line));
}

function looksLikeProjectTitle(line: string, nextLine: string | undefined): boolean {
  if (/^[-â€¢*â€¢]/.test(line)) return false;
  const clean = stripBullet(line);
  if (!clean || isProjectUrl(clean) || hasDateSignal(clean) || clean.length > 120) return false;
  if (/^(?:achieved|analyzed|automated|built|collaborated|conducted|created|delivered|deployed|designed|developed|engineered|implemented|improved|integrated|launched|led|managed|optimized|organized|produced|researched|supported|tested|utilized|wrote)\b/i.test(clean)) return false;
  if (/[.!?]$/.test(clean) || clean.split(/\s+/).length >= 14) return false;
  if (/\b(?:https?:\/\/|www\.)\S+/i.test(clean)) return true;
  return Boolean(nextLine && (isProjectUrl(nextLine) || /^[-â€¢*â€¢]/.test(nextLine)));
}

/** Project sections often omit dates. Treat a title followed by a repository
 * URL or bullet as a boundary and keep its body attached until the next title. */
function splitProjectEntries(lines: string[]): { headerLine: string; bodyLines: string[] }[] {
  if (lines.some(hasDateSignal)) return splitIntoEntries(lines);

  const entries: { headerLine: string; bodyLines: string[] }[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) continue;
    const nextLine = lines[index + 1]?.trim();
    const startsProject = looksLikeProjectTitle(line, nextLine) &&
      (entries.length === 0 || entries[entries.length - 1].bodyLines.length > 0);

    if (startsProject || entries.length === 0) entries.push({ headerLine: stripBullet(line), bodyLines: [] });
    else entries[entries.length - 1].bodyLines.push(line);
  }
  return entries;
}

/**
 * Splices a date token out of `text` (rather than truncating everything
 * after it, like extractDateRange does) — so a trailing inline description
 * that comes AFTER the date on the same line ("... | Apr 2026 -- Developed
 * a model...") survives instead of being discarded.
 */
function extractInlineDate(text: string): { date: string | null; withoutDate: string } {
  const rangeMatch = text.match(DATE_RANGE_RE);
  if (rangeMatch && rangeMatch.index !== undefined) {
    const date = `${rangeMatch[1].trim()} - ${rangeMatch[2].trim()}`;
    const spliced = text.slice(0, rangeMatch.index) + " " + text.slice(rangeMatch.index + rangeMatch[0].length);
    return { date, withoutDate: cleanRemainder(spliced) };
  }
  const single = text.match(SINGLE_DATE_RE);
  if (single && single.index !== undefined) {
    const spliced = text.slice(0, single.index) + " " + text.slice(single.index + single[0].length);
    return { date: single[0].trim(), withoutDate: cleanRemainder(spliced) };
  }
  return { date: null, withoutDate: cleanRemainder(text) };
}

function cleanRemainder(text: string): string {
  return text.replace(/\|/g, " ").replace(/\s{2,}/g, " ").trim();
}

/**
 * Groups an Awards section's raw lines into one entry per award, so a
 * multi-line award (name, then a description sentence below it) lands in
 * ONE record instead of one record per physical line. When the section uses
 * bullet markers, each bullet unambiguously starts a new award and any
 * non-bullet lines before the next bullet are that award's description
 * continuation. Without bullets, falls back to the same date-signal-driven
 * grouping used for Experience/Projects.
 */
function splitAwardEntries(lines: string[]): { headerLine: string; descriptionLines: string[] }[] {
  const usesBullets = lines.some((l) => /^[-•*•]/.test(l));
  if (!usesBullets) {
    return splitIntoEntries(lines).map((e) => ({ headerLine: e.headerLine, descriptionLines: e.bodyLines }));
  }

  const entries: { headerLine: string; descriptionLines: string[] }[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^[-•*•]/.test(line)) {
      entries.push({ headerLine: stripBullet(line), descriptionLines: [] });
    } else if (entries.length > 0) {
      entries[entries.length - 1].descriptionLines.push(line);
    }
  }
  return entries;
}

function parseAwardEntries(lines: string[], idPrefix: string): AwardRecord[] {
  return splitAwardEntries(lines)
    .filter((entry) => entry.headerLine.trim().length > 3)
    .slice(0, 10)
    .map((entry, i) => {
      // A pending title (held by splitIntoEntries before its date line
      // arrived) is marker-tagged — recover it before pipe-splitting so the
      // marker never leaks into the award name.
      const markerIdx = entry.headerLine.indexOf(TITLE_MARKER);
      const pendingTitle = markerIdx !== -1 ? entry.headerLine.slice(0, markerIdx).trim() || null : null;
      const rest = markerIdx !== -1 ? entry.headerLine.slice(markerIdx + TITLE_MARKER.length).trim() : entry.headerLine;

      const clean = stripBullet(rest);
      const parts = clean.split("|").map((p) => p.trim()).filter(Boolean);
      const name = pendingTitle || parts.shift() || `Award ${i + 1}`;

      // Whatever's left is "Organization | Date -- Description", "Organization
      // | Date", "Date -- Description", or plain prose — in any order/subset.
      const remainder = parts.join(" | ");
      const dashSplit = remainder.split(/--|—/);
      const inlineDescription = dashSplit.length > 1 ? dashSplit.slice(1).join(" ").trim() : "";
      const { date, withoutDate: organization } = extractInlineDate(dashSplit[0] ?? "");

      const continuationDescription = entry.descriptionLines.map(stripBullet).join(" ").trim();
      const description = [inlineDescription, continuationDescription].filter(Boolean).join(" ") || null;

      return { id: newId(idPrefix, i), name, organization: organization || null, date, description };
    });
}

// Matches ONLY the credential phrase itself — spelled-out ("Bachelor of
// Science") or abbreviated ("B.S.", "M.Eng.") — so `degree` never absorbs
// trailing major/GPA text. Longer, more specific alternatives are listed
// first since regex alternation takes the first match at a given position.
// A trailing `\b` would force the engine to backtrack off a degree
// abbreviation's final period (since "." then whitespace has no word
// boundary between them), silently truncating "B.S." to "B.S" and leaving a
// stray "." at the start of whatever comes next. A lookahead for
// whitespace/comma/period/end avoids that — the trailing period is free to
// stay part of the match.
const DEGREE_RE =
  /\b(bachelor'?s?\s+of\s+(?:science|arts|engineering|business\s+administration|fine\s+arts)|associate'?s?\s+of\s+(?:science|arts)|master'?s?\s+of\s+(?:science|arts|engineering|business\s+administration|fine\s+arts)|doctor\s+of\s+philosophy|ph\.?\s?d\.?|doctorate|mba|b\.?s\.?|b\.?a\.?|b\.?eng\.?|m\.?s\.?|m\.?a\.?|m\.?eng\.?)(?=[\s,.]|$)/i;

// Captures a major/field-of-study phrase from the text immediately
// following a matched degree (e.g. ", Chemical Engineering" or " in
// Computer Science") — stopping at the next period/comma, "GPA", a date, or
// end of string, so it never bleeds into those fields. Leading punctuation
// (a stray "." left over from the degree, a comma, "in") is stripped first.
const MAJOR_AFTER_DEGREE_RE = /^[\s,:.]*(?:in\s+)?([A-Za-z][A-Za-z&/,\s'-]{2,60}?)(?=\s*[.,]|\s+GPA\b|\s+\d{4}|\s*$)/i;

function parseEducationEntries(lines: string[]): EducationRecord[] {
  const entries: EducationRecord[] = [];
  let current: Partial<EducationRecord> | null = null;
  let index = 0;

  const gpaMatch = (text: string) => {
    const m = text.match(/GPA[:\s]*([0-4]\.\d{1,2}|\d{2,3}(?:\.\d+)?)/i);
    return m ? Number(m[1]) : null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const isInstitutionLine = /\b(university|college|institute of technology|polytechnic)\b/i.test(line) && !DEGREE_RE.test(line);

    if (isInstitutionLine) {
      if (current) entries.push(finalizeEducation(current, index++));
      current = { institution: line };
      continue;
    }

    if (!current) current = {};

    const degreeMatch = line.match(DEGREE_RE);
    if (degreeMatch && degreeMatch.index !== undefined) {
      current.degree = degreeMatch[0].trim();

      const afterDegree = line.slice(degreeMatch.index + degreeMatch[0].length);
      const majorMatch = afterDegree.match(MAJOR_AFTER_DEGREE_RE);
      if (majorMatch) current.major = majorMatch[1].trim().replace(/\s+/g, " ");

      const gpa = gpaMatch(line);
      if (gpa !== null) current.gpa = gpa;
      const { startDate, endDate } = extractDateRange(line);
      if (startDate) current.startDate = startDate;
      if (endDate) current.endDate = endDate;
    }
  }
  if (current) entries.push(finalizeEducation(current, index));

  return entries.slice(0, 5);
}

function finalizeEducation(partial: Partial<EducationRecord>, index: number): EducationRecord {
  const gpaScale = partial.gpa !== undefined && partial.gpa !== null && partial.gpa > 4.3 ? "100" : "4.0";
  return {
    id: newId("edu", index),
    institution: partial.institution ?? null,
    degree: partial.degree ?? null,
    major: partial.major ?? null,
    gpa: partial.gpa ?? null,
    gpaScale: partial.gpa != null ? gpaScale : null,
    startDate: partial.startDate ?? null,
    endDate: partial.endDate ?? null,
  };
}

function parseSkillsSection(lines: string[]): string[] {
  const skills: string[] = [];
  for (const line of lines) {
    const withoutLabel = line.includes(":") ? line.slice(line.indexOf(":") + 1) : line;
    const items = withoutLabel
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 60);
    skills.push(...items);
  }
  return skills;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function extractSections(text: string): Record<string, string[]> {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const raw: Record<string, string[]> = {
    experience: [],
    projects: [],
    awards: [],
    certifications: [],
    education: [],
    skills: [],
  };

  let currentKey: keyof typeof raw | null = null;
  for (const line of lines) {
    const headerKey = Object.keys(SECTION_HEADERS).find((header) => normalizeHeader(line) === header);
    if (headerKey) {
      currentKey = SECTION_HEADERS[headerKey];
      continue;
    }
    if (currentKey && line.length > 1) {
      raw[currentKey].push(line);
    }
  }

  return raw;
}

export function extractResumeDataHeuristically(rawText: string): ResumeExtraction {
  const sections = extractSections(rawText);

  const educationStage = extractEducationStage(rawText);
  const education = parseEducationEntries(sections.education);
  const experience = parseExperienceEntries(sections.experience, "exp");
  const projects = parseProjectEntries(sections.projects, "proj");
  const awards = parseAwardEntries(sections.awards, "award");

  const skillsFromSection = parseSkillsSection(sections.skills);
  const skillsFromKeywords = FALLBACK_SKILL_KEYWORDS.filter((skill) =>
    new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(rawText),
  );
  const skills = dedupeStrings([...skillsFromSection, ...skillsFromKeywords]);

  const followUpQuestions: string[] = [];
  if (education.length === 0 || !education[0]?.major)
    followUpQuestions.push("What is your intended major or field of study?");
  if (skills.length === 0)
    followUpQuestions.push("What programming languages, lab techniques, or technical tools do you know?");
  if (experience.length === 0)
    followUpQuestions.push("Have you had any internships, research positions, or part-time jobs relevant to your target field?");
  if (projects.length === 0)
    followUpQuestions.push("Have you built any personal, class, or club projects worth highlighting?");

  const foundSignals = [education[0]?.institution, education[0]?.major, education[0]?.gpa, skills.length > 0].filter(
    Boolean,
  ).length;
  const sectionCount = [experience, projects, awards].filter((v) => v.length > 0).length;
  const extractionConfidence: ResumeExtraction["extractionConfidence"] =
    rawText.length < 200
      ? "low"
      : foundSignals >= 3 && sectionCount >= 2
        ? "high"
        : foundSignals >= 1 || sectionCount >= 1
          ? "medium"
          : "low";

  return {
    educationStage,
    education,
    experience,
    projects,
    awards,
    certifications: [],
    skills,
    extractionConfidence,
    followUpQuestions: followUpQuestions.slice(0, 5),
  };
}
