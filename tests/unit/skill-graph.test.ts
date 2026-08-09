import { describe, expect, it } from "vitest";
import type { SkillNode } from "@/types/skill-graph";
import {
  SkillGraphValidationError,
  buildSkillGraphIndex,
  detectCycle,
  getBlockedSkills,
  getUnmetPrerequisites,
  graphDepth,
  resolveTransitivePrerequisites,
  topologicalOrder,
} from "@/lib/roadmap/skill-graph";
import { SKILL_GRAPH_NODES } from "@/data/skill-graph";

function node(overrides: Partial<SkillNode> & { id: string }): SkillNode {
  return {
    name: overrides.id,
    category: "software-tech",
    prerequisites: [],
    estimatedHours: 10,
    importanceByCareer: {},
    skillForgeModuleId: null,
    relatedGapKeywords: [],
    ...overrides,
  };
}

describe("detectCycle", () => {
  it("returns null for an acyclic graph", () => {
    expect(detectCycle([node({ id: "a" }), node({ id: "b", prerequisites: ["a"] })])).toBeNull();
  });

  it("returns null for an empty graph", () => {
    expect(detectCycle([])).toBeNull();
  });

  it("detects a direct two-node cycle", () => {
    const cycle = detectCycle([
      node({ id: "a", prerequisites: ["b"] }),
      node({ id: "b", prerequisites: ["a"] }),
    ]);
    expect(cycle).not.toBeNull();
    expect(cycle).toContain("a");
    expect(cycle).toContain("b");
  });

  it("detects a longer indirect cycle", () => {
    const cycle = detectCycle([
      node({ id: "a", prerequisites: ["c"] }),
      node({ id: "b", prerequisites: ["a"] }),
      node({ id: "c", prerequisites: ["b"] }),
    ]);
    expect(cycle).not.toBeNull();
  });

  it("a self-referencing node is its own cycle", () => {
    const cycle = detectCycle([node({ id: "a", prerequisites: ["a"] })]);
    expect(cycle).toEqual(["a", "a"]);
  });
});

describe("buildSkillGraphIndex", () => {
  it("builds cleanly from the real curated skill graph data (no cycles, no dangling prerequisites)", () => {
    expect(() => buildSkillGraphIndex(SKILL_GRAPH_NODES)).not.toThrow();
  });

  it("throws SkillGraphValidationError on a dangling prerequisite id", () => {
    expect(() => buildSkillGraphIndex([node({ id: "a", prerequisites: ["missing"] })])).toThrow(
      SkillGraphValidationError,
    );
  });

  it("throws SkillGraphValidationError on a cycle", () => {
    expect(() =>
      buildSkillGraphIndex([node({ id: "a", prerequisites: ["b"] }), node({ id: "b", prerequisites: ["a"] })]),
    ).toThrow(SkillGraphValidationError);
  });

  it("throws SkillGraphValidationError on a duplicate id", () => {
    expect(() => buildSkillGraphIndex([node({ id: "a" }), node({ id: "a" })])).toThrow(SkillGraphValidationError);
  });

  it("handles an empty node list without throwing", () => {
    const index = buildSkillGraphIndex([]);
    expect(index.nodesById.size).toBe(0);
  });
});

describe("getUnmetPrerequisites", () => {
  const index = buildSkillGraphIndex([
    node({ id: "a" }),
    node({ id: "b", prerequisites: ["a"] }),
    node({ id: "c", prerequisites: ["a", "b"] }),
  ]);

  it("returns all prerequisites when nothing is mastered", () => {
    expect(getUnmetPrerequisites(index, "c", new Set()).map((n) => n.id).sort()).toEqual(["a", "b"]);
  });

  it("excludes mastered prerequisites", () => {
    expect(getUnmetPrerequisites(index, "c", new Set(["a"])).map((n) => n.id)).toEqual(["b"]);
  });

  it("returns empty for a fully-mastered set", () => {
    expect(getUnmetPrerequisites(index, "c", new Set(["a", "b"]))).toEqual([]);
  });

  it("returns empty for a node with no prerequisites", () => {
    expect(getUnmetPrerequisites(index, "a", new Set())).toEqual([]);
  });

  it("returns empty (not throwing) for an unknown skill id", () => {
    expect(getUnmetPrerequisites(index, "does-not-exist", new Set())).toEqual([]);
  });
});

describe("getBlockedSkills", () => {
  const index = buildSkillGraphIndex([
    node({ id: "a" }),
    node({ id: "b", prerequisites: ["a"] }),
    node({ id: "c", prerequisites: ["a"] }),
  ]);

  it("finds every direct dependent of a skill", () => {
    expect(getBlockedSkills(index, "a").map((n) => n.id).sort()).toEqual(["b", "c"]);
  });

  it("returns empty for a leaf skill nothing depends on", () => {
    expect(getBlockedSkills(index, "b")).toEqual([]);
  });
});

describe("resolveTransitivePrerequisites", () => {
  it("resolves a full transitive chain", () => {
    const index = buildSkillGraphIndex([
      node({ id: "a" }),
      node({ id: "b", prerequisites: ["a"] }),
      node({ id: "c", prerequisites: ["b"] }),
    ]);
    expect(resolveTransitivePrerequisites(index, "c").sort()).toEqual(["a", "b"]);
  });
});

describe("topologicalOrder", () => {
  const index = buildSkillGraphIndex([
    node({ id: "a" }),
    node({ id: "b", prerequisites: ["a"] }),
    node({ id: "c", prerequisites: ["b"] }),
    node({ id: "d" }),
  ]);

  it("always places a prerequisite before its dependent", () => {
    const order = topologicalOrder(index, ["c", "a", "b"]);
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("c"));
  });

  it("pulls in transitive prerequisites not explicitly requested", () => {
    const order = topologicalOrder(index, ["c"]);
    expect(order).toEqual(expect.arrayContaining(["a", "b", "c"]));
  });

  it("is deterministic across repeated calls with the same input", () => {
    expect(topologicalOrder(index, ["c", "a", "b", "d"])).toEqual(topologicalOrder(index, ["c", "a", "b", "d"]));
  });

  it("returns an empty array for an empty request", () => {
    expect(topologicalOrder(index, [])).toEqual([]);
  });

  it("produces a valid topological order for the real curated skill graph", () => {
    const realIndex = buildSkillGraphIndex(SKILL_GRAPH_NODES);
    const allIds = SKILL_GRAPH_NODES.map((n) => n.id);
    const order = topologicalOrder(realIndex, allIds);
    const position = new Map(order.map((id, i) => [id, i]));
    for (const n of SKILL_GRAPH_NODES) {
      for (const prereqId of n.prerequisites) {
        expect(position.get(prereqId)).toBeLessThan(position.get(n.id)!);
      }
    }
  });
});

describe("graphDepth", () => {
  const index = buildSkillGraphIndex([
    node({ id: "a" }),
    node({ id: "b", prerequisites: ["a"] }),
    node({ id: "c", prerequisites: ["b"] }),
  ]);

  it("a root node with no in-scope prerequisites has depth 0", () => {
    expect(graphDepth(index, "a", new Set(["a", "b", "c"]))).toBe(0);
  });

  it("depth increases by 1 per dependency hop within scope", () => {
    const scope = new Set(["a", "b", "c"]);
    expect(graphDepth(index, "b", scope)).toBe(1);
    expect(graphDepth(index, "c", scope)).toBe(2);
  });

  it("a prerequisite outside the working set doesn't count toward depth", () => {
    expect(graphDepth(index, "b", new Set(["b", "c"]))).toBe(0);
  });
});
