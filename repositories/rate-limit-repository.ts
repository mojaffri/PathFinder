import { and, eq, lt, sql } from "drizzle-orm";
import { apiUsageWindows } from "@/lib/db/schema";
import { withUserContext } from "@/lib/db/with-user-context";
import { ensureProfileId } from "@/repositories/profile-repository";

export async function consumeRateLimit(userId: string, key: string, limit: number, windowSeconds: number) {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const now = Date.now();
    const windowNumber = Math.floor(now / (windowSeconds * 1000));
    const windowKey = `${key}:${windowNumber}`;
    const windowEndsAt = new Date((windowNumber + 1) * windowSeconds * 1000);
    const [row] = await tx.insert(apiUsageWindows).values({ profileId, windowKey, windowEndsAt }).onConflictDoUpdate({
      target: [apiUsageWindows.profileId, apiUsageWindows.windowKey],
      set: { requestCount: sql`${apiUsageWindows.requestCount} + 1`, updatedAt: new Date() },
    }).returning({ requestCount: apiUsageWindows.requestCount });
    // Small, bounded operational table; cleanup is scoped to this profile.
    await tx.delete(apiUsageWindows).where(and(eq(apiUsageWindows.profileId, profileId), lt(apiUsageWindows.windowEndsAt, new Date(now - 86_400_000))));
    return { allowed: row.requestCount <= limit, remaining: Math.max(0, limit - row.requestCount), retryAfterSeconds: Math.max(1, Math.ceil((windowEndsAt.getTime() - now) / 1000)) };
  });
}
