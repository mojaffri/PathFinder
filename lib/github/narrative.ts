import { z } from "zod";
import { ANTHROPIC_MODEL, getAnthropicClient } from "@/lib/ai/anthropic-client";
import type { DetectedSignal } from "@/types";
import type { SkillSignal } from "./map-to-skills";

/**
 * The one place AI is used in the GitHub-analysis pipeline — per the task
 * spec, "use AI only when it adds value to interpreting descriptions/code
 * context; objective facts should remain deterministic." Every fact this
 * function could reference (which skills, which signals, what's missing)
 * was already computed deterministically by `detectors.ts`/`map-to-skills.ts`
 * BEFORE this runs; the AI's only job is writing one well-phrased summary
 * sentence from those facts, explicitly instructed never to add a skill or
 * signal that wasn't passed in. Falls back to a deterministic template
 * (`deterministicSummary`) whenever no API key is configured or the call
 * fails — same guaranteed-fallback contract as every other AI path in this
 * app.
 */

function joinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const MISSING_SIGNAL_KEYS = new Set(["database", "deployment", "testing", "cicd", "backendApi"]);

export function deterministicSummary(skillSignals: SkillSignal[], detectedSignals: DetectedSignal[]): string {
  const strong = skillSignals.filter((s) => s.strength === "strong").map((s) => s.skill);
  const moderate = skillSignals.filter((s) => s.strength === "moderate").map((s) => s.skill);
  const missing = detectedSignals.filter((s) => !s.detected && MISSING_SIGNAL_KEYS.has(s.key)).map((s) => s.label.toLowerCase());

  const headline =
    strong.length > 0
      ? `strong evidence of ${joinNatural(strong.slice(0, 4))}`
      : moderate.length > 0
        ? `some evidence of ${joinNatural(moderate.slice(0, 4))}`
        : "limited detectable engineering signal";

  let summary = `This project provides ${headline}.`;
  if (missing.length > 0) {
    summary += ` It currently shows little evidence of ${joinNatural(missing.slice(0, 3))}.`;
  }
  return summary;
}

const NarrativeSchema = z.object({ summary: z.string().min(10).max(400) });
const TOOL_NAME = "write_repo_summary";

export async function generateRepoNarrative(input: {
  repoName: string;
  description: string | null;
  skillSignals: SkillSignal[];
  detectedSignals: DetectedSignal[];
}): Promise<string> {
  const fallback = deterministicSummary(input.skillSignals, input.detectedSignals);

  const client = getAnthropicClient();
  if (!client) return fallback;

  try {
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      tools: [
        {
          name: TOOL_NAME,
          description: "Write a short, recruiter-style summary of what this repository demonstrates.",
          input_schema: {
            type: "object",
            properties: { summary: { type: "string", description: "1-2 plain sentences, in the style of 'This project provides strong evidence of X, Y, and Z. It provides little evidence of A.'" } },
            required: ["summary"],
          },
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content: `Write a 1-2 sentence recruiter-style summary of what this repository demonstrates, in the exact tone of this example: "This project provides strong evidence of Python, numerical optimization, and automated testing. It currently provides little evidence of backend persistence or cloud infrastructure."

Repository: ${input.repoName}
Description: ${input.description ?? "(none provided)"}
Detected skills with STRONG evidence: ${input.skillSignals.filter((s) => s.strength === "strong").map((s) => s.skill).join(", ") || "none"}
Detected skills with MODERATE evidence: ${input.skillSignals.filter((s) => s.strength === "moderate").map((s) => s.skill).join(", ") || "none"}
Signals NOT detected (things this repo does NOT demonstrate): ${input.detectedSignals.filter((s) => !s.detected).map((s) => s.label).join(", ") || "none"}

Rules:
- ONLY reference the skills/signals listed above — never invent, guess, or add anything not explicitly given.
- Never mention stars, forks, or commit counts.
- Plain, factual, recruiter-readable tone — no hype words like "amazing" or "impressive."`,
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return fallback;

    const parsed = NarrativeSchema.safeParse(toolUse.input);
    return parsed.success ? parsed.data.summary : fallback;
  } catch {
    return fallback;
  }
}
