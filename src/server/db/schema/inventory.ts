import { pgTable, uuid, text, integer, date, boolean, timestamp, index, uniqueIndex, unique, foreignKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { accounts, clinics } from "./tenancy";
import { clinicStaff } from "./staff";

/** Stock is per clinic/branch; quantity is derived from `inventoryBatches`, not stored here. */
export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    name: text("name").notNull(),
    sku: text("sku"),
    unit: text("unit").notNull().default("unit"),
    reorderThreshold: integer("reorder_threshold").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    clinicIdx: index("inventory_items_clinic_id_idx").on(table.clinicId),
    clinicIdIdUnique: unique("inventory_items_clinic_id_id_unique").on(table.clinicId, table.id),
    clinicSkuActiveIdx: uniqueIndex("inventory_items_clinic_sku_active_idx")
      .on(table.clinicId, table.sku)
      .where(sql`sku is not null and deleted_at is null`),
  }),
);

/** Lot-level stock, for expiry tracking on consumables. */
export const inventoryBatches = pgTable(
  "inventory_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    itemId: uuid("item_id").notNull(),
    lotNumber: text("lot_number"),
    quantityOnHand: integer("quantity_on_hand").notNull().default(0),
    expiresOn: date("expires_on"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clinicItemIdx: index("inventory_batches_clinic_item_idx").on(table.clinicId, table.itemId),
    clinicExpiresOnIdx: index("inventory_batches_clinic_expires_on_idx").on(table.clinicId, table.expiresOn),
    inventoryBatchesItemFk: foreignKey({
      name: "inventory_batches_item_fk",
      columns: [table.clinicId, table.itemId],
      foreignColumns: [inventoryItems.clinicId, inventoryItems.id],
    }),
  }),
);

/**
 * Inter-branch transfer. Spans two clinics under the same account, so it is
 * scoped by `accountId` (not a single `clinicId`) for RLS — see
 * `src/server/db/client.ts`'s `withAccount` helper. Composite FKs make the
 * database itself reject a transfer whose clinics aren't both under
 * `accountId`, or whose item isn't stocked at `fromClinicId`.
 */
export const inventoryTransfers = pgTable(
  "inventory_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accounts.id),
    fromClinicId: uuid("from_clinic_id").notNull(),
    toClinicId: uuid("to_clinic_id").notNull(),
    itemId: uuid("item_id").notNull(),
    quantity: integer("quantity").notNull(),
    status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'completed'
    requestedByStaffId: uuid("requested_by_staff_id"),
    approvedByStaffId: uuid("approved_by_staff_id"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    accountIdx: index("inventory_transfers_account_id_idx").on(table.accountId),
    fromClinicIdx: index("inventory_transfers_from_clinic_id_idx").on(table.fromClinicId),
    toClinicIdx: index("inventory_transfers_to_clinic_id_idx").on(table.toClinicId),
    inventoryTransfersFromClinicFk: foreignKey({
      name: "inventory_transfers_from_clinic_fk",
      columns: [table.accountId, table.fromClinicId],
      foreignColumns: [clinics.accountId, clinics.id],
    }),
    inventoryTransfersToClinicFk: foreignKey({
      name: "inventory_transfers_to_clinic_fk",
      columns: [table.accountId, table.toClinicId],
      foreignColumns: [clinics.accountId, clinics.id],
    }),
    inventoryTransfersItemFk: foreignKey({
      name: "inventory_transfers_item_fk",
      columns: [table.fromClinicId, table.itemId],
      foreignColumns: [inventoryItems.clinicId, inventoryItems.id],
    }),
    inventoryTransfersRequestedByFk: foreignKey({
      name: "inventory_transfers_requested_by_fk",
      columns: [table.fromClinicId, table.requestedByStaffId],
      foreignColumns: [clinicStaff.clinicId, clinicStaff.id],
    }),
    inventoryTransfersApprovedByFk: foreignKey({
      name: "inventory_transfers_approved_by_fk",
      columns: [table.toClinicId, table.approvedByStaffId],
      foreignColumns: [clinicStaff.clinicId, clinicStaff.id],
    }),
  }),
);
