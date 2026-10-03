import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/src/server/db/client";
import { agentActions, user } from "@/src/server/db/schema";
import { TENANT_TIERS } from "@/src/lib/schemas/tenant";
import { AlreadyOnTeamError, inviteAndEmail, setPlatformStaffActive } from "./platform-staff";
import { changeTenantTier, setTenantAiAccess, setTenantSubscriptionStatus, TierTooSmallError } from "./tenant-admin";

const TTL_MINUTES = 15;

/** Every change the assistant can propose. Args are re-validated here at confirm time, never trusted from storage. */
const ACTIONS = {
  invite_admin: {
    schema: z.object({ email: z.email() }),
    run: async (actor: { id: string; name: string }, args: { email: string }) => {
      const sent = await inviteAndEmail(actor, args.email);
      return sent.emailed ? `Invitation sent to ${sent.email}.` : `Invitation saved for ${sent.email}, but the email failed. Resend it from Company staff.`;
    },
  },
  set_staff_active: {
    schema: z.object({ userId: z.string().min(1), active: z.boolean() }),
    run: async (actor: { id: string; name: string }, args: { userId: string; active: boolean }) => {
      await setPlatformStaffActive(actor.id, args.userId, args.active);
      return args.active ? "Team member restored." : "Team member deactivated.";
    },
  },
  set_tenant_status: {
    schema: z.object({ accountId: z.uuid(), status: z.enum(["masterlocked", "active"]) }),
    run: async (_actor: { id: string; name: string }, args: { accountId: string; status: "masterlocked" | "active" }) => {
      await setTenantSubscriptionStatus(args.accountId, args.status);
      return args.status === "masterlocked" ? "Tenant locked. Their data is kept." : "Tenant unlocked.";
    },
  },
  set_tenant_ai_access: {
    schema: z.object({ accountId: z.uuid(), enabled: z.boolean() }),
    run: async (_actor: { id: string; name: string }, args: { accountId: string; enabled: boolean }) => {
      await setTenantAiAccess(args.accountId, args.enabled);
      return args.enabled ? "AI assistant granted to the tenant." : "AI assistant revoked for the tenant.";
    },
  },
  change_tenant_tier: {
    schema: z.object({ accountId: z.uuid(), tier: z.enum(TENANT_TIERS) }),
    run: async (_actor: { id: string; name: string }, args: { accountId: string; tier: (typeof TENANT_TIERS)[number] }) => {
      await changeTenantTier(args.accountId, args.tier);
      return `Tier changed to ${args.tier.replace("_", " ")}.`;
    },
  },
} as const;

export type AgentActionKind = keyof typeof ACTIONS;

/** Stores a proposal. Nothing runs yet; `summary` is what the person sees before approving. */
export async function createPendingAction(userId: string, kind: AgentActionKind, args: unknown, summary: string) {
  const parsed = ACTIONS[kind].schema.parse(args);
  const [row] = await db
    .insert(agentActions)
    .values({ userId, kind, args: parsed, summary, expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000) })
    .returning({ id: agentActions.id });
  return { id: row.id, summary };
}

export type ActionOutcome = { ok: boolean; message: string };

/**
 * Runs a proposal once, for the person who owns it. The status flips from
 * `pending` in a single guarded update first, so a double-click or a replayed
 * request can't apply it twice.
 */
export async function confirmAction(actor: { id: string; name: string }, actionId: string): Promise<ActionOutcome> {
  const [claimed] = await db
    .update(agentActions)
    .set({ status: "executed", decidedAt: new Date() })
    .where(and(eq(agentActions.id, actionId), eq(agentActions.userId, actor.id), isNull(agentActions.clinicId), eq(agentActions.status, "pending"), gt(agentActions.expiresAt, new Date())))
    .returning({ kind: agentActions.kind, args: agentActions.args });
  if (!claimed) return { ok: false, message: "That request expired or was already handled." };

  const action = ACTIONS[claimed.kind as AgentActionKind];
  try {
    const args = action.schema.parse(claimed.args);
    // The union of arg shapes is narrowed by `kind`; the schema above is the proof.
    const message = await (action.run as (a: typeof actor, x: unknown) => Promise<string>)(actor, args);
    await db.update(agentActions).set({ result: message }).where(eq(agentActions.id, actionId));
    return { ok: true, message };
  } catch (error) {
    const message =
      error instanceof AlreadyOnTeamError ? "That person is already on the team."
      : error instanceof TierTooSmallError ? "That tier has fewer clinic slots than the tenant already uses."
      : "That change failed. Nothing was changed.";
    if (!(error instanceof AlreadyOnTeamError) && !(error instanceof TierTooSmallError)) {
      console.error(`[agent] action ${claimed.kind} failed:`, error instanceof Error ? error.message : "unknown error");
    }
    await db.update(agentActions).set({ status: "failed", result: message }).where(eq(agentActions.id, actionId));
    return { ok: false, message };
  }
}

export async function cancelAction(userId: string, actionId: string) {
  await db
    .update(agentActions)
    .set({ status: "cancelled", decidedAt: new Date() })
    .where(and(eq(agentActions.id, actionId), eq(agentActions.userId, userId), isNull(agentActions.clinicId), eq(agentActions.status, "pending")));
}

export async function userNameOf(userId: string) {
  const [row] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1);
  return row?.name ?? "A DataBridgeSol admin";
}
