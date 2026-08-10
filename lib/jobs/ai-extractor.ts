import { ANTHROPIC_MODEL, getAnthropicClient } from "@/lib/ai/anthropic-client";
import { JOB_EXTRACTION_JSON_SCHEMA, JobExtractionSchema, type JobExtraction } from "./schema";

const TOOL_NAME = "extract_job_requirements";
const MAX_ATTEMPTS = 2;

function buildPrompt(rawText: string, retryNote?: string): string {
  return `Extract structured requirements from this job description/posting.

Rules:
- Only include information actually present in the text — use null for fields not found, empty arrays for sections not present. Do not infer or invent details.
- "requirements" should cover every individual required or preferred skill, tool, technology, experience threshold, or education credential mentioned — one entry per item, not grouped into a single string.
- category is "required" only when the posting genuinely treats it as a must-have (words like "required", "must have", listed under a "Requirements"/"Qualifications" heading with no "preferred/nice to have" qualifier). Use "preferred" for anything under a "Preferred", "Nice to have", "Bonus", or "Plus" heading, or described as a plus.
- Read qualifications at sentence level when the posting has no headings: "AWS would be a plus" is preferred even if Python is required in the sentence before it. Never promote a preferred item because it is repeated in responsibilities or company-description prose.
- Requirements, responsibilities, benefits, and company-description text are separate concepts. Technologies merely used in a duty (for example "build services in Python") are not automatically qualifications unless the posting also asks the candidate to know them.
- Identify title/company from labeled fields and page headers when present; do not mistake the company name, location, requisition number, or "About us" heading for the role title.
- kind="experience" is for a specific years-of-experience threshold (set minYears); kind="education" is for a degree/credential level; kind="skill"/"tool" cover everything else (skill="a competency", tool="a named product/technology/platform") — the distinction is soft, pick whichever fits better.
- Deduplicate: the same skill/tool mentioned in multiple places becomes ONE entry with its strongest category (required beats preferred if both appear).
- "responsibilities" is the day-to-day duties list; "keywords" is a short list of other notable terms worth surfacing that aren't already captured as a requirement.
- Truncate your reading of the text below if needed.
${retryNote ? `\n${retryNote}\n` : ""}
---
${rawText.slice(0, 12000)}
---`;
}

async function callOnce(rawText: string, retryNote?: string): Promise<JobExtraction | null> {
  const client = getAnthropicClient();
  if (!client) return null;

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4000,
    tools: [
      {
        name: TOOL_NAME,
        description: "Extract structured requirements from job description text.",
        input_schema: JOB_EXTRACTION_JSON_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: buildPrompt(rawText, retryNote) }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return null;

  const parsed = JobExtractionSchema.safeParse(toolUse.input);
  return parsed.success ? parsed.data : null;
}

/**
 * Attempts AI-assisted structured extraction of job requirements. Returns
 * null if no API key is configured, or every attempt fails/times out/comes
 * back schema-invalid — callers fall back to the heuristic extractor in
 * that case, same contract as `lib/resume/ai-extractor.ts`.
 *
 * A schema-invalid tool response is retried once with an explicit note
 * about strict conformance, rather than silently falling back on the first
 * malformed response — "retry malformed responses sensibly" per the task
 * spec — but never retried on a network/timeout error (that failure mode
 * isn't going to be fixed by asking the same question again).
 */
export async function extractJobDataWithAI(rawText: string): Promise<JobExtraction | null> {
  if (!getAnthropicClient()) return null;

  let lastResult: JobExtraction | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      lastResult = await callOnce(
        rawText,
        attempt > 1 ? "Your previous response didn't match the required schema exactly — return ONLY the fields defined in the tool schema, with the exact types specified (numbers as numbers, not strings; every required field present)." : undefined,
      );
      if (lastResult) return lastResult;
    } catch {
      return null; // network/timeout/API error — retrying won't help, fall back immediately
    }
  }
  return lastResult;
}
