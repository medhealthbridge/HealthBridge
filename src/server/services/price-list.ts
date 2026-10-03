import { and, asc, eq, isNull, isNotNull } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { auditLogs, services } from "@/src/server/db/schema";
import type { ServiceInput } from "@/src/lib/schemas/service";

export type ServiceRow = {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  durationMinutes: number | null;
  priceCentavos: number;
  vatExempt: boolean;
  archived: boolean;
};

export class DuplicateServiceError extends Error {}
export class ServiceNotFoundError extends Error {}
export class StaleServiceError extends Error {}

function isUniqueViolation(error: unknown) {
  let current: unknown = error;
  while (current instanceof Error) {
    if ((current as { code?: string }).code === "23505") return true;
    current = current.cause;
  }
  return false;
}

const toRow = (row: typeof services.$inferSelect): ServiceRow => ({
  id: row.id,
  name: row.name,
  code: row.code,
  category: row.category,
  durationMinutes: row.durationMinutes,
  priceCentavos: row.priceCentavos,
  vatExempt: row.vatExempt,
  archived: row.deletedAt !== null,
});

export async function listServices(clinicId: string, { archived = false } = {}): Promise<ServiceRow[]> {
  return withTenant(clinicId, async (tx) => {
    const rows = await tx
      .select()
      .from(services)
      .where(and(eq(services.clinicId, clinicId), archived ? isNotNull(services.deletedAt) : isNull(services.deletedAt)))
      .orderBy(asc(services.category), asc(services.name));
    return rows.map(toRow);
  });
}

export async function findService(clinicId: string, serviceId: string, includeArchived = false) {
  return withTenant(clinicId, async (tx) => {
    const [row] = await tx
      .select()
      .from(services)
      .where(and(eq(services.clinicId, clinicId), eq(services.id, serviceId), includeArchived ? undefined : isNull(services.deletedAt)))
      .limit(1);
    return row ? toRow(row) : null;
  });
}

export async function createService(clinicId: string, actorUserId: string, input: ServiceInput) {
  try {
    return await withTenant(clinicId, async (tx) => {
      const [row] = await tx.insert(services).values({ clinicId, ...input }).returning();
      await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "service", entityId: row.id, action: "create", diff: { after: input } });
      return toRow(row);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateServiceError(input.name);
    throw error;
  }
}

const EDITABLE = ["name", "code", "category", "durationMinutes", "priceCentavos", "vatExempt"] as const;

/**
 * Replaces a service's fields. When `expectedBefore` is given (the values the
 * person approved against), nothing is written if the row changed since.
 * The audit row records only fields that actually changed.
 */
export async function updateService(clinicId: string, actorUserId: string, serviceId: string, input: Partial<ServiceInput>, expectedBefore?: Partial<ServiceInput>) {
  try {
    return await withTenant(clinicId, async (tx) => {
      const [current] = await tx
        .select()
        .from(services)
        .where(and(eq(services.clinicId, clinicId), eq(services.id, serviceId), isNull(services.deletedAt)))
        .for("update")
        .limit(1);
      if (!current) throw new ServiceNotFoundError();
      if (expectedBefore && (Object.keys(expectedBefore) as (keyof ServiceInput)[]).some((key) => current[key] !== expectedBefore[key])) {
        throw new StaleServiceError();
      }
      const changed = EDITABLE.filter((key) => key in input && input[key] !== current[key]);
      if (changed.length === 0) return toRow(current);
      const set = Object.fromEntries(changed.map((key) => [key, input[key]]));
      const [row] = await tx.update(services).set(set).where(and(eq(services.clinicId, clinicId), eq(services.id, serviceId))).returning();
      await tx.insert(auditLogs).values({
        clinicId, actorUserId, entityType: "service", entityId: serviceId, action: "update",
        diff: { before: Object.fromEntries(changed.map((key) => [key, current[key]])), after: set },
      });
      return toRow(row);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateServiceError(String(input.name));
    throw error;
  }
}

/** Retires or brings back a service. Past invoices keep naming it either way. */
export async function setServiceArchived(clinicId: string, actorUserId: string, serviceId: string, archived: boolean) {
  try {
    return await withTenant(clinicId, async (tx) => {
      const rows = await tx
        .update(services)
        .set({ deletedAt: archived ? new Date() : null })
        .where(and(eq(services.clinicId, clinicId), eq(services.id, serviceId), archived ? isNull(services.deletedAt) : isNotNull(services.deletedAt)))
        .returning({ id: services.id });
      if (rows.length === 0) throw new ServiceNotFoundError();
      await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "service", entityId: serviceId, action: archived ? "delete" : "update", diff: { after: { archived } } });
    });
  } catch (error) {
    // Restoring a service whose name is now used by another active one.
    if (isUniqueViolation(error)) throw new DuplicateServiceError("restore");
    throw error;
  }
}
