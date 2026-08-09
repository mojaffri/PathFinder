import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const apiUsageWindows = pgTable("api_usage_windows", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  windowKey: text("window_key").notNull(),
  requestCount: integer("request_count").notNull().default(1),
  windowEndsAt: timestamp("window_ends_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("api_usage_windows_profile_key").on(table.profileId, table.windowKey)]);
