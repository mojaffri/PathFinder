import { z } from "zod";

/**
 * Shape of resume data extraction, shared by both the AI extraction path and
 * the heuristic fallback so callers can treat them identically.
 * `extractionMethod` is attached by the route handler after validation, not
 * produced by either extractor.
 *
 * Experience/projects/awards/education are structured objects (not tag
 * strings) so real information — dates, organizations, bullet achievements —
 * survives all the way to profile storage and roadmap generation.
 */

const EducationRecordSchema = z.object({
  id: z.string(),
  institution: z.string().nullable(),
  degree: z.string().nullable(),
  major: z.string().nullable(),
  gpa: z.number().min(0).max(100).nullable(),
  gpaScale: z.enum(["4.0", "5.0", "100", "other"]).nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

const ExperienceRecordSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  organization: z.string().nullable(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  summary: z.string().nullable(),
  bullets: z.array(z.string()).max(8),
});

const ProjectRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  technologies: z.array(z.string()).max(12),
  date: z.string().nullable(),
  summary: z.string().nullable(),
  bullets: z.array(z.string()).max(8),
});

const AwardRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  organization: z.string().nullable(),
  date: z.string().nullable(),
  description: z.string().nullable(),
});

const CertificationRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string().nullable(),
  date: z.string().nullable(),
});

export const ResumeExtractionSchema = z.object({
  educationStage: z.string().nullable(),
  education: z.array(EducationRecordSchema).max(5),
  experience: z.array(ExperienceRecordSchema).max(10),
  projects: z.array(ProjectRecordSchema).max(10),
  awards: z.array(AwardRecordSchema).max(10),
  certifications: z.array(CertificationRecordSchema).max(10),
  skills: z.array(z.string()).max(40),
  extractionConfidence: z.enum(["low", "medium", "high"]),
  followUpQuestions: z.array(z.string()).max(5),
});

export type ResumeExtraction = z.infer<typeof ResumeExtractionSchema>;

// JSON schema mirror of ResumeExtractionSchema, used as the Anthropic tool
// input schema so the model is constrained to return exactly this shape.
const idField = { type: "string", description: "A short unique id you generate, e.g. 'edu-1', 'exp-1'." };
const nullableString = { type: ["string", "null"] };
const stringArray = { type: "array", items: { type: "string" } };

export const RESUME_EXTRACTION_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    educationStage: {
      type: ["string", "null"],
      description:
        "The student's CURRENT standing, one of exactly: high-school-freshman, high-school-sophomore, high-school-junior, high-school-senior, recent-hs-grad-gap-year, college-freshman, college-sophomore, college-junior, college-senior, recent-college-grad-undecided, bootcamp-alternative-student, graduate-student, career-changer. Use null if it can't be determined confidently.",
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: idField,
          institution: nullableString,
          degree: {
            ...nullableString,
            description:
              "ONLY the credential name, e.g. 'Bachelor of Science' or 'B.S.' — never include the major, GPA, or dates here even if they appeared right next to the degree on the resume.",
          },
          major: { ...nullableString, description: "The field of study, kept separate from the degree name above." },
          gpa: { type: ["number", "null"] },
          gpaScale: { type: ["string", "null"], enum: ["4.0", "5.0", "100", "other", null] },
          startDate: { ...nullableString, description: "As written on the resume, e.g. 'Aug 2025'" },
          endDate: { ...nullableString, description: "As written on the resume, e.g. 'Present' or 'May 2027'" },
        },
        required: ["id", "institution", "degree", "major", "gpa", "gpaScale", "startDate", "endDate"],
      },
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: idField,
          title: nullableString,
          organization: nullableString,
          location: nullableString,
          startDate: nullableString,
          endDate: nullableString,
          summary: { ...nullableString, description: "One-sentence summary if the entry has no bullets" },
          bullets: {
            ...stringArray,
            description:
              "Polished, professional bullet points describing what was done. Consolidate fragmented/repetitive source lines into clean bullets, but never invent achievements, numbers, or technologies not in the source text. Use an explicit bracket placeholder like '[quantify impact]' if a bullet is missing a metric — never fabricate one.",
          },
        },
        required: ["id", "title", "organization", "location", "startDate", "endDate", "summary", "bullets"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: idField,
          title: { type: "string" },
          technologies: { ...stringArray, description: "Tools/languages/frameworks used, as short tags" },
          date: nullableString,
          summary: nullableString,
          bullets: { ...stringArray, description: "Same consolidation rules as experience bullets." },
        },
        required: ["id", "title", "technologies", "date", "summary", "bullets"],
      },
    },
    awards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: idField,
          name: { type: "string" },
          organization: nullableString,
          date: nullableString,
          description: nullableString,
        },
        required: ["id", "name", "organization", "date", "description"],
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: idField,
          name: { type: "string" },
          issuer: nullableString,
          date: nullableString,
        },
        required: ["id", "name", "issuer", "date"],
      },
    },
    skills: {
      ...stringArray,
      description:
        "Every concrete skill/tool/technology mentioned anywhere in the resume — programming languages, software, engineering/lab tools, technical methods. Deduplicate near-identical mentions into one clean entry.",
    },
    extractionConfidence: { type: "string", enum: ["low", "medium", "high"] },
    followUpQuestions: {
      ...stringArray,
      description: "Targeted questions to ask if the resume is missing key information",
    },
  },
  required: ["educationStage", "education", "experience", "projects", "awards", "certifications", "skills", "extractionConfidence", "followUpQuestions"],
};
