import { pgTable, uuid, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const AGENT_ACTION_STATUSES = ["pending", "executed", "cancelled", "failed"] as const;
export type AgentActionStatus = (typeof AGENT_ACTION_STATUSES)[number];

/**
 * A change the assistant proposed and a person has yet to approve. The model
 * only ever writes this row; nothing runs until the same user confirms it, and
 * the row stays as the record of who approved what. Global (company admin), like
 * `platform_admins`: reached only after requireSuperAdmin().
 */
export const agentActions = pgTable(
  "agent_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => user.id),
    kind: text("kind").notNull(), // 'invite_admin' | 'set_staff_active' | 'set_tenant_status' | 'change_tenant_tier'
    args: jsonb("args").notNull(),
    summary: text("summary").notNull(),
    status: text("status").$type<AgentActionStatus>().notNull().default("pending"),
    result: text("result"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => ({ userIdx: index("agent_actions_user_id_idx").on(table.userId, table.createdAt) }),
);

/** One row per assistant answer: which layer produced it and what it cost. No prompt or answer text is stored. */
export const agentUsage = pgTable(
  "agent_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => user.id),
    feature: text("feature").notNull().default("admin_assistant"),
    layer: text("layer").notNull(), // 'rule' | 'ai'
    provider: text("provider"), // 'gemini' | 'anthropic' when layer = 'ai'
    model: text("model"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ userDayIdx: index("agent_usage_user_created_idx").on(table.userId, table.createdAt) }),
);
