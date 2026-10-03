import { z } from "zod";
import { createPendingAction, type AgentActionKind } from "@/src/server/services/agent-actions";
import { listOrdersNeedingReview } from "@/src/server/services/domain-orders";
import { listPlatformPeople } from "@/src/server/services/platform-staff";
import { listTenants, summarizeTenants, type TenantRow } from "@/src/server/services/tenants";
import { TENANT_TIERS } from "@/src/lib/schemas/tenant";
import { TENANT_STATUSES } from "@/src/lib/tenant-status";
import { defineTool, type AgentTool } from "./core";

export type Proposal = { id: string; summary: string };

export type AdminToolContext = {
  userId: string;
  /** Only the founder account may propose changes; everyone else gets the read tools. */
  canPropose: boolean;
  /** Filled as tools run, so the route can show a Confirm card for each. */
  proposals: Proposal[];
};

/** Finds exactly one tenant by name, or says why not. The model never supplies an id. */
function pickTenant(rows: TenantRow[], name: string): { tenant: TenantRow } | { problem: string } {
  const needle = name.toLowerCase();
  const found = rows.filter((row) => row.name.toLowerCase().includes(needle));
  if (found.length === 0) return { problem: `No tenant matches "${name}".` };
  if (found.length > 1) return { problem: `More than one tenant matches: ${found.slice(0, 8).map((row) => row.name).join(", ")}. Ask which one.` };
  return { tenant: found[0] };
}

const readTools: AgentTool[] = [
  defineTool({
    name: "get_platform_summary",
    description: "Headline numbers across all tenants: how many accounts per status, current monthly recurring revenue in pesos, and trials ending within 7 days.",
    input: z.object({}),
    run: async () => summarizeTenants(await listTenants()),
  }),
  defineTool({
    name: "find_tenants",
    description: "List tenants (client accounts), optionally filtered by status or a name/email search. Returns plan tier, status, clinic count, monthly revenue in pesos and the renewal or trial-end date.",
    input: z.object({
      status: z.enum(TENANT_STATUSES).optional(),
      search: z.string().trim().max(100).optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    run: async ({ status, search, limit }) => {
      const needle = search?.toLowerCase();
      const rows = (await listTenants())
        .filter((row) => !status || row.status === status)
        .filter((row) => !needle || `${row.name} ${row.email}`.toLowerCase().includes(needle));
      return {
        matched: rows.length,
        tenants: rows.slice(0, limit).map(({ name, email, tier, status: rowStatus, clinics, mrr, renews, joined }) => ({
          name, ownerEmail: email, tier, status: rowStatus, clinics, monthlyRevenuePesos: mrr, renewsOrTrialEnds: renews, joined,
        })),
      };
    },
  }),
  defineTool({
    name: "get_tenant",
    description: "Everything known about one tenant: plan, status, revenue, dates and each clinic with its subdomain and specialty. Matches the business name (partial is fine).",
    input: z.object({ name: z.string().trim().min(2).max(100) }),
    run: async ({ name }) => {
      const picked = pickTenant(await listTenants(), name);
      if ("problem" in picked) return { found: false, note: picked.problem };
      const { name: businessName, email, tier, status, clinics, clinicList, mrr, renews, joined } = picked.tenant;
      return { found: true, tenant: { name: businessName, ownerEmail: email, tier, status, clinicCount: clinics, clinics: clinicList, monthlyRevenuePesos: mrr, renewsOrTrialEnds: renews, joined } };
    },
  }),
  defineTool({
    name: "list_company_staff",
    description: "The DataBridgeSol team: members with role and status, and invitations still waiting to be accepted.",
    input: z.object({}),
    run: async () => (await listPlatformPeople()).map(({ name, email, role, state, since }) => ({ name, email, role, state, since: since.toISOString().slice(0, 10) })),
  }),
  defineTool({
    name: "list_orders_needing_review",
    description: "Custom-domain purchases that were paid for but did not finish, with the reason. These need a person to refund or retry.",
    input: z.object({}),
    run: async () => (await listOrdersNeedingReview()).map((order) => ({ ...order, amountPesos: order.totalCentavos / 100, since: order.since.toISOString() })),
  }),
];

/** What the model is told after proposing: the change is not made until the person confirms. */
function proposed(proposal: Proposal, ctx: AdminToolContext) {
  ctx.proposals.push(proposal);
  return { proposed: true, summary: proposal.summary, note: "Not applied yet. The user must press Confirm under your reply. Tell them what you prepared." };
}

function proposeTools(ctx: AdminToolContext): AgentTool[] {
  const propose = async (kind: AgentActionKind, args: unknown, summary: string) => proposed(await createPendingAction(ctx.userId, kind, args, summary), ctx);

  return [
    defineTool({
      name: "propose_invite_admin",
      description: "Prepare an invitation for a new DataBridgeSol team member by email. Nothing is sent until the user confirms.",
      input: z.object({ email: z.email() }),
      run: ({ email }) => propose("invite_admin", { email }, `Invite ${email} to the DataBridgeSol team (emails them a link valid for 7 days).`),
    }),
    defineTool({
      name: "propose_set_staff_active",
      description: "Prepare to deactivate or restore a team member, identified by their email. Never applies to the founder or to the user themself.",
      input: z.object({ email: z.email(), active: z.boolean() }),
      run: async ({ email, active }) => {
        const person = (await listPlatformPeople()).find((p) => p.email.toLowerCase() === email.toLowerCase() && p.userId && p.role === "staff");
        if (!person?.userId) return { proposed: false, note: "No staff member with that email (the founder can't be changed here)." };
        return propose("set_staff_active", { userId: person.userId, active }, `${active ? "Restore" : "Deactivate"} ${person.name} (${person.email}).`);
      },
    }),
    defineTool({
      name: "propose_set_tenant_status",
      description: "Prepare to lock (masterlock) or unlock a tenant's access. Locking blocks login but never deletes data.",
      input: z.object({ tenantName: z.string().trim().min(2).max(100), status: z.enum(["masterlocked", "active"]) }),
      run: async ({ tenantName, status }) => {
        const picked = pickTenant(await listTenants(), tenantName);
        if ("problem" in picked) return { proposed: false, note: picked.problem };
        return propose("set_tenant_status", { accountId: picked.tenant.key, status }, `${status === "masterlocked" ? "Lock" : "Unlock"} ${picked.tenant.name}.`);
      },
    }),
    defineTool({
      name: "propose_change_tenant_tier",
      description: "Prepare to move a tenant to another plan tier (tier_1 to tier_4). Refused if the new tier has fewer clinic slots than clinics they already have.",
      input: z.object({ tenantName: z.string().trim().min(2).max(100), tier: z.enum(TENANT_TIERS) }),
      run: async ({ tenantName, tier }) => {
        const picked = pickTenant(await listTenants(), tenantName);
        if ("problem" in picked) return { proposed: false, note: picked.problem };
        return propose("change_tenant_tier", { accountId: picked.tenant.key, tier }, `Change ${picked.tenant.name} from ${picked.tenant.tier} to ${tier.replace("_", " ")}.`);
      },
    }),
  ];
}

export function buildAdminTools(ctx: AdminToolContext): AgentTool[] {
  return ctx.canPropose ? [...readTools, ...proposeTools(ctx)] : readTools;
}
