import { STORAGE_KEYS } from "@/lib/storage/keys";
import { readJSON, writeJSON } from "@/lib/storage/local-storage";
import type { SavedRoadmap } from "@/types";

function getAll(): SavedRoadmap[] {
  return readJSON<SavedRoadmap[]>(STORAGE_KEYS.roadmaps) ?? [];
}

export function getRoadmaps(userId?: string): SavedRoadmap[] {
  const all = getAll();
  const filtered = userId ? all.filter((r) => r.userId === userId) : all;
  return [...filtered].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getRoadmap(id: string): SavedRoadmap | null {
  return getAll().find((r) => r.id === id) ?? null;
}

export function saveRoadmap(roadmap: SavedRoadmap): void {
  const all = getAll();
  const index = all.findIndex((r) => r.id === roadmap.id);

  if (index === -1) {
    all.push(roadmap);
  } else {
    all[index] = roadmap;
  }

  writeJSON(STORAGE_KEYS.roadmaps, all);
}

export function deleteRoadmap(id: string): void {
  writeJSON(
    STORAGE_KEYS.roadmaps,
    getAll().filter((r) => r.id !== id),
  );
}
