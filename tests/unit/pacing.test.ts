import { describe, expect, it } from "vitest";
import { calculateExpectedDuration, computePhaseTimelines, totalEstimatedHours } from "@/lib/roadmap/pacing";

describe("calculateExpectedDuration", () => {
  it("assumes a default weekly availability when none is provided, and flags it as assumed", () => {
    const result = calculateExpectedDuration(20, null);
    expect(result.isAssumedAvailability).toBe(true);
    expect(result.weeklyHoursAvailable).toBeGreaterThan(0);
  });

  it("treats zero or negative availability the same as null (never divides by zero)", () => {
    const zero = calculateExpectedDuration(20, 0);
    const negative = calculateExpectedDuration(20, -5);
    expect(zero.isAssumedAvailability).toBe(true);
    expect(negative.isAssumedAvailability).toBe(true);
    expect(Number.isFinite(zero.expectedWeeks)).toBe(true);
  });

  it("rounds up to whole weeks and never returns fewer than 1 week for positive hours", () => {
    const result = calculateExpectedDuration(1, 10);
    expect(result.expectedWeeks).toBe(1);

    const partialWeek = calculateExpectedDuration(21, 10);
    expect(partialWeek.expectedWeeks).toBe(3);
  });

  it("matches the documented worked example: 20 hours at 10 hrs/week is ~2 weeks", () => {
    const result = calculateExpectedDuration(20, 10);
    expect(result.expectedWeeks).toBe(2);
    expect(result.isAssumedAvailability).toBe(false);
  });
});

describe("totalEstimatedHours", () => {
  it("returns 0 for an empty list", () => {
    expect(totalEstimatedHours([])).toBe(0);
  });

  it("sums a single item and multiple items the same way", () => {
    expect(totalEstimatedHours([{ estimatedHours: 5 }])).toBe(5);
    expect(totalEstimatedHours([{ estimatedHours: 5 }, { estimatedHours: 10 }])).toBe(15);
  });
});

describe("computePhaseTimelines", () => {
  it("returns an empty array for no phases", () => {
    expect(computePhaseTimelines([], 10)).toEqual([]);
  });

  it("produces sequential, non-overlapping month windows across phases", () => {
    const timelines = computePhaseTimelines([40, 40, 40], 10);
    expect(timelines).toHaveLength(3);

    const parsed = timelines.map((t) => {
      const [, start, end] = t.match(/Months (\d+)-(\d+)/) ?? [];
      return { start: Number(start), end: Number(end) };
    });

    for (let i = 1; i < parsed.length; i++) {
      expect(parsed[i].start).toBe(parsed[i - 1].end);
    }
  });

  it("never produces a zero-or-negative-length window even for a tiny phase", () => {
    const timelines = computePhaseTimelines([1], 40);
    const [, start, end] = timelines[0].match(/Months (\d+)-(\d+)/) ?? [];
    expect(Number(end)).toBeGreaterThan(Number(start));
  });
});
