/**
 * Converts a concrete hour estimate into an expected calendar duration given
 * the student's actual weekly availability. Centralized here so every UI
 * component (phase cards, top moves, milestones) computes duration the same
 * way instead of embedding ad hoc math — and so the number is honest: an
 * "20 hours" task takes ~2 weeks at 10 hrs/week, ~4 weeks at 5 hrs/week, not
 * a fixed label regardless of availability.
 */

const DEFAULT_WEEKLY_HOURS = 5;

export interface ExpectedDuration {
  estimatedHours: number;
  weeklyHoursAvailable: number;
  expectedWeeks: number;
  /** e.g. "20 hours over 2 weeks" */
  label: string;
  /** True when no weekly availability was provided and a default had to be assumed. */
  isAssumedAvailability: boolean;
}

export function calculateExpectedDuration(
  estimatedHours: number,
  weeklyHoursAvailable: number | null,
): ExpectedDuration {
  const isAssumedAvailability = !weeklyHoursAvailable || weeklyHoursAvailable <= 0;
  const weekly = isAssumedAvailability ? DEFAULT_WEEKLY_HOURS : weeklyHoursAvailable;
  const expectedWeeks = Math.max(1, Math.ceil(estimatedHours / weekly));

  return {
    estimatedHours,
    weeklyHoursAvailable: weekly,
    expectedWeeks,
    label: `${estimatedHours} hour${estimatedHours === 1 ? "" : "s"} over ${expectedWeeks} week${expectedWeeks === 1 ? "" : "s"}`,
    isAssumedAvailability,
  };
}

/** Sums hour estimates for sequential (not parallel) tasks to get a phase-level total. */
export function totalEstimatedHours(items: { estimatedHours: number }[]): number {
  return items.reduce((sum, item) => sum + item.estimatedHours, 0);
}

const WEEKS_PER_MONTH = 4.33;

/**
 * Converts each phase's total milestone hours into a back-to-back,
 * non-overlapping "Months X-Y" window, sized by the student's actual
 * weekly availability — never a fixed preset like "Months 2-6" that ignores
 * how much time the phase before it actually took. Phase N's window always
 * starts exactly where phase N-1's ends, so the sequence never overlaps.
 */
export function computePhaseTimelines(phaseHours: number[], weeklyHoursAvailable: number | null): string[] {
  let cumulativeMonths = 0;
  return phaseHours.map((hours) => {
    const { expectedWeeks } = calculateExpectedDuration(hours, weeklyHoursAvailable);
    const durationMonths = Math.max(1, Math.round(expectedWeeks / WEEKS_PER_MONTH));
    const startMonth = cumulativeMonths + 1;
    const endMonth = startMonth + durationMonths - 1;
    cumulativeMonths = endMonth;
    return startMonth === endMonth ? `Month ${startMonth}` : `Months ${startMonth}-${endMonth}`;
  });
}
