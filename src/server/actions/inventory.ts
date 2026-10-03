"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveClinic, requireActiveClinicOwner } from "@/src/server/auth";
import { clinicDateString } from "@/src/server/services/clinic-app";
import {
  createItem, DuplicateSkuError, InsufficientStockError, ItemNotFoundError, receiveStock, setItemArchived, updateItem, consumeStock, writeOffExpired,
} from "@/src/server/services/inventory";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { itemInputSchema, receiveStockSchema, useStockSchema, type ItemField, type StockField } from "@/src/lib/schemas/inventory";
import type { FormState } from "@/src/types/form-state";

export type ItemFormState = FormState<ItemField> & { saved?: string };
export type StockFormState = FormState<StockField> & { saved?: string };

const LIMIT = { max: 240, windowSeconds: 60 * 60 };
const text = (data: FormData, key: string) => (typeof data.get(key) === "string" ? (data.get(key) as string) : "");

function refresh() {
  revalidatePath(CLINIX_ROUTES.app, "layout");
  revalidatePath(`${CLINIX_ROUTES.admin}/inventory`);
}

/** Owner adds or edits an item on the shelf list. */
export async function saveItemAction(_prev: ItemFormState, data: FormData): Promise<ItemFormState> {
  const { user, clinic } = await requireActiveClinicOwner();
  const values = Object.fromEntries(["name", "sku", "unit", "reorderThreshold"].map((key) => [key, text(data, key)]));
  const limit = await consumeRateLimit("clinic-write", user.id, LIMIT);
  if (!limit.allowed) return { values, message: "Too many changes in a short time. Wait a moment and try again." };
  const parsed = itemInputSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const id = z.uuid().safeParse(data.get("id"));
  try {
    if (id.success) await updateItem(clinic.id, user.id, id.data, parsed.data);
    else await createItem(clinic.id, user.id, parsed.data);
  } catch (error) {
    if (error instanceof DuplicateSkuError) return { values, fieldErrors: { sku: ["Another item already uses this SKU."] } };
    if (error instanceof ItemNotFoundError) return { values, message: "That item no longer exists." };
    throw error;
  }
  refresh();
  return { saved: parsed.data.name };
}

export async function setItemArchivedAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireActiveClinicOwner();
  const parsed = z.object({ id: z.uuid(), archived: z.enum(["true", "false"]) }).safeParse({ id: data.get("id"), archived: data.get("archived") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  try {
    await setItemArchived(clinic.id, user.id, parsed.data.id, parsed.data.archived === "true");
  } catch (error) {
    if (error instanceof DuplicateSkuError) return { message: "An active item already uses this SKU. Change one first." };
    if (error instanceof ItemNotFoundError) return { message: "That item no longer exists." };
    throw error;
  }
  refresh();
  return {};
}

/** Owner receives a delivery as a new lot. */
export async function receiveStockAction(_prev: StockFormState, data: FormData): Promise<StockFormState> {
  const { user, clinic } = await requireActiveClinicOwner();
  const values = Object.fromEntries(["quantity", "lotNumber", "expiresOn"].map((key) => [key, text(data, key)]));
  const limit = await consumeRateLimit("clinic-write", user.id, LIMIT);
  if (!limit.allowed) return { values, message: "Too many changes in a short time. Wait a moment and try again." };
  const parsed = receiveStockSchema.safeParse({ ...values, itemId: data.get("itemId") });
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await receiveStock(clinic.id, user.id, parsed.data);
  } catch (error) {
    if (error instanceof ItemNotFoundError) return { values, message: "That item no longer exists." };
    throw error;
  }
  refresh();
  return { saved: `${parsed.data.quantity} received` };
}

/** Any staff member records stock used. */
export async function consumeStockAction(_prev: StockFormState, data: FormData): Promise<StockFormState> {
  const { user, clinic } = await requireActiveClinic();
  const values = Object.fromEntries(["quantity", "reason"].map((key) => [key, text(data, key)]));
  const limit = await consumeRateLimit("clinic-write", user.id, LIMIT);
  if (!limit.allowed) return { values, message: "Too many changes in a short time. Wait a moment and try again." };
  const parsed = useStockSchema.safeParse({ ...values, itemId: data.get("itemId") });
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await consumeStock(clinic.id, user.id, clinicDateString(clinic.timezone), parsed.data);
  } catch (error) {
    if (error instanceof InsufficientStockError) return { values, fieldErrors: { quantity: [`Only ${error.available} in date.`] } };
    if (error instanceof ItemNotFoundError) return { values, message: "That item no longer exists." };
    throw error;
  }
  refresh();
  return { saved: `${parsed.data.quantity} used` };
}

export async function writeOffExpiredAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireActiveClinicOwner();
  const id = z.uuid().safeParse(data.get("id"));
  if (!id.success) return { message: "That change isn't allowed." };
  try {
    await writeOffExpired(clinic.id, user.id, clinicDateString(clinic.timezone), id.data);
  } catch (error) {
    if (error instanceof ItemNotFoundError) return { message: "That item no longer exists." };
    throw error;
  }
  refresh();
  return {};
}
