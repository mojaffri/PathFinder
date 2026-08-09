import type { ResumeExtraction } from "./schema";
import type { ProjectRecord } from "@/types";

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
  const hasIndependentMetadata = Boolean(project.date || project.technologies.length || project.summary || project.bullets.length);
  if (!title || hasIndependentMetadata) return false;
  return ACTION_LEAD_RE.test(title) || /[.!?]$/.test(title) || title.split(/\s+/).length >= 14 || /^(?:https?:\/\/|www\.)\S+$/i.test(title);
}

function mergeProjectDescription(target: ProjectRecord, orphan: ProjectRecord): ProjectRecord {
  return {
    ...target,
    bullets: uniqueLines([...target.bullets, orphan.title, orphan.summary, ...orphan.bullets]).slice(0, 8),
  };
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
    experience: extraction.experience.map((record) => ({
      ...record,
      summary: record.summary ? cleanDescriptionLine(record.summary) : null,
      bullets: uniqueLines(record.bullets).slice(0, 8),
    })),
    projects,
    awards: extraction.awards.map((record) => ({
      ...record,
      description: record.description ? cleanDescriptionLine(record.description) : null,
    })),
  };
}
