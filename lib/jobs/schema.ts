import { z } from "zod";

/**
 * Shape of job-description extraction, shared by the AI extraction path and
 * the heuristic fallback (same contract `lib/resume/schema.ts` establishes
 * for resumes) — every field is present either way, so callers never branch
 * on which path produced the data. `requirements` is deliberately flat
 * (not nested by required/preferred) so it maps 1:1 onto `job_requirements`
 * rows, which the review UI edits individually.
 */

export const JOB_REQUIREMENT_CATEGORIES = ["required", "preferred"] as const;
export const JOB_REQUIREMENT_KINDS = ["skill", "tool", "experience", "education"] as const;

const JobRequirementSchema = z.object({
  category: z.enum(JOB_REQUIREMENT_CATEGORIES),
  kind: z.enum(JOB_REQUIREMENT_KINDS),
  label: z.string().min(1).max(160),
  minYears: z.number().min(0).max(40).nullable(),
});

export const JobExtractionSchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  minExperienceYears: z.number().min(0).max(40).nullable(),
  preferredExperienceYears: z.number().min(0).max(40).nullable(),
  educationRequirement: z.string().nullable(),
  responsibilities: z.array(z.string()).max(15),
  keywords: z.array(z.string()).max(25),
  requirements: z.array(JobRequirementSchema).max(40),
  extractionConfidence: z.enum(["low", "medium", "high"]),
});

export type JobRequirementExtraction = z.infer<typeof JobRequirementSchema>;
export type JobExtraction = z.infer<typeof JobExtractionSchema>;

// JSON schema mirror of JobExtractionSchema, used as the Anthropic tool
// input schema so the model is constrained to return exactly this shape —
// same pattern as lib/resume/schema.ts#RESUME_EXTRACTION_JSON_SCHEMA.
const nullableString = { type: ["string", "null"] };
const nullableNumber = { type: ["number", "null"] };
const stringArray = { type: "array", items: { type: "string" } };

export const JOB_EXTRACTION_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    title: { ...nullableString, description: "The job title being advertised, as written." },
    company: { ...nullableString, description: "The hiring company/organization name, if identifiable." },
    minExperienceYears: { ...nullableNumber, description: "Minimum years of experience explicitly required, if stated." },
    preferredExperienceYears: { ...nullableNumber, description: "Preferred/bonus years of experience, if stated separately from the minimum." },
    educationRequirement: { ...nullableString, description: "The minimum education level/degree required, e.g. \"Bachelor's in Computer Science or related field\"." },
    responsibilities: { ...stringArray, description: "The day-to-day responsibilities/duties listed for the role." },
    keywords: { ...stringArray, description: "Notable keywords/terms from the posting useful for a quick scan — not already captured in requirements." },
    requirements: {
      type: "array",
      description: "Every individual required or preferred skill, tool, experience threshold, or education credential mentioned, as one entry each.",
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: JOB_REQUIREMENT_CATEGORIES as unknown as string[], description: "\"required\" for must-haves, \"preferred\" for nice-to-haves/bonus qualifications." },
          kind: { type: "string", enum: JOB_REQUIREMENT_KINDS as unknown as string[] },
          label: { type: "string", description: "The specific skill/tool/credential name, e.g. \"Python\", \"AWS\", \"PostgreSQL\", \"Bachelor's degree\"." },
          minYears: { ...nullableNumber, description: "Only for kind=\"experience\": years required, e.g. 3 for \"3+ years of Python\"." },
        },
        required: ["category", "kind", "label", "minYears"],
      },
    },
    extractionConfidence: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: ["title", "company", "minExperienceYears", "preferredExperienceYears", "educationRequirement", "responsibilities", "keywords", "requirements", "extractionConfidence"],
};
