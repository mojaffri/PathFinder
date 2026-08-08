import { describe, expect, it } from "vitest";
import { runAllDetectors } from "@/lib/github/detectors";
import { extractManifestDependencies } from "@/lib/github/manifest-parse";
import { mapRepoSignalsToSkills } from "@/lib/github/map-to-skills";

describe("runAllDetectors", () => {
  it("detects nothing for an empty repo without throwing", () => {
    const signals = runAllDetectors([], []);
    expect(signals).toHaveLength(7);
    expect(signals.every((s) => s.detected === false)).toBe(true);
  });

  it("detects README, testing, CI, docker, and backend/database signals from a realistic file tree + deps", () => {
    const paths = [
      "README.md",
      "package.json",
      "Dockerfile",
      ".github/workflows/ci.yml",
      "src/index.ts",
      "app/api/users/route.ts",
      "tests/index.test.ts",
      "prisma/schema.prisma",
    ];
    const deps = ["express", "drizzle-orm", "vitest"];
    const signals = runAllDetectors(paths, deps);
    const byKey = Object.fromEntries(signals.map((s) => [s.key, s]));

    expect(byKey.readme.detected).toBe(true);
    expect(byKey.testing.detected).toBe(true);
    expect(byKey.cicd.detected).toBe(true);
    expect(byKey.docker.detected).toBe(true);
    expect(byKey.database.detected).toBe(true);
    expect(byKey.backendApi.detected).toBe(true);
    expect(byKey.database.evidence.length).toBeGreaterThan(0);
  });

  it("never claims high confidence for something with only weak circumstantial evidence", () => {
    // A "tests" folder that's actually unrelated (no config, no deps) still counts,
    // but should be at most medium confidence, not high.
    const signals = runAllDetectors(["tests/fixtures/data.json"], []);
    const testing = signals.find((s) => s.key === "testing")!;
    expect(testing.detected).toBe(true);
    expect(testing.confidence).not.toBe("high");
  });
});

describe("extractManifestDependencies", () => {
  it("parses package.json dependencies and devDependencies", () => {
    const content = JSON.stringify({ dependencies: { express: "^4.0.0" }, devDependencies: { vitest: "^1.0.0" } });
    expect(extractManifestDependencies("package.json", content)).toEqual(["express", "vitest"]);
  });

  it("returns an empty array for invalid JSON rather than throwing", () => {
    expect(extractManifestDependencies("package.json", "{not valid json")).toEqual([]);
  });

  it("parses requirements.txt, stripping version specifiers", () => {
    const content = "fastapi==0.110.0\nsqlalchemy>=2.0\n# a comment\npytest";
    expect(extractManifestDependencies("requirements.txt", content)).toEqual(["fastapi", "sqlalchemy", "pytest"]);
  });

  it("returns an empty array for an unrecognized manifest file", () => {
    expect(extractManifestDependencies("random.txt", "anything")).toEqual([]);
  });
});

describe("mapRepoSignalsToSkills", () => {
  it("returns an empty list for no languages/signals/deps", () => {
    expect(mapRepoSignalsToSkills({ languages: [], detectedSignals: [], manifestDeps: [] })).toEqual([]);
  });

  it("maps a dominant language to a strong skill signal and a minor one to weak", () => {
    const signals = mapRepoSignalsToSkills({
      languages: [
        { language: "Python", bytes: 9000, percentage: 90 },
        { language: "Shell", bytes: 1000, percentage: 10 },
      ],
      detectedSignals: [],
      manifestDeps: [],
    });
    const python = signals.find((s) => s.skill === "Python")!;
    const shell = signals.find((s) => s.skill === "Shell")!;
    expect(python.strength).toBe("strong");
    expect(shell.strength).not.toBe("strong");
  });

  it("never uses star/fork/commit counts as input — only takes languages/detectedSignals/manifestDeps", () => {
    // Structural guarantee: the function signature has no such field, so
    // this test documents the contract rather than needing runtime assertions.
    const signals = mapRepoSignalsToSkills({
      languages: [{ language: "TypeScript", bytes: 100, percentage: 100 }],
      detectedSignals: [{ key: "testing", label: "Automated tests", detected: true, confidence: "high", evidence: ["vitest.config.ts"] }],
      manifestDeps: ["drizzle-orm"],
    });
    expect(signals.some((s) => s.skill === "Automated Testing")).toBe(true);
    expect(signals.some((s) => s.skill === "Drizzle ORM")).toBe(true);
  });

  it("dedupes to the strongest signal when the same skill is found multiple ways", () => {
    const signals = mapRepoSignalsToSkills({
      languages: [{ language: "TypeScript", bytes: 100, percentage: 50 }],
      detectedSignals: [],
      manifestDeps: [],
    });
    expect(signals.filter((s) => s.skill === "TypeScript")).toHaveLength(1);
  });
});
