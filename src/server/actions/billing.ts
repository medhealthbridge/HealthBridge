"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClinicRole } from "@/src/server/auth";
import { NotFoundError } from "@/src/server/services/clinic-app";
import { checkout, InvalidServiceError, InvoiceAlreadyVoidError, InvoiceNotFoundError, voidInvoice } from "@/src/server/services/billing";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { checkoutSchema, voidInvoiceSchema, type CheckoutField } from "@/src/lib/schemas/invoice";
import type { FormState } from "@/src/types/form-state";

export type CheckoutState = FormState<CheckoutField> & { invoiceNumber?: string };

const text = (data: FormData, key: string) => (typeof data.get(key) === "string" ? (data.get(key) as string) : "");

function refresh() {
  revalidatePath(CLINIX_ROUTES.app, "layout");
  revalidatePath(`${CLINIX_ROUTES.admin}/billing`, "layout");
}

/** Owner and front desk take payment. Prices come from the price list on the server, never from the form. */
export async function checkoutAction(_prev: CheckoutState, data: FormData): Promise<CheckoutState> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const values = Object.fromEntries(["patientId", "appointmentId", "discountType", "discountIdNumber", "method", "referenceNumber", "lines"].map((key) => [key, text(data, key)]));
  const limit = await consumeRateLimit("clinic-write", user.id, { max: 120, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { values, message: "Too many changes in a short time. Wait a moment and try again." };

  let lines: unknown = [];
  try {
    lines = JSON.parse(values.lines || "[]");
  } catch {
    return { values, fieldErrors: { lines: ["Add at least one service."] } };
  }
  const parsed = checkoutSchema.safeParse({ ...values, lines });
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    const result = await checkout(clinic, user.id, parsed.data);
    refresh();
    return { invoiceNumber: result.invoiceNumber };
  } catch (error) {
    if (error instanceof NotFoundError) return { values, message: "That patient could not be found." };
    if (error instanceof InvalidServiceError) return { values, message: "A service on this bill was archived or removed. Refresh and try again." };
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
