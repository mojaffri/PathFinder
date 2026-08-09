import type { ActivityEventView, TimeSeriesPoint } from "@/types";

const LABELS: Record<string, string> = {
  profile_created: "Profile created",
  onboarding_completed: "Onboarding completed",
  roadmap_saved: "Roadmap saved",
  adaptive_roadmap_recomputed: "Roadmap recalculated",
  adaptive_roadmap_task_updated: "Roadmap task updated",
  skill_evidence_added: "Skill evidence added",
  assessment_completed: "Assessment completed",
  readiness_changed: "Readiness changed",
  job_analyzed: "Job fit analyzed",
  application_created: "Application added",
  application_stage_changed: "Application stage changed",
  resume_updated: "Resume updated",
};

export function toActivityView(event: { id: string; type: string; payload: Record<string, unknown>; occurredAt: string }): ActivityEventView {
  return { ...event, label: LABELS[event.type] ?? event.type.replaceAll("_", " ") };
}

/** Only structured readiness events become history; no synthetic backfill. */
export function readinessHistoryFromEvents(events: Array<{ type: string; payload: Record<string, unknown>; occurredAt: string }>): TimeSeriesPoint[] {
  return events
    .filter((event) => event.type === "readiness_changed" && typeof event.payload.readiness === "number")
    .map((event) => ({ date: event.occurredAt, value: event.payload.readiness as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
