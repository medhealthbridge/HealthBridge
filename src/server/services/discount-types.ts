import { and, asc, eq, isNull } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { auditLogs, discountTypes } from "@/src/server/db/schema";
import type { DiscountTypeInput } from "@/src/lib/schemas/invoice";

export class DiscountNotFoundError extends Error {}
export class DuplicateDiscountError extends Error {}

export type DiscountTypeRow = { id: string; name: string; description: string | null; kind: "percent" | "fixed"; value: number; requiresId: boolean; archived: boolean };

const toRow = (row: typeof discountTypes.$inferSelect): DiscountTypeRow => ({
  id: row.id, name: row.name, description: row.description, kind: row.kind as "percent" | "fixed", value: row.value, requiresId: row.requiresId, archived: row.archivedAt !== null,
});

function isUniqueViolation(error: unknown) {
  let current: unknown = error;
  while (current instanceof Error) {
    if ((current as { code?: string }).code === "23505") return true;
    current = current.cause;
  }
  return false;
}

export async function listDiscountTypes(clinicId: string, { includeArchived = false } = {}): Promise<DiscountTypeRow[]> {
  return withTenant(clinicId, async (tx) => {
    const rows = await tx
      .select()
      .from(discountTypes)
      .where(and(eq(discountTypes.clinicId, clinicId), includeArchived ? undefined : isNull(discountTypes.archivedAt)))
      .orderBy(asc(discountTypes.name));
    return rows.map(toRow);
  });
}

export async function saveDiscountType(clinicId: string, actorUserId: string, input: DiscountTypeInput, id?: string) {
  try {
    await withTenant(clinicId, async (tx) => {
      if (id) {
        const rows = await tx.update(discountTypes).set({ name: input.name, description: input.description, kind: input.kind, value: input.value, requiresId: input.requiresId }).where(and(eq(discountTypes.clinicId, clinicId), eq(discountTypes.id, id), isNull(discountTypes.archivedAt))).returning({ id: discountTypes.id });
        if (rows.length === 0) throw new DiscountNotFoundError();
        await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "discount_type", entityId: id, action: "update", diff: { after: { name: input.name, kind: input.kind, value: input.value } } });
      } else {
        const [row] = await tx.insert(discountTypes).values({ clinicId, name: input.name, description: input.description, kind: input.kind, value: input.value, requiresId: input.requiresId }).returning({ id: discountTypes.id });
        await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "discount_type", entityId: row.id, action: "create", diff: { after: { name: input.name, kind: input.kind, value: input.value } } });
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateDiscountError();
    throw error;
  }
}

/** Retiring a discount keeps every past invoice that used it (the invoice stores its own copy of the rule). */
export async function setDiscountArchived(clinicId: string, actorUserId: string, id: string, archived: boolean) {
  try {
    await withTenant(clinicId, async (tx) => {
      const rows = await tx.update(discountTypes).set({ archivedAt: archived ? new Date() : null }).where(and(eq(discountTypes.clinicId, clinicId), eq(discountTypes.id, id))).returning({ id: discountTypes.id });
      if (rows.length === 0) throw new DiscountNotFoundError();
      await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "discount_type", entityId: id, action: archived ? "delete" : "update", diff: { after: { archived } } });
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateDiscountError();
    throw error;
  }
}
