import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/github/client", () => ({
  fetchRepo: vi.fn(),
  fetchLanguages: vi.fn(),
  fetchTree: vi.fn(),
  fetchFileContent: vi.fn(),
}));

const { fetchRepo, fetchLanguages, fetchTree, fetchFileContent } = await import("@/lib/github/client");
const { analyzeRepository } = await import("@/lib/github/analyze-repo");

const REPO_DATA = {
  name: "titrate",
  owner: { login: "student" },
  full_name: "student/titrate",
  description: "Gaussian-process optimization toolkit",
  html_url: "https://github.com/student/titrate",
  default_branch: "main",
  stargazers_count: 12,
  forks_count: 2,
  open_issues_count: 1,
  size: 340,
  pushed_at: "2026-01-01T00:00:00Z",
  created_at: "2025-01-01T00:00:00Z",
  fork: false,
  archived: false,
  private: false,
  language: "Python",
};

describe("analyzeRepository", () => {
  it("produces a full RepoAnalysis from repo metadata + languages + tree + manifests (no AI key, deterministic narrative)", async () => {
    vi.mocked(fetchRepo).mockResolvedValue(REPO_DATA);
    vi.mocked(fetchLanguages).mockResolvedValue({ Python: 9000, Shell: 1000 });
    vi.mocked(fetchTree).mockResolvedValue({
      tree: [
        { path: "README.md", type: "blob", sha: "1" },
        { path: "requirements.txt", type: "blob", sha: "2" },
        { path: "tests/test_optimizer.py", type: "blob", sha: "3" },
        { path: ".github/workflows/ci.yml", type: "blob", sha: "4" },
        { path: "src/optimizer.py", type: "blob", sha: "5" },
      ],
      truncated: false,
    });
    vi.mocked(fetchFileContent).mockResolvedValue("pytest\nscikit-learn\nnumpy");

    const analysis = await analyzeRepository("student", "titrate");

    expect(analysis.fullName).toBe("student/titrate");
    expect(analysis.primaryLanguage).toBe("Python");
    expect(analysis.languages[0].language).toBe("Python");
    expect(analysis.detectedSignals.find((s) => s.key === "readme")?.detected).toBe(true);
    expect(analysis.detectedSignals.find((s) => s.key === "testing")?.detected).toBe(true);
    expect(analysis.detectedSignals.find((s) => s.key === "cicd")?.detected).toBe(true);
    expect(analysis.skillEvidence.some((s) => s.skill === "Python")).toBe(true);
    expect(analysis.summary.length).toBeGreaterThan(0);
    // Metadata carried through, but never used to set detector confidence/skill strength.
    expect(analysis.metadata.stars).toBe(12);
  });

  it("degrades gracefully when languages/tree calls fail — still returns a valid (sparser) analysis", async () => {
    vi.mocked(fetchRepo).mockResolvedValue(REPO_DATA);
    vi.mocked(fetchLanguages).mockRejectedValue(new Error("boom"));
    vi.mocked(fetchTree).mockRejectedValue(new Error("boom"));

    const analysis = await analyzeRepository("student", "titrate");
    expect(analysis.languages).toEqual([]);
    expect(analysis.detectedSignals.every((s) => s.detected === false)).toBe(true);
    expect(analysis.summary.length).toBeGreaterThan(0);
  });
});
