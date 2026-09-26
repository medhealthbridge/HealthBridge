import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Fixed-window counters for abuse-prone endpoints (sign-in, sign-up,
 * onboarding…), shared by every server instance — an in-memory limiter
 * resets per serverless instance. `key` is a SHA-256 of the bucket name and
 * its subject (IP, email, user id), so no raw personal data is stored.
 * Global, not tenant data: no clinic_id, no RLS tenant policy.
 */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});
