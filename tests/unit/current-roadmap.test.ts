import { describe, expect, it } from "vitest";
import { selectCurrentAccelerateRoadmap } from "@/lib/roadmap/current-roadmap";
import type { SavedRoadmap } from "@/types";

describe("selectCurrentAccelerateRoadmap", () => {
  it("restores the newest Accelerate roadmap without treating a Discover guide as current", () => {
    const discover = { id: "discover", source: "discover" } as SavedRoadmap;
    const newestAccelerate = { id: "new", source: "accelerate" } as SavedRoadmap;
    const olderAccelerate = { id: "old", source: "accelerate" } as SavedRoadmap;
    expect(selectCurrentAccelerateRoadmap([discover, newestAccelerate, olderAccelerate])?.id).toBe("new");
  });

  it("returns null before the user has made an Accelerate roadmap", () => {
    expect(selectCurrentAccelerateRoadmap([])).toBeNull();
  });
});
