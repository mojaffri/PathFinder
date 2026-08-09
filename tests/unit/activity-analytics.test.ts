import { describe, expect, it } from "vitest";
import { readinessHistoryFromEvents } from "@/lib/analytics/activity";

describe("readinessHistoryFromEvents", () => {
  it("uses only real structured readiness events and sorts chronologically", () => {
    const result = readinessHistoryFromEvents([
      { type: "readiness_changed", payload: { readiness: 60 }, occurredAt: "2026-02-02T00:00:00Z" },
      { type: "job_analyzed", payload: { fitScore: 80 }, occurredAt: "2026-01-15T00:00:00Z" },
      { type: "readiness_changed", payload: { readiness: 40 }, occurredAt: "2026-01-01T00:00:00Z" },
      { type: "readiness_changed", payload: {}, occurredAt: "2026-03-01T00:00:00Z" },
    ]);
    expect(result).toEqual([{ date: "2026-01-01T00:00:00Z", value: 40 }, { date: "2026-02-02T00:00:00Z", value: 60 }]);
  });
});
