import { z } from "zod";
import { EDUCATION_STAGES, type EducationStage } from "../../types/profile";

const RatingScaleSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

const GpaInfoSchema = z.object({
  raw: z.number().nullable(),
  scale: z.enum(["4.0", "5.0", "100", "other"]),
  normalized4: z.number().nullable(),
});

const EducationRecordSchema = z.object({
  id: z.string(),
  institution: z.string().nullable(),
  degree: z.string().nullable(),
  major: z.string().nullable(),
  gpa: z.number().nullable(),
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
  bullets: z.array(z.string()),
});

const ProjectRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  technologies: z.array(z.string()),
  date: z.string().nullable(),
  summary: z.string().nullable(),
  bullets: z.array(z.string()),
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

export const RoadmapRequestSchema = z.object({
  name: z.string(),
  age: z.number().nullable(),
  educationStage: z.enum(EDUCATION_STAGES.map((stage) => stage.value) as [EducationStage, ...EducationStage[]]).nullable(),
  school: z.string(),
  major: z.string(),
  gpa: GpaInfoSchema,
  education: z.array(EducationRecordSchema),
  targetIndustry: z.string(),
  targetCareers: z.array(z.string().min(1)).min(1, "At least one target career is required").max(5, "Up to 5 target careers for a focused roadmap"),
  currentSkills: z.array(z.string()),
  interests: z.array(z.string()),
  experience: z.array(ExperienceRecordSchema),
  projects: z.array(ProjectRecordSchema),
  awards: z.array(AwardRecordSchema),
  certifications: z.array(CertificationRecordSchema),
  careerGoals: z.string(),
  weeklyHoursAvailable: z.number().nullable(),
});

export type RoadmapRequest = z.infer<typeof RoadmapRequestSchema>;

// ---- Shapes the AI (or fallback) is responsible for generating. ----
// Gap analysis, top moves, AI-advantage content, and the target-resume
// benchmark are computed deterministically elsewhere and merged in by the
// route handler — the model only writes the narrative built on top of them.

const RecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  tier: z.enum(["must-do", "high-leverage", "nice-to-have"]),
  impact: RatingScaleSchema,
  effort: RatingScaleSchema,
  estimatedHours: z.number().min(1).max(400),
  prerequisite: z.string().nullable(),
  whyItMatters: z.string(),
  evidenceOfCompletion: z.string(),
});

const MilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedHours: z.number().min(1).max(400),
  impact: RatingScaleSchema,
  evidenceOfCompletion: z.string(),
});

const PhaseSchema = z.object({
  key: z.enum(["academic-technical-edge", "experience-portfolio", "execution-interview"]),
  title: z.string(),
  objective: z.string(),
  timeline: z.string(),
  whyItMattersForTarget: z.string(),
  milestones: z.array(MilestoneSchema).min(1).max(5),
  recommendedActions: z.array(RecommendationSchema).min(1).max(6),
  resources: z.array(z.string()).max(8),
});

const CertificationGuidanceSchema = z.object({
  name: z.string(),
  recommend: z.boolean(),
  reasoning: z.string(),
});

export const AIRoadmapContentSchema = z.object({
  executiveSummary: z.string(),
  currentProfileAssessment: z.string(),
  competitiveAdvantages: z.array(z.string()).max(6),
  mistakesToAvoid: z.array(z.string()).max(6),
  phases: z.array(PhaseSchema).length(3),
  certificationGuidance: z.array(CertificationGuidanceSchema).max(6),
  portfolioIdeas: z.array(z.string()).max(8),
  interviewPreparation: z.array(z.string()).max(8),
  recommendedTools: z.array(z.string()).max(10),
  recommendedResources: z.array(z.string()).max(8),
  realityCheck: z.string(),
});

export type AIRoadmapContent = z.infer<typeof AIRoadmapContentSchema>;

const stringArray = { type: "array" as const, items: { type: "string" as const } };
const hoursField = { type: "number", description: "A realistic hour estimate (e.g. 10, 20, 40), not a vague label." };
const recommendationSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string" },
    title: {
      type: "string",
      description: "A granular, tactical, step-by-step task, e.g. 'Schedule 3 practice tests using NCEES official study materials'. Must NOT restate any milestone title in this phase.",
    },
    tier: { type: "string", enum: ["must-do", "high-leverage", "nice-to-have"] },
    impact: { type: "number", enum: [1, 2, 3, 4, 5] },
    effort: { type: "number", enum: [1, 2, 3, 4, 5] },
    estimatedHours: hoursField,
    prerequisite: { type: ["string", "null"] },
    whyItMatters: { type: "string" },
    evidenceOfCompletion: { type: "string" },
  },
  required: ["id", "title", "tier", "impact", "effort", "estimatedHours", "prerequisite", "whyItMatters", "evidenceOfCompletion"],
};

export const AI_ROADMAP_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    executiveSummary: { type: "string" },
    currentProfileAssessment: { type: "string" },
    competitiveAdvantages: stringArray,
    mistakesToAvoid: stringArray,
    phases: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          key: {
            type: "string",
            enum: ["academic-technical-edge", "experience-portfolio", "execution-interview"],
          },
          title: { type: "string" },
          objective: { type: "string" },
          timeline: {
            type: "string",
            description: "A short placeholder phrase; the app recalculates the real month window from milestone hours afterward, so don't guess specific month numbers.",
          },
          whyItMattersForTarget: { type: "string" },
          milestones: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: {
                  type: "string",
                  description: "The big, phase-level target, e.g. 'Clear the FE Chemical Exam'. Distinct from and higher-level than any recommendedAction title in this phase.",
                },
                description: { type: "string" },
                estimatedHours: hoursField,
                impact: { type: "number", enum: [1, 2, 3, 4, 5] },
                evidenceOfCompletion: { type: "string" },
              },
              required: ["id", "title", "description", "estimatedHours", "impact", "evidenceOfCompletion"],
            },
          },
          recommendedActions: { type: "array", items: recommendationSchema },
          resources: stringArray,
        },
        required: ["key", "title", "objective", "timeline", "whyItMattersForTarget", "milestones", "recommendedActions", "resources"],
      },
    },
    certificationGuidance: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          recommend: { type: "boolean" },
          reasoning: { type: "string" },
        },
        required: ["name", "recommend", "reasoning"],
      },
    },
    portfolioIdeas: stringArray,
    interviewPreparation: stringArray,
    recommendedTools: stringArray,
    recommendedResources: stringArray,
    realityCheck: { type: "string" },
  },
  required: [
    "executiveSummary",
    "currentProfileAssessment",
    "competitiveAdvantages",
    "mistakesToAvoid",
    "phases",
    "certificationGuidance",
    "portfolioIdeas",
    "interviewPreparation",
    "recommendedTools",
    "recommendedResources",
    "realityCheck",
  ],
};
