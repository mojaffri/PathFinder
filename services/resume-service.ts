import type { ResumeUploadResult, ResumeVersion } from "@/types";

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function uploadResume(file: File): Promise<ResumeUploadResult> {
  const formData = new FormData();
  formData.append("resume", file);
  const res = await fetch("/api/resume", { method: "POST", body: formData });
  return (await parseJsonOrThrow(res)) as ResumeUploadResult;
}

export async function getResumes(): Promise<ResumeVersion[]> {
  const res = await fetch("/api/resumes");
  if (res.status === 401) return [];
  const data = (await parseJsonOrThrow(res)) as { resumes: ResumeVersion[] };
  return data.resumes;
}

export async function setActiveResume(id: string): Promise<void> {
  await parseJsonOrThrow(await fetch(`/api/resumes/${id}`, { method: "PATCH" }));
}

export async function deleteResume(id: string): Promise<void> {
  await parseJsonOrThrow(await fetch(`/api/resumes/${id}`, { method: "DELETE" }));
}

export async function reanalyzeResume(id: string): Promise<ResumeUploadResult> {
  const res = await fetch(`/api/resumes/${id}/reanalyze`, { method: "POST" });
  return (await parseJsonOrThrow(res)) as ResumeUploadResult;
}

export async function getResumeDownloadUrl(id: string): Promise<string> {
  const res = await fetch(`/api/resumes/${id}/file`);
  const data = (await parseJsonOrThrow(res)) as { url: string };
  return data.url;
}
