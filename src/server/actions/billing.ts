"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveClinicOwner, requireClinicRole } from "@/src/server/auth";
import { NotFoundError } from "@/src/server/services/clinic-app";
import {
  checkout, InvalidDiscountError, InvalidPaymentError, InvalidServiceError, InvoiceAlreadyVoidError, InvoiceNotFoundError, recordPayment, voidInvoice,
} from "@/src/server/services/billing";
import { DiscountNotFoundError, DuplicateDiscountError, saveDiscountType, setDiscountArchived } from "@/src/server/services/discount-types";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { checkoutSchema, discountTypeSchema, recordPaymentSchema, voidInvoiceSchema, type CheckoutField } from "@/src/lib/schemas/invoice";
import type { FormState } from "@/src/types/form-state";

export type CheckoutState = FormState<CheckoutField> & { invoiceNumber?: string };
export type PaymentState = { message?: string; fieldErrors?: Record<string, string[] | undefined>; recorded?: string };
export type DiscountFormState = { message?: string; fieldErrors?: Record<string, string[] | undefined>; saved?: string; values?: Record<string, string> };

const text = (data: FormData, key: string) => (typeof data.get(key) === "string" ? (data.get(key) as string) : "");
const FORM_KEYS = ["patientId", "appointmentId", "discountType", "savedDiscountId", "discountIdNumber", "discountLabel", "customKind", "customValue", "payNow", "method", "referenceNumber", "installmentCount", "firstDueOn", "recallMonths", "recallReason", "lines", "planItemIds"];

function refresh() {
  revalidatePath(CLINIX_ROUTES.app, "layout");
  revalidatePath(`${CLINIX_ROUTES.admin}/billing`, "layout");
  revalidatePath(`${CLINIX_ROUTES.admin}/patients`, "layout");
}

const json = <T,>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw || "null") ?? fallback;
  } catch {
    return fallback;
  }
};

/** Owner and front desk take payment or put it on account. Prices come from the price list and the agreed plan on the server, never the form. */
export async function checkoutAction(_prev: CheckoutState, data: FormData): Promise<CheckoutState> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const values = Object.fromEntries(FORM_KEYS.map((key) => [key, text(data, key)]));
  const limit = await consumeRateLimit("clinic-write", user.id, { max: 120, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { values, message: "Too many changes in a short time. Wait a moment and try again." };

  const parsed = checkoutSchema.safeParse({
    patientId: values.patientId,
    appointmentId: values.appointmentId,
    lines: json(values.lines, []),
    planItemIds: json(values.planItemIds, []),
    discount: { type: values.discountType || "none", savedId: values.savedDiscountId, idNumber: values.discountIdNumber, label: values.discountLabel, customKind: values.customKind || "percent", customValue: values.customValue },
    payNow: values.payNow,
    method: values.method || undefined,
    referenceNumber: values.referenceNumber,
    installmentCount: values.installmentCount || 0,
    firstDueOn: values.firstDueOn,
    recallMonths: values.recallMonths || 0,
    recallReason: values.recallReason,
  });
  if (!parsed.success) {
    const flat = z.treeifyError(parsed.error);
    const errors: Partial<Record<CheckoutField, string[]>> = {};
    const walk = (node: { errors?: string[]; properties?: Record<string, unknown> }, path: string[]) => {
      if (node.errors?.length) errors[(path.at(-1) ?? "lines") as CheckoutField] = node.errors;
      for (const [key, child] of Object.entries(node.properties ?? {})) walk(child as { errors?: string[]; properties?: Record<string, unknown> }, [...path, key]);
    };
    walk(flat as { errors?: string[]; properties?: Record<string, unknown> }, []);
    return { values, fieldErrors: errors };
  }

  try {
    const result = await checkout(clinic, user.id, parsed.data);
    refresh();
    return { invoiceNumber: result.invoiceNumber };
  } catch (error) {
    if (error instanceof NotFoundError) return { values, message: "That patient could not be found." };
    if (error instanceof InvalidServiceError) return { values, message: "A service or plan item on this bill was archived, cancelled or already billed. Refresh and try again." };
    if (error instanceof InvalidDiscountError || error instanceof InvalidPaymentError) return { values, message: error.reason };
    throw error;
  }
}

/** Takes another payment on an open receipt. Front desk and owner. */
export async function recordPaymentAction(_prev: PaymentState, data: FormData): Promise<PaymentState> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const limit = await consumeRateLimit("clinic-write", user.id, { max: 120, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { message: "Too many changes in a short time. Wait a moment and try again." };
  const parsed = recordPaymentSchema.safeParse({ invoiceId: text(data, "invoiceId"), amount: text(data, "amount"), method: text(data, "method"), referenceNumber: text(data, "referenceNumber") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    const result = await recordPayment(clinic, user.id, parsed.data.invoiceId, { amountCents: parsed.data.amount, method: parsed.data.method, referenceNumber: parsed.data.referenceNumber });
    refresh();
    return { recorded: result.receipt };
  } catch (error) {
    if (error instanceof InvoiceNotFoundError) return { message: "That receipt no longer exists." };
    if (error instanceof InvoiceAlreadyVoidError) return { message: "That receipt is void." };
    if (error instanceof InvalidPaymentError) return { message: error.reason };
    throw error;
  }
}

/** Voiding a receipt is the owner's call: the front desk can ask, but cannot do it. */
export async function voidInvoiceAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireClinicRole("owner");
  const parsed = voidInvoiceSchema.safeParse({ invoiceId: data.get("invoiceId"), reason: data.get("reason") });
  if (!parsed.success) return { message: z.flattenError(parsed.error).fieldErrors.reason?.[0] ?? "That change isn't allowed." };
  try {
    await voidInvoice(clinic, user.id, parsed.data.invoiceId, parsed.data.reason);
  } catch (error) {
    if (error instanceof InvoiceNotFoundError) return { message: "That receipt no longer exists." };
    if (error instanceof InvoiceAlreadyVoidError) return { message: "That receipt is already void." };
    throw error;
  }
  refresh();
  return {};
}

/** The owner sets up the clinic's own discounts (Employee 10%, Promo ₱500 off …). Senior and PWD are built in. */
export async function saveDiscountTypeAction(_prev: DiscountFormState, data: FormData): Promise<DiscountFormState> {
  const { user, clinic } = await requireActiveClinicOwner();
  const values = Object.fromEntries(["name", "description", "kind", "value"].map((key) => [key, text(data, key)]));
  const parsed = discountTypeSchema.safeParse({ ...values, requiresId: text(data, "requiresId") });
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const id = z.uuid().safeParse(data.get("id"));
  try {
    await saveDiscountType(clinic.id, user.id, parsed.data, id.success ? id.data : undefined);
  } catch (error) {
    if (error instanceof DuplicateDiscountError) return { values, fieldErrors: { name: ["You already have a discount with this name."] } };
    if (error instanceof DiscountNotFoundError) return { values, message: "That discount no longer exists." };
    throw error;
  }
  revalidatePath(`${CLINIX_ROUTES.admin}/settings`);
  return { saved: parsed.data.name };
}

export async function setDiscountArchivedAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireActiveClinicOwner();
  const parsed = z.object({ id: z.uuid(), archived: z.enum(["true", "false"]) }).safeParse({ id: data.get("id"), archived: data.get("archived") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  try {
    await setDiscountArchived(clinic.id, user.id, parsed.data.id, parsed.data.archived === "true");
  } catch (error) {
    if (error instanceof DuplicateDiscountError) return { message: "An active discount already uses this name. Rename one first." };
    if (error instanceof DiscountNotFoundError) return { message: "That discount no longer exists." };
    throw error;
  }
  revalidatePath(`${CLINIX_ROUTES.admin}/settings`);
  return {};
}
