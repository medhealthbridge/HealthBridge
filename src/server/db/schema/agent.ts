import { pgTable, uuid, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { clinics } from "./tenancy";

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
    // Set for a clinic owner's proposal (the clinic it may touch); null for company-admin ones.
    clinicId: uuid("clinic_id").references(() => clinics.id),
    kind: text("kind").notNull(), // e.g. 'invite_admin', 'update_patient', 'archive_patient'
    risk: text("risk").$type<"create" | "edit" | "delete">().notNull().default("edit"),
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

export const SECRET_KEYS = ["gemini_api_key", "anthropic_api_key"] as const;
export type SecretKey = (typeof SECRET_KEYS)[number];

/**
 * Credentials the company admin pastes into the admin site, stored encrypted
 * (AES-256-GCM, see services/secret-box.ts). Only `last4` is ever shown back.
 * Global like `platform_admins`: read only by server code after requireSuperAdmin().
 */
export const platformSecrets = pgTable("platform_secrets", {
  key: text("key").$type<SecretKey>().primaryKey(),
  valueEncrypted: text("value_encrypted").notNull(),
  last4: text("last4").notNull(),
  updatedByUserId: text("updated_by_user_id").notNull().references(() => user.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Company-wide switches (text values), e.g. whether patient data may be sent to an AI provider. Global; founder-only. */
export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedByUserId: text("updated_by_user_id").notNull().references(() => user.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
