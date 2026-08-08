import type { SavedRoadmap } from "@/types";

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function getRoadmaps(): Promise<SavedRoadmap[]> {
  const res = await fetch("/api/roadmaps");
  if (res.status === 401) return [];
  const data = (await parseJsonOrThrow(res)) as { roadmaps: SavedRoadmap[] };
  return data.roadmaps;
}

export async function getRoadmap(id: string): Promise<SavedRoadmap | null> {
  const res = await fetch(`/api/roadmaps/${id}`);
  if (res.status === 401 || res.status === 404) return null;
  const data = (await parseJsonOrThrow(res)) as { roadmap: SavedRoadmap };
  return data.roadmap;
}

export async function saveRoadmap(roadmap: SavedRoadmap): Promise<SavedRoadmap> {
  const res = await fetch("/api/roadmaps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(roadmap),
  });
  const data = (await parseJsonOrThrow(res)) as { roadmap: SavedRoadmap };
  return data.roadmap;
}

export async function deleteRoadmap(id: string): Promise<void> {
  await fetch(`/api/roadmaps/${id}`, { method: "DELETE" });
}
