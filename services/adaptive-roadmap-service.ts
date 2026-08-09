import type { AdaptiveRoadmap, AdaptiveTask, AdaptiveTaskStatus, RoadmapChangeEvent, RoadmapChangeTrigger } from "@/types";

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function getAdaptiveRoadmap(): Promise<AdaptiveRoadmap | null> {
  const res = await fetch("/api/roadmap/adaptive");
  if (res.status === 401) return null;
  const data = (await parseJsonOrThrow(res)) as { roadmap: AdaptiveRoadmap | null };
  return data.roadmap;
}

export async function generateAdaptiveRoadmap(trigger: RoadmapChangeTrigger = "manual"): Promise<{ roadmap: AdaptiveRoadmap; changeEvent: RoadmapChangeEvent | null }> {
  const res = await fetch("/api/roadmap/adaptive/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trigger }),
  });
  return (await parseJsonOrThrow(res)) as { roadmap: AdaptiveRoadmap; changeEvent: RoadmapChangeEvent | null };
}

export async function updateAdaptiveTaskStatus(taskId: string, status: AdaptiveTaskStatus): Promise<{ task: AdaptiveTask; roadmap: AdaptiveRoadmap | null }> {
  const res = await fetch(`/api/roadmap/adaptive/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return (await parseJsonOrThrow(res)) as { task: AdaptiveTask; roadmap: AdaptiveRoadmap | null };
}
