/**
 * Spatial/text-reassembly normalization pass for resume text pulled out of a
 * PDF. PDF text extraction linearizes a 2D layout into a flat line stream,
 * which frequently injects hard line breaks mid-sentence, mid-title, or
 * mid-organization-name (e.g. "Texas A&M at" / "Galveston" as two lines
 * because that's where the column happened to wrap).
 *
 * This runs once, before section detection or entry splitting, so every
 * downstream consumer (heuristic parser and AI extractor alike) sees
 * coherent logical lines instead of shattered fragments. It is deliberately
 * conservative — it only merges lines when the previous line ends with a
 * strong "this isn't finished" signal (a trailing connector word, a
 * hyphenated word-wrap, or a trailing comma) — so it never glues together
 * two real, separate one-line entries (e.g. "Rice University" followed by an
 * unrelated short line, or two distinct certifications listed back to
 * back). A blanket "short lines are probably fragments" rule was tried and
 * removed — plenty of legitimate standalone lines (institution names,
 * certification titles) are under 18 characters, and merging those silently
 * corrupted entry boundaries downstream.
 *
 * Bullet lines and ALL-CAPS section headers are always treated as hard
 * boundaries and left untouched; bullet-continuation merging is handled
 * separately (and section-aware) further down the pipeline.
 */

const BULLET_RE = /^[-•*◦▪‣]\s*/;
const HEADER_LIKE_RE = /^[A-Z][A-Z\s&/]{2,40}$/;
const TERMINAL_PUNCTUATION_RE = /[.!?:;]$/;
const TRAILING_CONNECTOR_RE = /\b(a|an|the|of|in|on|at|for|and|or|to|with|as|from|by)$/i;
const HYPHEN_WRAP_RE = /[a-z]-$/;

// PDF extractors sometimes place the next all-caps section heading at the
// end of the previous bullet instead of on its own line. Restore those hard
// boundaries before line reassembly so a project description cannot absorb
// the following Experience/Leadership/Awards section.
const INLINE_SECTION_HEADER_RE = new RegExp(
  `\\s+(${[
    "EDUCATION", "EXPERIENCE", "WORK EXPERIENCE", "RELEVANT EXPERIENCE", "PROFESSIONAL EXPERIENCE", "RESEARCH EXPERIENCE",
    "INTERNSHIPS?", "PROJECTS?", "AWARDS(?: & HONORS)?", "HONORS(?: & AWARDS)?",
    "CERTIFICATIONS?", "TECHNICAL SKILLS", "SKILLS(?: & INTERESTS)?",
    "ACADEMIC PROJECTS", "PERSONAL PROJECTS", "SELECTED PROJECTS", "TECHNICAL PROJECTS",
    "ACTIVITIES(?: & LEADERSHIP)?", "EXTRACURRICULAR ACTIVITIES", "LEADERSHIP(?: & ACTIVITIES| EXPERIENCE)?",
  ].join("|")})(?=\\s|$)`,
  "g",
);

function isHardBoundary(line: string): boolean {
  return line === "" || BULLET_RE.test(line) || HEADER_LIKE_RE.test(line) || /^(?:https?:\/\/|www\.)/i.test(line);
}

function shouldHyphenMerge(prev: string, next: string): boolean {
  if (isHardBoundary(prev) || isHardBoundary(next)) return false;
  return HYPHEN_WRAP_RE.test(prev) && /^[a-z]/.test(next);
}

function shouldMerge(prev: string, next: string): boolean {
  if (isHardBoundary(prev) || isHardBoundary(next)) return false;
  if (TERMINAL_PUNCTUATION_RE.test(prev)) return false;

  if (TRAILING_CONNECTOR_RE.test(prev)) return true;
  if (/[,&]$/.test(prev)) return true;
  if (/^[a-z]/.test(next)) return true;

  return false;
}

export function reassembleLines(rawText: string): string {
  const withRestoredSections = rawText.replace(INLINE_SECTION_HEADER_RE, "\n$1\n");
  const rawLines = withRestoredSections.split(/\r?\n/).map((l) => l.trim());
  const merged: string[] = [];

  for (const line of rawLines) {
    const prev = merged.length > 0 ? merged[merged.length - 1] : undefined;

    if (prev !== undefined && shouldHyphenMerge(prev, line)) {
      merged[merged.length - 1] = prev.replace(/-$/, "") + line;
      continue;
    }
    if (prev !== undefined && shouldMerge(prev, line)) {
      merged[merged.length - 1] = `${prev} ${line}`.trim();
      continue;
    }
    merged.push(line);
  }

  return merged.join("\n");
}
