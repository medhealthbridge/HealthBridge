"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { createService, DuplicateServiceError, ServiceNotFoundError, setServiceArchived, updateService } from "@/src/server/services/price-list";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { serviceInputSchema, type ServiceField } from "@/src/lib/schemas/service";
import type { FormState } from "@/src/types/form-state";

export type ServiceFormState = FormState<ServiceField> & { saved?: string };

const PATH = `${CLINIX_ROUTES.admin}/services`;
const FIELDS = ["name", "code", "category", "durationMinutes", "priceCentavos", "vatExempt"] as const;
const LIMIT = { max: 120, windowSeconds: 60 * 60 };

const read = (data: FormData) => Object.fromEntries(FIELDS.map((key) => [key, String(data.get(key) ?? "")]));

/** Adds a service, or edits one when the form carries its id. The clinic is the host's, never the form's. */
export async function saveServiceAction(_prev: ServiceFormState, data: FormData): Promise<ServiceFormState> {
  const { user, clinic } = await requireActiveClinicOwner();
  const values = read(data);
  const limit = await consumeRateLimit("clinic-write", user.id, LIMIT);
  if (!limit.allowed) return { values, message: "Too many changes in a short time. Wait a moment and try again." };

  const parsed = serviceInputSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const id = z.uuid().safeParse(data.get("id"));

  try {
    if (id.success) await updateService(clinic.id, user.id, id.data, parsed.data);
    else await createService(clinic.id, user.id, parsed.data);
  } catch (error) {
    if (error instanceof DuplicateServiceError) return { values, fieldErrors: { name: ["A service with this name already exists."] } };
    if (error instanceof ServiceNotFoundError) return { values, message: "That service no longer exists." };
    throw error;
  }
  revalidatePath(PATH);
  return { saved: parsed.data.name };
}

export async function setServiceArchivedAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireActiveClinicOwner();
  const parsed = z.object({ id: z.uuid(), archived: z.enum(["true", "false"]) }).safeParse({ id: data.get("id"), archived: data.get("archived") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  try {
    await setServiceArchived(clinic.id, user.id, parsed.data.id, parsed.data.archived === "true");
  } catch (error) {
    if (error instanceof DuplicateServiceError) return { message: "An active service already uses this name. Rename one first." };
    if (error instanceof ServiceNotFoundError) return { message: "That service no longer exists." };
    throw error;
  }
  revalidatePath(PATH);
  return {};
}
