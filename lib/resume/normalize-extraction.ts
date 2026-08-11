import type { ResumeExtraction } from "./schema";
import type { AwardRecord, ExperienceRecord, ProjectRecord } from "@/types";

const ACTION_LEAD_RE = /^(?:achieved|analyzed|architected|automated|built|collaborated|conducted|configured|created|delivered|deployed|designed|developed|engineered|established|evaluated|implemented|improved|increased|integrated|launched|led|maintained|managed|migrated|optimized|organized|presented|produced|reduced|researched|resolved|supported|tested|utilized|wrote)\b/i;
const URL_RE = /https?:\/\/\S+|www\.\S+/i;

function cleanDescriptionLine(value: string): string {
  return value.replace(/^[-*â€¢â—¦â–ªâ€£]\s*/, "").replace(/\s+/g, " ").trim();
}

function uniqueLines(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return values.map((value) => cleanDescriptionLine(value ?? "")).filter((value) => {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isOrphanProjectDescription(project: ProjectRecord): boolean {
  const title = cleanDescriptionLine(project.title);
  // Models sometimes extract technologies from a description line and then
  // incorrectly promote that line into its own project. Technologies alone
  // are not enough to prove that a new project boundary exists.
  const hasIndependentMetadata = Boolean(project.date || project.summary || project.bullets.length || project.githubUrl);
  if (!title || hasIndependentMetadata) return false;
  return ACTION_LEAD_RE.test(title) || /[.!?]$/.test(title) || title.split(/\s+/).length >= 14 || /^(?:https?:\/\/|www\.)\S+$/i.test(title);
}

function mergeProjectDescription(target: ProjectRecord, orphan: ProjectRecord): ProjectRecord {
  return {
    ...target,
    technologies: [...new Set([...target.technologies, ...orphan.technologies])].slice(0, 12),
    bullets: uniqueLines([...target.bullets, orphan.title, orphan.summary, ...orphan.bullets]).slice(0, 8),
  };
}

function looksLikeDescription(value: string | null): boolean {
  if (!value) return false;
  const clean = cleanDescriptionLine(value);
  return ACTION_LEAD_RE.test(clean) || /[.!?]$/.test(clean) || clean.split(/\s+/).length >= 14;
}

function normalizeExperienceRecords(records: ExperienceRecord[]): ExperienceRecord[] {
  const result: ExperienceRecord[] = [];
  for (const rawRecord of records) {
    let record: ExperienceRecord = {
      ...rawRecord,
      title: rawRecord.title?.replace(/\s+/g, " ").trim() || null,
      organization: rawRecord.organization?.replace(/\s+/g, " ").trim() || null,
      summary: rawRecord.summary ? cleanDescriptionLine(rawRecord.summary) : null,
      bullets: uniqueLines(rawRecord.bullets).slice(0, 8),
    };

    // A common structured-output mistake is reversing a recognizable role
    // title and its organization. Only swap on a high-confidence role signal.
    const rolePattern = /\b(?:engineer|developer|analyst|scientist|assistant|associate|intern|researcher|consultant|specialist|manager|director|president|treasurer|coordinator|technician|designer|architect)\b/i;
    if (record.organization && rolePattern.test(record.organization) && (!record.title || !rolePattern.test(record.title))) {
      record = { ...record, title: record.organization, organization: record.title };
    }

    const previous = result[result.length - 1];
    const hasOwnIdentity = Boolean(record.organization || record.location || record.startDate || record.endDate);
    if (previous && looksLikeDescription(record.title) && !hasOwnIdentity) {
      result[result.length - 1] = {
        ...previous,
        bullets: uniqueLines([...previous.bullets, record.title, record.summary, ...record.bullets]).slice(0, 8),
      };
    } else {
      result.push(record);
    }
  }
  return result;
}

function normalizeAwardRecords(records: AwardRecord[]): AwardRecord[] {
  const result: AwardRecord[] = [];
  for (const rawRecord of records) {
    const record = {
      ...rawRecord,
      name: rawRecord.name.replace(/\s+/g, " ").trim(),
      description: rawRecord.description ? cleanDescriptionLine(rawRecord.description) : null,
    };
    const previous = result[result.length - 1];
    if (previous && looksLikeDescription(record.name) && !record.organization && !record.date) {
      result[result.length - 1] = {
        ...previous,
        description: uniqueLines([previous.description, record.name, record.description]).join(" ") || null,
      };
    } else {
      result.push(record);
    }
  }
  return result;
}

/**
 * Defensive normalization shared by AI and heuristic extraction. Resume
 * layouts vary, but the persisted invariant does not: a descriptive action
 * line belongs to the nearest preceding project, never in the title slot of
 * a new project card.
 */
export function normalizeResumeExtraction(extraction: ResumeExtraction): ResumeExtraction {
  const projects: ProjectRecord[] = [];
  for (const rawProject of extraction.projects) {
    const inlineUrl = rawProject.title.match(URL_RE)?.[0] ?? null;
    const cleanTitle = inlineUrl ? rawProject.title.replace(inlineUrl, "").trim() : rawProject.title;
    const project: ProjectRecord = {
      ...rawProject,
      title: cleanTitle.replace(/\s+/g, " ").trim(),
      summary: rawProject.summary ? cleanDescriptionLine(rawProject.summary) : null,
      bullets: uniqueLines([inlineUrl, ...rawProject.bullets]).slice(0, 8),
      githubUrl: rawProject.githubUrl ?? inlineUrl,
    };
    const previous = projects[projects.length - 1];
    if (previous && isOrphanProjectDescription(project)) {
      projects[projects.length - 1] = mergeProjectDescription(previous, project);
    } else {
      projects.push(project);
    }
  }

  return {
    ...extraction,
    experience: normalizeExperienceRecords(extraction.experience),
    projects,
    awards: normalizeAwardRecords(extraction.awards),
  };
}
