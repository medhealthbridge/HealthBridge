import { z } from "zod";
import { listOrdersNeedingReview } from "@/src/server/services/domain-orders";
import { listPlatformPeople } from "@/src/server/services/platform-staff";
import { listTenants, summarizeTenants } from "@/src/server/services/tenants";
import { TENANT_STATUSES } from "@/src/lib/tenant-status";
import { defineTool } from "./core";

// Read-only tool pack for the company admin. None takes a tenant or user id:
// the admin may see every tenant (they can already), and nothing here writes.
export const adminTools = [
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
      const needle = name.toLowerCase();
      const found = (await listTenants()).filter((row) => row.name.toLowerCase().includes(needle));
      if (found.length === 0) return { found: false };
      if (found.length > 1) return { found: false, ambiguous: found.slice(0, 10).map((row) => row.name) };
      const { name: businessName, email, tier, status, clinics, clinicList, mrr, renews, joined } = found[0];
      const tenant = { name: businessName, ownerEmail: email, tier, status, clinicCount: clinics, clinics: clinicList, monthlyRevenuePesos: mrr, renewsOrTrialEnds: renews, joined };
      return { found: true, tenant };
    },
  }),
  defineTool({
    name: "list_company_staff",
    description: "The DataBridgeSol team: members with role and status, and invitations still waiting to be accepted.",
    input: z.object({}),
    run: async () =>
      (await listPlatformPeople()).map(({ name, email, role, state, since }) => ({ name, email, role, state, since: since.toISOString().slice(0, 10) })),
  }),
  defineTool({
    name: "list_orders_needing_review",
    description: "Custom-domain purchases that were paid for but did not finish, with the reason. These need a person to refund or retry.",
    input: z.object({}),
    run: async () => (await listOrdersNeedingReview()).map((order) => ({ ...order, amountPesos: order.totalCentavos / 100, since: order.since.toISOString() })),
  }),
];
