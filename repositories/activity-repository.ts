import { desc, eq } from "drizzle-orm";
import { withUserContext, type Tx } from "@/lib/db/with-user-context";
import { activityEvents, profiles } from "@/lib/db/schema";
import { logServerEvent } from "@/lib/observability/logger";

/**
 * Lightweight, self-hosted event log — not third-party analytics. Called
 * from a handful of meaningful repository actions, not every click. Never
 * throws: a logging failure must never fail the action it's describing.
 */
export async function logActivityEvent(userId: string, eventType: string, payload: Record<string, unknown> = {}): Promise<void> {
  try {
    await withUserContext(userId, async (tx: Tx) => {
      const [profileRow] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
      if (!profileRow) return;
      await tx.insert(activityEvents).values({ profileId: profileRow.id, eventType, payload });
    });
  } catch (error) {
    logServerEvent("warn", "activity_event_write_failed", { eventType }, error);
  }
}

export async function listActivityEvents(userId: string, limit = 50) {
  return withUserContext(userId, async (tx: Tx) => {
    const [profileRow] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profileRow) return [];
    const rows = await tx.select().from(activityEvents).where(eq(activityEvents.profileId, profileRow.id)).orderBy(desc(activityEvents.createdAt)).limit(Math.min(Math.max(limit, 1), 200));
    return rows.map((row) => ({ id: row.id, type: row.eventType, payload: row.payload as Record<string, unknown>, occurredAt: row.createdAt.toISOString() }));
  });
}
