import { ANTHROPIC_MODEL, getAnthropicClient } from "@/lib/ai/anthropic-client";
import { RESUME_EXTRACTION_JSON_SCHEMA, ResumeExtractionSchema, type ResumeExtraction } from "./schema";

const TOOL_NAME = "extract_resume_data";
const MAX_ATTEMPTS = 2;

function buildPrompt(rawText: string, retryNote?: string): string {
  return `Extract and consolidate structured information from this resume text into Education, Experience, Projects, Awards, Certifications, and Skills.

Rules:
- Only include information actually present in the text — use null for fields not found, and empty arrays for sections not present. Do not infer or invent details.
- The text below has already been through a line-reassembly pass, but PDF extraction artifacts can still remain (an odd break mid-word, a stray column jump). Use context — capitalization, punctuation, obvious mid-sentence/mid-name truncation — to read through those artifacts rather than reproducing them.
- A single position or project is ONE structured object grouping its title, organization, location, dates, and bullets together — even when the title, company, location, and date range appeared on visually separate lines in the source (a common resume layout). Never split one position into a "title-only" record and a separate "company/dates-only" record, and never merge two distinct jobs/projects into one.
- When a header line mixes title, organization, and location together (e.g. "Title | Organization | City, ST" or "Title — Organization, City, ST"), split them into their correct fields — do not leave organization or location bundled inside the title string.
- Deduplicate: if the same skill, tool, or fact appears in multiple fragments, merge them into ONE clean entry.
- Rewrite scattered or awkward phrasing into polished, professional bullet points describing what was done — but never invent achievements, numbers, technologies, responsibilities, or outcomes that aren't supported by the source text. Use an explicit bracket placeholder like "[quantify impact]" instead of inventing a metric.
- An award name or project description that wraps across multiple lines in the source is still ONE entry — join the wrapped fragments back into a single clean string, never one card per line. Any descriptive sentence/paragraph following an award or project's header line belongs in that entry's "description"/"bullets" field, not as a separate award/project of its own.
- Field mapping is strict: titles only go in "title", organizations/companies only in "organization", locations only in "location". For Education, "degree" holds ONLY the credential name ("Bachelor of Science", "B.S.") — never the major or a GPA fragment, which belong in their own "major"/"gpa" fields.
- Capture ALL skills mentioned, not just software/programming ones — lab techniques, engineering tools, scientific instrumentation, domain-specific methods (e.g. "P&ID Interpretation", "pH Monitoring", "Process Validation") are just as important as programming languages.
- Capture awards/honors sections explicitly (these are often missed) — name, awarding organization, date, and a brief description if given.
- Every role or activity, regardless of field (leadership roles, unrelated part-time jobs, legal internships, business roles, etc.), should be captured faithfully as its own Experience entry — do not drop it, and do not editorialize about its relevance either.
- Truncate your reading of the resume text below if needed.
${retryNote ? `\n${retryNote}\n` : ""}
---
${rawText.slice(0, 14000)}
---`;
}

async function callOnce(rawText: string, retryNote?: string): Promise<ResumeExtraction | null> {
  const client = getAnthropicClient();
  if (!client) return null;

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4000,
    tools: [
      {
        name: TOOL_NAME,
        description: "Extract structured fields from resume text.",
        input_schema: RESUME_EXTRACTION_JSON_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: buildPrompt(rawText, retryNote) }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return null;

  const parsed = ResumeExtractionSchema.safeParse(toolUse.input);
  return parsed.success ? parsed.data : null;
}

/**
 * Attempts AI-assisted structured extraction of resume fields. Returns null
 * if no API key is configured or every attempt fails/comes back
 * schema-invalid — callers are expected to fall back to the heuristic
 * extractor in that case.
 *
 * A schema-invalid tool response is retried once with an explicit note
 * about strict conformance before giving up — "retry malformed responses
 * sensibly" per CLAUDE.md's AI usage rules — but a network/timeout/API
 * error is never retried (that failure mode isn't fixed by asking again),
 * so a genuinely slow/unavailable API still fails fast into the fallback.
 */
export async function extractResumeDataWithAI(rawText: string): Promise<ResumeExtraction | null> {
  if (!getAnthropicClient()) return null;

  let lastResult: ResumeExtraction | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      lastResult = await callOnce(
        rawText,
        attempt > 1 ? "Your previous response didn't match the required schema exactly — return ONLY the fields defined in the tool schema, with the exact types specified (numbers as numbers, not strings; every required field present)." : undefined,
      );
      if (lastResult) return lastResult;
    } catch {
      return null;
    }
  }
  return lastResult;
}
