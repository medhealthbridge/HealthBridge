import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { agentUsage } from "@/src/server/db/schema";

/** Start of "today" in Manila, the team's day. */
function startOfDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return new Date(`${parts}T00:00:00+08:00`);
}

export const dailyAiLimit = () => Number(process.env.AGENT_DAILY_AI_LIMIT ?? 100);

type UsageEntry = { userId: string; feature: string; layer: "rule" | "ai"; provider?: string; model?: string; inputTokens?: number; outputTokens?: number };

export async function recordAgentUsage(entry: UsageEntry) {
  await db.insert(agentUsage).values({
    userId: entry.userId,
    feature: entry.feature,
    layer: entry.layer,
    provider: entry.provider,
    model: entry.model,
    inputTokens: entry.inputTokens ?? 0,
    outputTokens: entry.outputTokens ?? 0,
  });
}

export type UsageToday = { aiCalls: number; ruleAnswers: number; tokens: number; limit: number };

export async function usageToday(userId: string, feature: string): Promise<UsageToday> {
  const rows = await db
    .select({ layer: agentUsage.layer, calls: sql<number>`count(*)::int`, tokens: sql<number>`coalesce(sum(${agentUsage.inputTokens} + ${agentUsage.outputTokens}), 0)::int` })
    .from(agentUsage)
    .where(and(eq(agentUsage.userId, userId), eq(agentUsage.feature, feature), gte(agentUsage.createdAt, startOfDay())))
    .groupBy(agentUsage.layer);
  const ai = rows.find((row) => row.layer === "ai");
  return { aiCalls: ai?.calls ?? 0, ruleAnswers: rows.find((row) => row.layer === "rule")?.calls ?? 0, tokens: ai?.tokens ?? 0, limit: dailyAiLimit() };
}
