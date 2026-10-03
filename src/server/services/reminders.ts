import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { withPlatformAdmin, withTenant } from "@/src/server/db/client";
import { appointments, auditLogs, clinics, patients, reminderLog, services } from "@/src/server/db/schema";
import { clinicLinkOrigin } from "@/src/lib/clinic-host";
import { addDays, clinicDateString, clinicLocalToUtc, type StaffClinic } from "./clinic-app";
import { sendAppointmentReminderEmail } from "./email";

export const REMINDER_KIND = "day_before";
const MAX_PER_CLINIC_RUN = 200;

export type ReminderCandidate = {
  appointmentId: string;
  patientName: string;
  startsAt: Date;
  serviceName: string | null;
  email: string | null;
  status: "sent" | "failed" | "pending";
};

type Clinic = Pick<StaffClinic, "id" | "name" | "subdomain" | "timezone">;

const nameOf = (row: { firstName: string | null; lastName: string | null; displayName: string | null }) =>
  row.displayName || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Patient";

/** Booked appointments from now until the end of tomorrow (clinic time), with whether each patient has an email and a reminder went out. */
export async function listReminderCandidates(clinic: Clinic): Promise<ReminderCandidate[]> {
  const dayAfter = clinicLocalToUtc(`${addDays(clinicDateString(clinic.timezone), 2)}T00:00`, clinic.timezone);
  return withTenant(clinic.id, async (tx) => {
    const rows = await tx
      .select({
        id: appointments.id, startsAt: appointments.startsAt, serviceName: services.name, email: patients.contactEmail,
        firstName: patients.firstName, lastName: patients.lastName, displayName: patients.displayName, sent: reminderLog.status,
      })
      .from(appointments)
      .innerJoin(patients, and(eq(patients.clinicId, appointments.clinicId), eq(patients.id, appointments.patientId)))
      .leftJoin(services, and(eq(services.clinicId, appointments.clinicId), eq(services.id, appointments.serviceId)))
      .leftJoin(reminderLog, and(eq(reminderLog.clinicId, appointments.clinicId), eq(reminderLog.appointmentId, appointments.id), eq(reminderLog.kind, REMINDER_KIND), eq(reminderLog.channel, "email")))
      .where(and(eq(appointments.clinicId, clinic.id), inArray(appointments.status, ["requested", "confirmed"]), gte(appointments.startsAt, new Date()), lt(appointments.startsAt, dayAfter)))
      .orderBy(appointments.startsAt);
    return rows.map((row) => ({ appointmentId: row.id, patientName: nameOf(row), startsAt: row.startsAt, serviceName: row.serviceName, email: row.email, status: row.sent === "sent" ? "sent" : row.sent === "failed" ? "failed" : "pending" }));
  });
}

/**
 * Emails one reminder, once. The unique log row is claimed first, so a second
 * run or a second click finds it already there and sends nothing. A failed
 * send is kept as "failed" and may be retried; the email carries no clinical detail.
 */
export async function sendReminder(clinic: Clinic & { phone?: string | null }, appointmentId: string, actorUserId: string | null): Promise<"sent" | "failed" | "skipped"> {
  const target = await withTenant(clinic.id, async (tx) => {
    const [row] = await tx
      .select({ startsAt: appointments.startsAt, status: appointments.status, email: patients.contactEmail, serviceName: services.name, phone: clinics.phone, clinicName: clinics.name })
      .from(appointments)
      .innerJoin(patients, and(eq(patients.clinicId, appointments.clinicId), eq(patients.id, appointments.patientId)))
      .innerJoin(clinics, eq(clinics.id, appointments.clinicId))
      .leftJoin(services, and(eq(services.clinicId, appointments.clinicId), eq(services.id, appointments.serviceId)))
      .where(and(eq(appointments.clinicId, clinic.id), eq(appointments.id, appointmentId)))
      .limit(1);
    if (!row || !row.email || !["requested", "confirmed"].includes(row.status) || row.startsAt < new Date()) return null;
    const [claimed] = await tx
      .insert(reminderLog)
      .values({ clinicId: clinic.id, appointmentId, kind: REMINDER_KIND, channel: "email", status: "failed", error: "sending" })
      .onConflictDoUpdate({ target: [reminderLog.appointmentId, reminderLog.kind, reminderLog.channel], set: { status: "failed", error: "sending" }, setWhere: eq(reminderLog.status, "failed") })
      .returning({ id: reminderLog.id });
    return claimed ? { ...row, logId: claimed.id } : null;
  });
  if (!target) return "skipped";

  const when = new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeStyle: "short", timeZone: clinic.timezone }).format(target.startsAt);
  let error: string | null = null;
  try {
    await sendAppointmentReminderEmail(target.email!, { name: target.clinicName, phone: target.phone }, when, target.serviceName, clinicLinkOrigin(clinic.subdomain));
  } catch (caught) {
    error = caught instanceof Error ? caught.message.slice(0, 200) : "send failed";
    console.error("[email] reminder failed:", error);
  }
  await withTenant(clinic.id, async (tx) => {
    await tx.update(reminderLog).set({ status: error ? "failed" : "sent", error }).where(eq(reminderLog.id, target.logId));
    if (actorUserId) await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "appointment", entityId: appointmentId, action: "update", diff: { reminder: error ? "failed" : "sent" } });
  });
  return error ? "failed" : "sent";
}

/** The daily job: every clinic that turned reminders on gets tomorrow's appointments emailed. */
export async function runDailyReminders() {
  const enabled = await withPlatformAdmin((tx) =>
    tx.select({ id: clinics.id, name: clinics.name, subdomain: clinics.subdomain, timezone: clinics.timezone }).from(clinics).where(eq(clinics.remindersEnabled, true)),
  );
  const totals = { clinics: enabled.length, sent: 0, failed: 0 };
  for (const clinic of enabled) {
    const tomorrowStart = clinicLocalToUtc(`${addDays(clinicDateString(clinic.timezone), 1)}T00:00`, clinic.timezone);
    const tomorrowEnd = clinicLocalToUtc(`${addDays(clinicDateString(clinic.timezone), 2)}T00:00`, clinic.timezone);
    const due = (await listReminderCandidates(clinic)).filter((c) => c.email && c.status !== "sent" && c.startsAt >= tomorrowStart && c.startsAt < tomorrowEnd).slice(0, MAX_PER_CLINIC_RUN);
    for (const item of due) {
      const result = await sendReminder(clinic, item.appointmentId, null);
      if (result === "sent") totals.sent++;
      if (result === "failed") totals.failed++;
    }
  }
  return totals;
}

export async function reminderStats(clinicId: string, timezone: string) {
  const since = clinicLocalToUtc(`${addDays(clinicDateString(timezone), -29)}T00:00`, timezone);
  return withTenant(clinicId, async (tx) => {
    const [row] = await tx
      .select({ sent: sql<number>`count(*) filter (where ${reminderLog.status} = 'sent')::int`, failed: sql<number>`count(*) filter (where ${reminderLog.status} = 'failed')::int` })
      .from(reminderLog)
      .where(and(eq(reminderLog.clinicId, clinicId), gte(reminderLog.createdAt, since)));
    const [setting] = await tx.select({ enabled: clinics.remindersEnabled }).from(clinics).where(eq(clinics.id, clinicId)).limit(1);
    return { sent: row?.sent ?? 0, failed: row?.failed ?? 0, enabled: setting?.enabled ?? false };
  });
}

export async function setRemindersEnabled(clinic: Pick<StaffClinic, "id">, actorUserId: string, enabled: boolean) {
  await withTenant(clinic.id, async (tx) => {
    await tx.update(clinics).set({ remindersEnabled: enabled }).where(eq(clinics.id, clinic.id));
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "account", entityId: clinic.id, action: "update", diff: { remindersEnabled: enabled } });
  });
}

export async function recentReminderFailures(clinicId: string) {
  return withTenant(clinicId, (tx) =>
    tx.select({ appointmentId: reminderLog.appointmentId, error: reminderLog.error, at: reminderLog.updatedAt }).from(reminderLog).where(and(eq(reminderLog.clinicId, clinicId), eq(reminderLog.status, "failed"))).orderBy(desc(reminderLog.updatedAt)).limit(10),
  );
}
