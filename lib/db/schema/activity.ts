import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles } from "./profiles";

/**
 * Lightweight, self-hosted event log — not third-party analytics. Written to
 * from a handful of meaningful repository actions (profile created, roadmap
 * saved, a skill reaching resume-ready) rather than every click; see
 * `repositories/activity.ts`.
 */
export const activityEvents = pgTable("activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("activity_events_profile_created_idx").on(table.profileId, table.createdAt),
  index("activity_events_profile_type_idx").on(table.profileId, table.eventType),
]);
