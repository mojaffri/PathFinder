import type { AIAdvantageSection, AIWorkflowTemplate, CareerCategory } from "@/types";

/**
 * Category-specific guidance on using AI seriously in a technical workflow —
 * not "use AI to learn faster" platitudes. This is static, curated product
 * content (not AI-generated), attached to every roadmap regardless of
 * whether the narrative content came from the model or the fallback.
 */

export const CORE_PRINCIPLE =
  "Use AI to increase your output and learning speed, not to replace understanding. Every workflow below ends with a verification step for exactly this reason.";

const REUSABLE_TEMPLATES: AIWorkflowTemplate[] = [
  {
    name: "Research Accelerator",
    steps: [
      "Find papers or authoritative sources on the topic",
      "Extract the core claims from each",
      "Compare methodologies across sources",
      "Identify gaps or disagreements between them",
      "Generate follow-up questions the sources don't answer",
      "Verify key claims against primary sources before relying on them",
    ],
  },
  {
    name: "Technical Debugging Loop",
    steps: [
      "Explain the problem clearly, including what you expected vs. what happened",
      "Reproduce it reliably",
      "Generate a few concrete hypotheses for the cause",
      "Test each hypothesis one at a time",
      "Inspect the actual output/logs, not just the AI's explanation",
      "Verify the fix independently before considering it done",
    ],
  },
  {
    name: "Project Critique",
    steps: [
      "Give the AI your project's actual requirements",
      "Ask it to list realistic failure modes",
      "Ask it to list edge cases you might have missed",
      "Implement the fixes that are actually relevant",
      "Test them yourself",
      "Ask the AI to critique the result once more",
      "Verify manually before calling it finished",
    ],
  },
];

const CATEGORY_CONTENT: Record<CareerCategory, { summary: string; useCases: string[]; templates: AIWorkflowTemplate[] }> = {
  engineering: {
    summary: "Use AI to accelerate the repetitive parts of engineering work so you spend more time on judgment and design.",
    useCases: [
      "Accelerate technical research on unfamiliar standards or materials",
      "Generate simulation test cases and parameter sweeps",
      "Automate repetitive calculations (with manual spot-checks)",
      "Analyze experimental data for patterns worth investigating further",
      "Generate and review MATLAB/Python analysis code",
      "Draft engineering documentation and reports",
      "Stress-test your own design assumptions by asking AI to critique them",
    ],
    templates: [
      {
        name: "Design Assumption Stress-Test",
        steps: [
          "State your design and its key assumptions explicitly",
          "Ask the AI to list ways each assumption could fail in practice",
          "Check each failure mode against your actual constraints",
          "Revise the design where a failure mode is real",
          "Verify the fix with a calculation or simulation, not just AI reasoning",
        ],
      },
    ],
  },
  "software-tech": {
    summary: "Use AI as a fast pair-programmer and reviewer, not a replacement for understanding your own code.",
    useCases: [
      "AI-assisted debugging (see the Technical Debugging Loop template)",
      "Generate test cases, including edge cases you might not think of",
      "Ask AI to critique your own PR before submitting it",
      "Explore an unfamiliar codebase/repository faster",
      "Draft documentation from working code",
      "Pressure-test your architecture decisions with a system design critique",
      "Generate benchmark/load-test scenarios",
    ],
    templates: [],
  },
  "data-ai": {
    summary: "Use AI to speed up the exploratory and repetitive parts of the data/quantitative workflow while keeping your own judgment on model validity.",
    useCases: [
      "Generate synthetic data for testing edge cases",
      "Run feature engineering experiments faster",
      "Get a second opinion on model evaluation and error analysis",
      "Draft experiment designs, then verify them yourself",
      "Automate repetitive data cleaning steps (with spot-checks)",
      "Accelerate literature/technique research for a new problem type",
      "Run simulations and Monte Carlo experiments faster (verify results independently)",
      "Get mathematical derivation assistance, then verify by hand",
    ],
    templates: [],
  },
  "biotech-life-sciences": {
    summary: "Use AI to move faster through literature and analysis while keeping wet-lab and experimental rigor entirely your own.",
    useCases: [
      "Literature discovery and synthesis across many papers",
      "Generate and refine research questions or hypotheses",
      "Compare experimental protocols before committing lab time to one",
      "Get a second pass on data analysis approaches",
      "Draft reproducible computational workflows/scripts",
      "Support for scientific writing (never for fabricating results)",
    ],
    templates: [],
  },
  healthcare: {
    summary: "Use AI for organization, planning, and learning support, never for clinical decisions or unsupervised patient-facing use.",
    useCases: [
      "Organize and summarize literature for study or case prep",
      "Plan study schedules for board/licensing exams",
      "Draft (non-clinical) documentation and administrative workflows",
      "Support structured data analysis for research projects",
      "Practice explaining clinical concepts clearly (for patient communication skills)",
    ],
    templates: [],
  },
  "science-research": {
    summary: "Use AI to accelerate the research loop (literature, hypothesis generation, and analysis) while keeping experimental and analytical rigor yours.",
    useCases: [
      "Literature discovery and cross-paper comparison",
      "Generate candidate hypotheses or research questions",
      "Draft reproducible analysis code/workflows",
      "Get a second pass on data analysis and interpretation",
      "Support for scientific writing and figure captions",
    ],
    templates: [],
  },
  law: {
    summary: "Use AI to speed up research and drafting while treating every citation and legal claim as something you must independently verify before relying on it.",
    useCases: [
      "Summarize and compare cases or statutes before deep-diving primary sources",
      "Draft a first pass of a memo or brief outline to react to and refine",
      "Get a second opinion on counterarguments to your position",
      "Practice oral argument by having AI role-play opposing counsel or a judge",
      "Clean up and tighten your own writing for clarity",
      "Never cite a case, statute, or fact an AI produced without verifying it yourself in a primary source",
    ],
    templates: [],
  },
  "business-finance": {
    summary: "Use AI to move faster through analysis and modeling while keeping the underlying business judgment and number-checking yours.",
    useCases: [
      "Draft a first-pass financial model or business case to refine, not to submit as-is",
      "Get a second opinion on a case-interview approach or business framework",
      "Summarize and compare company filings, earnings calls, or market research",
      "Stress-test your own thesis by asking AI to argue the opposite case",
      "Draft slides/decks faster, then rewrite the analysis in your own words",
      "Always independently verify any number an AI produces before using it in a model or pitch",
    ],
    templates: [],
  },
  "humanities-social-sciences": {
    summary: "Use AI to accelerate research and drafting while keeping the actual argument, evidence-checking, and final writing yours.",
    useCases: [
      "Summarize and compare sources before reading the primary material closely",
      "Draft a first-pass outline for a memo, brief, or paper to react to and rewrite",
      "Get a second opinion on counterarguments to your thesis",
      "Practice explaining your argument clearly to a non-expert",
      "Check your writing for clarity and unsupported claims",
      "Never cite a statistic, study, or source an AI produced without verifying it yourself",
    ],
    templates: [],
  },
};

/**
 * Merges AI-advantage guidance across every distinct category among the
 * student's target careers (deduplicated, order-preserving). Falls back to
 * generic guidance when none of the target careers resolved to structured
 * category data.
 */
export function getAIAdvantageForCategories(categories: (CareerCategory | null)[]): AIAdvantageSection {
  const unique = [...new Set(categories.filter((c): c is CareerCategory => c !== null))];

  if (unique.length === 0) {
    return {
      categories: [],
      summary: CORE_PRINCIPLE,
      useCases: [
        "Accelerate research and reading in your target field",
        "Get a second opinion / critique on your own work before submitting it",
        "Generate test cases or scenarios you might not think of yourself",
      ],
      templates: REUSABLE_TEMPLATES,
    };
  }

  const contents = unique.map((c) => CATEGORY_CONTENT[c]);
  const summary = unique.length === 1
    ? contents[0].summary
    : `${CORE_PRINCIPLE} Across your target careers: ${contents.map((c) => c.summary).join(" ")}`;

  const useCases = [...new Set(contents.flatMap((c) => c.useCases))];
  const templates = [...REUSABLE_TEMPLATES, ...contents.flatMap((c) => c.templates)];

  return { categories: unique, summary, useCases, templates };
}
