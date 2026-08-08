import type { JobDescription, JobDescriptionSummary, JobFitAnalysis } from "@/types";

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function getJobDescriptions(): Promise<JobDescriptionSummary[]> {
  const res = await fetch("/api/jobs");
  if (res.status === 401) return [];
  const data = (await parseJsonOrThrow(res)) as { jobs: JobDescriptionSummary[] };
  return data.jobs;
}

export async function analyzeJobDescription(rawText: string): Promise<JobDescription> {
  const res = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText }),
  });
  const data = (await parseJsonOrThrow(res)) as { job: JobDescription };
  return data.job;
}

export async function getJobDescription(id: string): Promise<JobDescription | null> {
  const res = await fetch(`/api/jobs/${id}`);
  if (res.status === 401 || res.status === 404) return null;
  const data = (await parseJsonOrThrow(res)) as { job: JobDescription };
  return data.job;
}

export async function updateJobDescription(id: string, job: JobDescription): Promise<JobDescription> {
  const res = await fetch(`/api/jobs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  const data = (await parseJsonOrThrow(res)) as { job: JobDescription };
  return data.job;
}

export async function deleteJobDescription(id: string): Promise<void> {
  await fetch(`/api/jobs/${id}`, { method: "DELETE" });
}

export async function runJobFitAnalysis(id: string): Promise<JobFitAnalysis> {
  const res = await fetch(`/api/jobs/${id}/match`, { method: "POST" });
  const data = (await parseJsonOrThrow(res)) as { analysis: JobFitAnalysis };
  return data.analysis;
}
