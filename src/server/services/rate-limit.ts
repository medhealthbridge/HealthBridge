import { sql } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { rateLimits } from "@/src/server/db/schema";
import { sha256Hex } from "@/src/server/services/tokens";

export type RateLimitRule = { max: number; windowSeconds: number };
export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Counts one attempt against `bucket` for `subject` (an IP, email or user
 * id) and reports whether it's within `rule`. One atomic upsert, so
 * concurrent requests on any server instance can't slip past the limit.
 */
export async function consumeRateLimit(
  bucket: string,
  subject: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const windowExpired = sql`${rateLimits.windowStart} <= now() - make_interval(secs => ${rule.windowSeconds})`;

  const [row] = await db
    .insert(rateLimits)
    .values({ key: sha256Hex(`${bucket}:${subject}`), count: 1, windowStart: sql`now()` })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${windowExpired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${windowExpired} then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count, windowStart: rateLimits.windowStart });

  if (row.count <= rule.max) return { allowed: true };
  const retryAfterMs = row.windowStart.getTime() + rule.windowSeconds * 1000 - Date.now();
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
}
