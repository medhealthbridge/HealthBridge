import { and, asc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { auditLogs, inventoryBatches, inventoryItems } from "@/src/server/db/schema";
import type { ItemInput, ReceiveStockInput, UseStockInput } from "@/src/lib/schemas/inventory";

export class ItemNotFoundError extends Error {}
export class DuplicateSkuError extends Error {}
export class InsufficientStockError extends Error {
  constructor(public available: number) {
    super("insufficient stock");
  }
}

export const EXPIRY_WARNING_DAYS = 30;

export type StockStatus = "ok" | "low" | "out" | "expiring";

export type InventoryRow = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  reorderThreshold: number;
  /** Usable stock: batches that have not expired. */
  onHand: number;
  expiredQty: number;
  nextExpiry: string | null;
  status: StockStatus;
  archived: boolean;
};

/** Pure, so it can be tested: what an item's numbers mean for the shelf. */
export function stockStatus(onHand: number, reorderThreshold: number, nextExpiry: string | null, today: string): StockStatus {
  if (onHand <= 0) return "out";
  if (onHand <= reorderThreshold) return "low";
  if (nextExpiry) {
    const limit = new Date(`${today}T00:00:00Z`);
    limit.setUTCDate(limit.getUTCDate() + EXPIRY_WARNING_DAYS);
    if (nextExpiry <= limit.toISOString().slice(0, 10)) return "expiring";
  }
  return "ok";
}

function isUniqueViolation(error: unknown) {
  let current: unknown = error;
  while (current instanceof Error) {
    if ((current as { code?: string }).code === "23505") return true;
    current = current.cause;
  }
  return false;
}

export async function listInventory(clinicId: string, today: string, { archived = false } = {}): Promise<InventoryRow[]> {
  return withTenant(clinicId, async (tx) => {
    const items = await tx
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.clinicId, clinicId), archived ? isNotNull(inventoryItems.deletedAt) : isNull(inventoryItems.deletedAt)))
      .orderBy(asc(inventoryItems.name));
    const batches = await tx
      .select({ itemId: inventoryBatches.itemId, quantity: inventoryBatches.quantityOnHand, expiresOn: inventoryBatches.expiresOn })
      .from(inventoryBatches)
      .where(and(eq(inventoryBatches.clinicId, clinicId), gt(inventoryBatches.quantityOnHand, 0)));
    return items.map((item) => {
      const mine = batches.filter((batch) => batch.itemId === item.id);
      const usable = mine.filter((batch) => !batch.expiresOn || batch.expiresOn >= today);
      const onHand = usable.reduce((total, batch) => total + batch.quantity, 0);
      const expiredQty = mine.filter((batch) => batch.expiresOn && batch.expiresOn < today).reduce((total, batch) => total + batch.quantity, 0);
      const nextExpiry = usable.map((batch) => batch.expiresOn).filter((value): value is string => !!value).sort()[0] ?? null;
      return {
        id: item.id, name: item.name, sku: item.sku, unit: item.unit, reorderThreshold: item.reorderThreshold,
        onHand, expiredQty, nextExpiry, status: stockStatus(onHand, item.reorderThreshold, nextExpiry, today), archived: item.deletedAt !== null,
      };
    });
  });
}

export async function createItem(clinicId: string, actorUserId: string, input: ItemInput) {
  try {
    return await withTenant(clinicId, async (tx) => {
      const [row] = await tx.insert(inventoryItems).values({ clinicId, ...input }).returning({ id: inventoryItems.id });
      await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "inventory_item", entityId: row.id, action: "create", diff: { after: input } });
      return row;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateSkuError();
    throw error;
  }
}

export async function updateItem(clinicId: string, actorUserId: string, itemId: string, input: ItemInput) {
  try {
    await withTenant(clinicId, async (tx) => {
      const [before] = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.clinicId, clinicId), eq(inventoryItems.id, itemId), isNull(inventoryItems.deletedAt))).for("update").limit(1);
      if (!before) throw new ItemNotFoundError();
      await tx.update(inventoryItems).set(input).where(eq(inventoryItems.id, itemId));
      await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "inventory_item", entityId: itemId, action: "update", diff: { before: { name: before.name, sku: before.sku, unit: before.unit, reorderThreshold: before.reorderThreshold }, after: input } });
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateSkuError();
    throw error;
  }
}

/** Archive hides the item from the shelf and from use; its batches and history stay. */
export async function setItemArchived(clinicId: string, actorUserId: string, itemId: string, archived: boolean) {
  try {
    await withTenant(clinicId, async (tx) => {
      const [item] = await tx.select({ id: inventoryItems.id }).from(inventoryItems).where(and(eq(inventoryItems.clinicId, clinicId), eq(inventoryItems.id, itemId))).limit(1);
      if (!item) throw new ItemNotFoundError();
      await tx.update(inventoryItems).set({ deletedAt: archived ? new Date() : null }).where(eq(inventoryItems.id, itemId));
      await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "inventory_item", entityId: itemId, action: archived ? "delete" : "update", diff: { after: { archived } } });
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateSkuError();
    throw error;
  }
}

async function liveItem(tx: Parameters<Parameters<typeof withTenant>[1]>[0], clinicId: string, itemId: string) {
  const [item] = await tx.select({ id: inventoryItems.id }).from(inventoryItems).where(and(eq(inventoryItems.clinicId, clinicId), eq(inventoryItems.id, itemId), isNull(inventoryItems.deletedAt))).limit(1);
  if (!item) throw new ItemNotFoundError();
}

export async function receiveStock(clinicId: string, actorUserId: string, input: ReceiveStockInput) {
  await withTenant(clinicId, async (tx) => {
    await liveItem(tx, clinicId, input.itemId);
    const [batch] = await tx.insert(inventoryBatches).values({ clinicId, itemId: input.itemId, lotNumber: input.lotNumber, quantityOnHand: input.quantity, expiresOn: input.expiresOn }).returning({ id: inventoryBatches.id });
    await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "inventory_item", entityId: input.itemId, action: "update", diff: { stockIn: { batchId: batch.id, quantity: input.quantity, lot: input.lotNumber, expiresOn: input.expiresOn } } });
  });
}

/** Any staff member records use. Earliest expiry goes first; expired lots are never used. */
export async function consumeStock(clinicId: string, actorUserId: string, today: string, input: UseStockInput) {
  await withTenant(clinicId, async (tx) => {
    await liveItem(tx, clinicId, input.itemId);
    const batches = await tx
      .select()
      .from(inventoryBatches)
      .where(and(eq(inventoryBatches.clinicId, clinicId), eq(inventoryBatches.itemId, input.itemId), gt(inventoryBatches.quantityOnHand, 0), sql`(${inventoryBatches.expiresOn} is null or ${inventoryBatches.expiresOn} >= ${today})`))
      .orderBy(sql`${inventoryBatches.expiresOn} asc nulls last`, asc(inventoryBatches.receivedAt))
      .for("update");
    const available = batches.reduce((total, batch) => total + batch.quantityOnHand, 0);
    if (available < input.quantity) throw new InsufficientStockError(available);
    let remaining = input.quantity;
    const taken: { batchId: string; quantity: number }[] = [];
    for (const batch of batches) {
      if (remaining === 0) break;
      const take = Math.min(batch.quantityOnHand, remaining);
      await tx.update(inventoryBatches).set({ quantityOnHand: batch.quantityOnHand - take }).where(eq(inventoryBatches.id, batch.id));
      taken.push({ batchId: batch.id, quantity: take });
      remaining -= take;
    }
    await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "inventory_item", entityId: input.itemId, action: "update", diff: { used: input.quantity, reason: input.reason, batches: taken } });
  });
}

/** Owner removes expired lots from the count (disposal). The batch rows stay, at zero. */
export async function writeOffExpired(clinicId: string, actorUserId: string, today: string, itemId: string) {
  return withTenant(clinicId, async (tx) => {
    await liveItem(tx, clinicId, itemId);
    const expired = await tx
      .update(inventoryBatches)
      .set({ quantityOnHand: 0 })
      .where(and(eq(inventoryBatches.clinicId, clinicId), eq(inventoryBatches.itemId, itemId), gt(inventoryBatches.quantityOnHand, 0), sql`${inventoryBatches.expiresOn} < ${today}`))
      .returning({ id: inventoryBatches.id });
    if (expired.length > 0) {
      await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "inventory_item", entityId: itemId, action: "update", diff: { writtenOff: expired.map((batch) => batch.id) } });
    }
    return expired.length;
  });
}
