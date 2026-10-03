"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveClinicOwner, requireClinicRole } from "@/src/server/auth";
import { withTenant } from "@/src/server/db/client";
import { auditLogs, patients } from "@/src/server/db/schema";
import { and, eq } from "drizzle-orm";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { sendReminder, setRemindersEnabled } from "@/src/server/services/reminders";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { patientEmailSchema } from "@/src/lib/schemas/reminders";

export async function setRemindersEnabledAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireActiveClinicOwner();
  const on = z.enum(["true", "false"]).safeParse(data.get("enabled"));
  if (!on.success) return { message: "That change isn't allowed." };
  await setRemindersEnabled(clinic, user.id, on.data === "true");
  revalidatePath(`${CLINIX_ROUTES.admin}/reminders`);
  return {};
}

/** Owner or front desk sends one reminder now. A reminder already sent is never sent twice. */
export async function sendReminderNowAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const id = z.uuid().safeParse(data.get("appointmentId"));
  if (!id.success) return { message: "That change isn't allowed." };
  const limit = await consumeRateLimit("reminder-send", user.id, { max: 60, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { message: "Too many reminders in a short time. Wait a while." };
  const result = await sendReminder(clinic, id.data, user.id);
  revalidatePath(`${CLINIX_ROUTES.admin}/reminders`);
  if (result === "skipped") return { message: "Nothing to send: already reminded, no email on file, or the visit isn't upcoming." };
  if (result === "failed") return { message: "The email could not be sent. Try again in a moment." };
  return {};
}

/** The reminder address for a patient. Empty clears it. */
export async function savePatientEmailAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const parsed = patientEmailSchema.safeParse({ patientId: data.get("patientId"), email: String(data.get("email") ?? "") });
  if (!parsed.success) return { message: z.flattenError(parsed.error).fieldErrors.email?.[0] ?? "That change isn't allowed." };
  const done = await withTenant(clinic.id, async (tx) => {
    const rows = await tx.update(patients).set({ contactEmail: parsed.data.email }).where(and(eq(patients.clinicId, clinic.id), eq(patients.id, parsed.data.patientId))).returning({ id: patients.id });
    if (rows.length === 0) return false;
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId: user.id, entityType: "patient", entityId: parsed.data.patientId, action: "update", diff: { contactEmail: parsed.data.email ? "set" : "cleared" } });
    return true;
  });
  if (!done) return { message: "That patient could not be found." };
  revalidatePath(CLINIX_ROUTES.app, "layout");
  revalidatePath(`${CLINIX_ROUTES.admin}/patients`, "layout");
  return {};
}
