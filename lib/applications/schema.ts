import { z } from "zod";
import { APPLICATION_STATUSES } from "@/types";

const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

export const ApplicationInputSchema = z.object({
  jobDescriptionId: z.uuid().nullable(),
  company: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(200),
  jobDescription: z.string().trim().max(30_000).nullable(),
  sourceUrl: z.url().max(2_000).nullable(),
  fitScore: z.number().int().min(0).max(100).nullable(),
  applicationDate: optionalDate,
  currentStage: z.enum(APPLICATION_STATUSES),
  interviewDates: z.array(optionalDate.unwrap()).max(20),
  notes: z.string().trim().max(10_000).nullable(),
  gapsAtApplication: z.array(z.object({
    label: z.string().trim().min(1).max(200),
    category: z.enum(["required", "preferred"]),
    status: z.enum(["partial", "missing"]),
  })).max(200),
});
