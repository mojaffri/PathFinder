import type { SavedRoadmap } from "@/types";

/** Roadmaps arrive newest-first from the repository. Discover guides remain archived but never replace Accelerate's current plan. */
export function selectCurrentAccelerateRoadmap(roadmaps: SavedRoadmap[]): SavedRoadmap | null {
  return roadmaps.find((roadmap) => roadmap.source === "accelerate") ?? null;
}
