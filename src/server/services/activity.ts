import { and, desc, eq } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { auditLogs, user } from "@/src/server/db/schema";
import type { AuditEntry, Tone } from "@/src/types/console";

const ENTITY_LABELS: Record<string, string> = {
  patient: "patient record",
  appointment: "appointment",
  clinical_note: "clinical note",
  invoice: "receipt",
  service: "service",
  inventory_item: "inventory item",
  claim: "claim",
  staff: "staff member",
  staff_invite: "staff invite",
  account: "account",
  domain_order: "domain order",
};

export const ACTIVITY_FILTERS = [
  { key: "all", label: "Everything" },
  { key: "patient", label: "Patients" },
  { key: "appointment", label: "Appointments" },
  { key: "clinical_note", label: "Notes" },
  { key: "invoice", label: "Billing" },
  { key: "service", label: "Services" },
  { key: "inventory_item", label: "Inventory" },
  { key: "claim", label: "Claims" },
  { key: "staff", label: "Staff" },
] as const;

const VERB: Record<string, { text: string; tone: Tone }> = {
  create: { text: "Added", tone: "accent" },
  update: { text: "Changed", tone: "info" },
  delete: { text: "Archived or voided", tone: "danger" },
  view: { text: "Opened", tone: "neutral" },
};

type Diff = { before?: Record<string, unknown>; after?: Record<string, unknown>; [key: string]: unknown } | null;

/** One plain sentence for an audit row, using only what the diff already records. */
export function describeActivity(entityType: string, action: string, diff: Diff): { action: string; tone: Tone; meta: string } {
  const noun = ENTITY_LABELS[entityType] ?? entityType.replace(/_/g, " ");
  const verb = VERB[action] ?? { text: action, tone: "neutral" as Tone };
  const after = diff?.after ?? {};
  let detail = "";
  if (entityType === "invoice") {
    const number = typeof after.number === "string" ? after.number : "";
    if (action === "create") detail = [number, typeof after.totalCents === "number" ? `₱${(after.totalCents / 100).toFixed(2)}` : "", typeof after.method === "string" ? String(after.method) : ""].filter(Boolean).join(" · ");
    if (action === "delete") detail = [number, typeof after.reason === "string" ? `reason: ${after.reason}` : ""].filter(Boolean).join(" · ");
  } else if (typeof diff?.used === "number") {
    detail = `used ${diff.used}${typeof diff.reason === "string" ? ` (${diff.reason})` : ""}`;
  } else if (diff?.stockIn) {
    detail = `stock in ${(diff.stockIn as { quantity?: number }).quantity ?? ""}`.trim();
  } else if (typeof after.reason === "string") {
    detail = `reason: ${after.reason}`;
  } else if (typeof after.name === "string") {
    detail = after.name;
  }
  const label = action === "update" && diff?.used !== undefined ? "Stock used" : action === "update" && diff?.stockIn ? "Stock received" : `${verb.text}`;
  return { action: entityType === "patient" && action === "view" ? "record_viewed" : `${entityType}.${action}`, tone: verb.tone, meta: `${label} ${noun}${detail ? ` · ${detail}` : ""}` };
}

export async function listActivity(clinicId: string, timezone: string, { filter = "all", limit = 100 }: { filter?: string; limit?: number } = {}): Promise<AuditEntry[]> {
  const when = new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: timezone });
  const rows = await withTenant(clinicId, (tx) =>
    tx
      .select({ entityType: auditLogs.entityType, action: auditLogs.action, diff: auditLogs.diff, createdAt: auditLogs.createdAt, actorName: user.name, actorEmail: user.email })
      .from(auditLogs)
      .innerJoin(user, eq(user.id, auditLogs.actorUserId))
      .where(and(eq(auditLogs.clinicId, clinicId), filter !== "all" ? eq(auditLogs.entityType, filter) : undefined))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit),
  );
  return rows.map((row) => ({
    ...describeActivity(row.entityType, row.action, row.diff as Diff),
    by: `${row.actorName} · ${row.actorEmail}`,
    when: when.format(row.createdAt),
  }));
}

