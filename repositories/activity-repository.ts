import { eq } from "drizzle-orm";
import { withUserContext, type Tx } from "@/lib/db/with-user-context";
import { activityEvents, profiles } from "@/lib/db/schema";

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
    console.error(`[activity] failed to log "${eventType}"`, error);
  }
}
