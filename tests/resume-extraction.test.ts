import test from "node:test";
import assert from "node:assert/strict";
import { extractResumeDataHeuristically } from "../lib/resume/heuristic-extractor";
import { reassembleLines } from "../lib/resume/text-normalize";

test("restores inline section boundaries after project prose", () => {
  const normalized = reassembleLines("Delivered three multiplayer modes. ACTIVITIES & LEADERSHIP\nTreasurer");
  assert.match(normalized, /modes\.\nACTIVITIES & LEADERSHIP/);
});

test("keeps distinct dateless projects and their descriptions separate", () => {
  const resume = reassembleLines(`
PROJECTS
JackPack: Social Party Game Collection
https://github.com/example/jackpack
- Built with Expo, React Native, and TypeScript.
- Added Supabase multiplayer synchronization.
PathFinder Career Roadmap
https://github.com/example/pathfinder
- Built a deterministic STEM career matching engine.
- Added editable resume extraction review.
ACTIVITIES & LEADERSHIP
Treasurer | Engineering Society | 2025 - Present
- Managed the annual budget.
`);
  const result = extractResumeDataHeuristically(resume);
  assert.equal(result.projects.length, 2);
  assert.equal(result.projects[0].title, "JackPack: Social Party Game Collection");
  assert.deepEqual(result.projects[0].bullets, ["Built with Expo, React Native, and TypeScript.", "Added Supabase multiplayer synchronization."]);
  assert.equal(result.projects[1].title, "PathFinder Career Roadmap");
  assert.deepEqual(result.projects[1].bullets, ["Built a deterministic STEM career matching engine.", "Added editable resume extraction review."]);
  assert.equal(result.projects.some((project) => project.title.includes("ACTIVITIES")), false);
});
