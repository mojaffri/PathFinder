import type { JobApplication, JobApplicationInput, SavedJobInsights } from "@/types";

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body && typeof body === "object" && "error" in body ? String(body.error) : `Request failed (${response.status})`);
  return body;
}

export async function getApplications(): Promise<JobApplication[]> {
  const response = await fetch("/api/applications");
  const data = await parseJsonOrThrow(response) as { applications: JobApplication[] };
  return data.applications;
}

export async function createApplication(input: JobApplicationInput): Promise<JobApplication> {
  const response = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  return (await parseJsonOrThrow(response) as { application: JobApplication }).application;
}

export async function updateApplication(id: string, input: JobApplicationInput): Promise<JobApplication> {
  const response = await fetch(`/api/applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  return (await parseJsonOrThrow(response) as { application: JobApplication }).application;
}

export async function deleteApplication(id: string): Promise<void> {
  await parseJsonOrThrow(await fetch(`/api/applications/${id}`, { method: "DELETE" }));
}

export async function getSavedJobInsights(): Promise<SavedJobInsights> {
  const response = await fetch("/api/jobs/insights");
  return (await parseJsonOrThrow(response) as { insights: SavedJobInsights }).insights;
}
