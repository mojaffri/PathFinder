import { requestStructuredAI } from "@/lib/ai/structured-output";
import { RESUME_EXTRACTION_JSON_SCHEMA, ResumeExtractionSchema, type ResumeExtraction } from "./schema";

const TOOL_NAME = "extract_resume_data";

/**
 * Attempts AI-assisted structured extraction of resume fields. Returns null
 * if no API key is configured or the call/validation fails for any reason —
 * callers are expected to fall back to the heuristic extractor in that case.
 */
export async function extractResumeDataWithAI(
  rawText: string,
  document?: { mediaType: "application/pdf"; data: string; title?: string },
): Promise<ResumeExtraction | null> {
  try {
    const result = await requestStructuredAI({
      feature: "resume-extraction",
      schema: ResumeExtractionSchema,
      toolSchema: RESUME_EXTRACTION_JSON_SCHEMA,
      toolName: TOOL_NAME,
      toolDescription: "Extract structured fields from resume text.",
      document,
      maxTokens: 4000,
      timeoutMs: 25_000,
      prompt: `Extract and consolidate structured information from this resume${document ? " document and its available extracted text" : " text"} into Education, Experience, Projects, Awards, Certifications, and Skills.

Rules:
- Before producing JSON, silently make two passes: first identify section boundaries and the start and end of every real-world entity; then map each entity's fields and description lines. Do not create records one physical line at a time.
- Only include information actually present in the text — use null for fields not found, and empty arrays for sections not present. Do not infer or invent details.
- The text below has already been through a line-reassembly pass, but PDF extraction artifacts can still remain (an odd break mid-word, a stray column jump). Use context — capitalization, punctuation, obvious mid-sentence/mid-name truncation — to read through those artifacts rather than reproducing them.
- A single position or project is ONE structured object grouping its title, organization, location, dates, and bullets together — even when the title, company, location, and date range appeared on visually separate lines in the source (a common resume layout). Never split one position into a "title-only" record and a separate "company/dates-only" record, and never merge two distinct jobs/projects into one.
- When a header line mixes title, organization, and location together (e.g. "Title | Organization | City, ST" or "Title — Organization, City, ST"), split them into their correct fields — do not leave organization or location bundled inside the title string.
- In Projects, create exactly one object per named project. A new project title, repository URL, or portfolio URL is a strong boundary signal. Keep that project's URL and every description/bullet with that project only; stop as soon as the next project title begins. Never use descriptive prose (for example "with AI-assisted coding...") as a title when a named project is present nearby.
- Entity names are short identity labels; descriptions explain actions or outcomes. A sentence beginning with an action verb such as Built, Developed, Led, Implemented, Researched, or Awarded is normally a description or bullet, not a project, employer, role, award, or certification name. Attach it to the closest preceding entity within the same section.
- For Experience, the role title identifies what the person did and organization identifies where. If separate lines contain "Northstar Labs" and "Software Engineer Intern", map them to organization and title respectively regardless of which line comes first. Location and dates are metadata for that same entry, never new entries.
- For Awards and Certifications, preserve the actual award or credential name. An explanation of why it was earned belongs in description; the awarding body belongs in organization or issuer.
- Section headings are absolute boundaries. Text after ACTIVITIES, LEADERSHIP, EXPERIENCE, AWARDS, CERTIFICATIONS, EDUCATION, or SKILLS never belongs to the preceding project, even if PDF extraction placed the heading on the same physical line.
- Deduplicate: if the same skill, tool, or fact appears in multiple fragments, merge them into ONE clean entry.
- Join wrapped fragments and lightly clean spacing, but preserve the source meaning and facts. Do not add placeholder metrics, achievements, technologies, responsibilities, or outcomes.
- An award name or project description that wraps across multiple lines in the source is still ONE entry — join the wrapped fragments back into a single clean string, never one card per line. Any descriptive sentence/paragraph following an award or project's header line belongs in that entry's "description"/"bullets" field, not as a separate award/project of its own.
- Field mapping is strict: titles only go in "title", organizations/companies only in "organization", locations only in "location". For Education, "degree" holds ONLY the credential name ("Bachelor of Science", "B.S.") — never the major or a GPA fragment, which belong in their own "major"/"gpa" fields.
- Keep Certifications separate from Awards. A credential or license (for example AWS Certified Cloud Practitioner, FE/EIT, CPA, or a safety certificate) belongs in "certifications" with its issuer/date; scholarships, Dean's List, prizes, and honors belong in "awards".
- Section labels vary. Treat Career History/Professional Background as Experience; Portfolio/Relevant Projects as Projects; Academic Background as Education; Credentials/Licenses as Certifications; Core Competencies/Tools & Technologies as Skills; and Honors & Distinctions as Awards.
- Preserve date meaning even when the source uses "to", en/em dashes, seasons, "Current", or "Now". Do not move a date into an organization, title, or description field.
- Capture ALL skills mentioned, not just software/programming ones — lab techniques, engineering tools, scientific instrumentation, domain-specific methods (e.g. "P&ID Interpretation", "pH Monitoring", "Process Validation") are just as important as programming languages.
- Capture awards/honors sections explicitly (these are often missed) — name, awarding organization, date, and a brief description if given.
- Every role or activity, regardless of field (leadership roles, unrelated part-time jobs, legal internships, business roles, etc.), should be captured faithfully as its own Experience entry — do not drop it, and do not editorialize about its relevance either.
- Truncate your reading of the resume text below if needed.

---
${rawText.trim() ? rawText.slice(0, 14000) : "(No text layer was available. Read the attached PDF visually.)"}
---`,
    });
    return result.data;
  } catch {
    return null;
  }
}
