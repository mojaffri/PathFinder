import { desc, eq } from "drizzle-orm";
import { withUserContext } from "@/lib/db/with-user-context";
import { careerMatches, careers, profiles } from "@/lib/db/schema";
import type { CareerMatch } from "@/types";

/**
 * Persists a signed-in student's Discover results against the seeded
 * `careers` reference table. Best-effort: a career id that isn't in the
 * seeded table (e.g. reference data hasn't been seeded yet in a fresh
 * environment) is skipped rather than failing the whole save — Discover
 * itself never depends on this succeeding, since matching runs entirely
 * client-side against `data/careers.ts` regardless of any database state.
 */
export async function saveCareerMatches(userId: string, matches: CareerMatch[]): Promise<void> {
  await withUserContext(userId, async (tx) => {
    const [profileRow] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profileRow) return;

    for (const match of matches) {
      const [careerRow] = await tx.select({ id: careers.id }).from(careers).where(eq(careers.id, match.career.id)).limit(1);
      if (!careerRow) continue;

      await tx.insert(careerMatches).values({
        profileId: profileRow.id,
        careerId: match.career.id,
        matchPercentage: match.matchPercentage,
        confidence: match.confidence,
        reasons: match.reasons,
        strengths: match.strengths,
      });
    }
  });
}

export async function listRecentCareerMatches(userId: string, limit = 10) {
  return withUserContext(userId, async (tx) => {
    const [profileRow] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profileRow) return [];

    return tx
      .select()
      .from(careerMatches)
      .where(eq(careerMatches.profileId, profileRow.id))
      .orderBy(desc(careerMatches.createdAt))
      .limit(limit);
  });
}
