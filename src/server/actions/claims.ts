"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClinicRole } from "@/src/server/auth";
import { NotFoundError } from "@/src/server/services/clinic-app";
import { ClaimClosedError, ClaimNotFoundError, createClaim, setClaimStatus, UnknownReceiptError, updateClaim } from "@/src/server/services/claims";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { claimInputSchema, claimStatusSchema, type ClaimField } from "@/src/lib/schemas/claim";
import type { FormState } from "@/src/types/form-state";

export type ClaimFormState = FormState<ClaimField> & { saved?: string };

const FIELDS = ["patientId", "payorType", "payorName", "memberOrPolicyNumber", "loaNumber", "claimAmountCents", "receiptNumber", "notes"] as const;
const LIMIT = { max: 120, windowSeconds: 60 * 60 };

function refresh() {
  revalidatePath(CLINIX_ROUTES.app, "layout");
  revalidatePath(`${CLINIX_ROUTES.admin}/claims`);
}

/** Owner and front desk file and edit claims. Withdrawing one is the delete (it is kept). */
export async function saveClaimAction(_prev: ClaimFormState, data: FormData): Promise<ClaimFormState> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const values = Object.fromEntries(FIELDS.map((key) => [key, typeof data.get(key) === "string" ? (data.get(key) as string) : ""]));
  const limit = await consumeRateLimit("clinic-write", user.id, LIMIT);
  if (!limit.allowed) return { values, message: "Too many changes in a short time. Wait a moment and try again." };
  const parsed = claimInputSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const id = z.uuid().safeParse(data.get("id"));
  try {
    if (id.success) await updateClaim(clinic.id, user.id, id.data, parsed.data);
    else await createClaim(clinic.id, user.id, parsed.data);
  } catch (error) {
    if (error instanceof UnknownReceiptError) return { values, fieldErrors: { receiptNumber: ["No receipt with that number."] } };
    if (error instanceof NotFoundError) return { values, message: "That patient could not be found." };
    if (error instanceof ClaimNotFoundError) return { values, message: "That claim no longer exists." };
    if (error instanceof ClaimClosedError) return { values, message: "A paid or withdrawn claim can't be edited." };
    throw error;
  }
  refresh();
  return { saved: parsed.data.payorName };
}

export async function setClaimStatusAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const parsed = claimStatusSchema.safeParse({ id: data.get("id"), status: data.get("status") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  // Withdrawing is the delete; keep it with the owner, like voiding a receipt.
  if (parsed.data.status === "withdrawn" && clinic.role !== "owner") return { message: "Only the owner can withdraw a claim." };
  try {
    await setClaimStatus(clinic.id, user.id, parsed.data.id, parsed.data.status);
  } catch (error) {
    if (error instanceof ClaimNotFoundError) return { message: "That claim no longer exists." };
    if (error instanceof ClaimClosedError) return { message: "A paid or withdrawn claim can't change." };
    throw error;
  }
  refresh();
  return {};
}
