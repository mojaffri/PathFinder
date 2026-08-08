import test from "node:test";
import assert from "node:assert/strict";
import { extractResumeDataHeuristically } from "../lib/resume/heuristic-extractor";
import { reassembleLines } from "../lib/resume/text-normalize";
import { normalizeResumeExtraction } from "../lib/resume/normalize-extraction";
import type { ResumeExtraction } from "../lib/resume/schema";

test("restores inline section boundaries after project prose", () => {
  const normalized = reassembleLines("Delivered three multiplayer modes. ACTIVITIES & LEADERSHIP\nTreasurer");
  assert.match(normalized, /modes\.\nACTIVITIES & LEADERSHIP/);
});

test("keeps unmarked action lines under an inline-linked project title", () => {
  const resume = reassembleLines(`
TECHNICAL PROJECTS
PathFinder: AI Career and Academic Roadmap Engine https://github.com/example/pathfinder
Developed a roadmap engine mapping careers to competencies and identifying skill gaps.
Implemented structured resume parsing and editable review flows.
JackPack: Social Party Game Collection https://github.com/example/jackpack
Implemented multiplayer via Supabase auth, Postgres tables, and Realtime updates.
Delivered eight single-device games and three multiplayer modes.
EDUCATION
Example University
`);
  const result = extractResumeDataHeuristically(resume);
  assert.equal(result.projects.length, 2);
  assert.equal(result.projects[0].title, "PathFinder: AI Career and Academic Roadmap Engine");
  assert.deepEqual(result.projects[0].bullets, [
    "https://github.com/example/pathfinder",
    "Developed a roadmap engine mapping careers to competencies and identifying skill gaps.",
    "Implemented structured resume parsing and editable review flows.",
  ]);
  assert.equal(result.projects[1].title, "JackPack: Social Party Game Collection");
  assert.equal(result.projects[1].bullets[1], "Implemented multiplayer via Supabase auth, Postgres tables, and Realtime updates.");
});

test("merges AI-produced orphan description cards into the preceding project", () => {
  const extraction: ResumeExtraction = {
    educationStage: null, education: [], experience: [], awards: [], certifications: [], skills: [],
    extractionConfidence: "medium", followUpQuestions: [],
    projects: [
      { id: "p1", title: "PathFinder: AI Career and Academic Roadmap Engine", technologies: ["Next.js"], date: null, summary: null, bullets: [] },
      { id: "p2", title: "Developed a roadmap engine mapping careers to competencies and identifying skill gaps to guide personalized development.", technologies: [], date: null, summary: null, bullets: [] },
      { id: "p3", title: "JackPack: Social Party Game Collection https://github.com/example/jackpack", technologies: [], date: null, summary: null, bullets: [] },
      { id: "p4", title: "Implemented multiplayer via Supabase auth, Postgres tables, and Realtime updates to sync game state.", technologies: [], date: null, summary: null, bullets: [] },
    ],
  };
  const result = normalizeResumeExtraction(extraction);
  assert.equal(result.projects.length, 2);
  assert.equal(result.projects[0].bullets[0], "Developed a roadmap engine mapping careers to competencies and identifying skill gaps to guide personalized development.");
  assert.equal(result.projects[1].title, "JackPack: Social Party Game Collection");
  assert.equal(result.projects[1].bullets[0], "https://github.com/example/jackpack");
  assert.equal(result.projects[1].bullets[1], "Implemented multiplayer via Supabase auth, Postgres tables, and Realtime updates to sync game state.");
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
  assert.deepEqual(result.projects[0].bullets, ["https://github.com/example/jackpack", "Built with Expo, React Native, and TypeScript.", "Added Supabase multiplayer synchronization."]);
  assert.equal(result.projects[1].title, "PathFinder Career Roadmap");
  assert.deepEqual(result.projects[1].bullets, ["https://github.com/example/pathfinder", "Built a deterministic STEM career matching engine.", "Added editable resume extraction review."]);
  assert.equal(result.projects.some((project) => project.title.includes("ACTIVITIES")), false);
});
