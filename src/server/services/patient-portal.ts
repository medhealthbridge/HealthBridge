import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { withInviteToken, withTenant, withUser } from "@/src/server/db/client";
import { appointments, auditLogs, clinics, invoices, patientInvites, patients, services } from "@/src/server/db/schema";
import { clinicLinkOrigin } from "@/src/lib/clinic-host";
import { CLINIX_ROUTES, STAFF_INVITE_TTL_DAYS } from "@/src/lib/constants";
import { NotFoundError, type StaffClinic } from "./clinic-app";
import { sendPatientInviteEmail } from "./email";
import { newSecretToken, sha256Hex } from "./tokens";

export class AlreadyLinkedError extends Error {}

const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const nameOf = (row: { firstName: string | null; lastName: string | null; displayName: string | null }) =>
  row.displayName || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Patient";

/** Staff create the invite; the earlier pending link for that patient stops working. Returns the raw token for the email. */
export async function createPatientInvite(clinic: Pick<StaffClinic, "id" | "staffId">, actorUserId: string, patientId: string, email: string) {
  const address = email.trim().toLowerCase();
  const { token, tokenHash } = newSecretToken();
  await withTenant(clinic.id, async (tx) => {
    const [patient] = await tx
      .select({ id: patients.id, portalUserId: patients.portalUserId })
      .from(patients)
      .where(and(eq(patients.clinicId, clinic.id), eq(patients.id, patientId), isNull(patients.deletedAt)))
      .limit(1);
    if (!patient) throw new NotFoundError("patient");
    if (patient.portalUserId) throw new AlreadyLinkedError();
    await tx.update(patientInvites).set({ status: "revoked" }).where(and(eq(patientInvites.clinicId, clinic.id), eq(patientInvites.patientId, patientId), eq(patientInvites.status, "pending")));
    const [row] = await tx
      .insert(patientInvites)
      .values({ clinicId: clinic.id, patientId, email: address, tokenHash, invitedByStaffId: clinic.staffId, expiresAt: days(STAFF_INVITE_TTL_DAYS) })
      .returning({ id: patientInvites.id });
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "patient", entityId: patientId, action: "update", diff: { portalInvite: { inviteId: row.id, email: address } } });
  });
  return { token, email: address };
}

export async function emailPatientInvite(clinic: Pick<StaffClinic, "name" | "subdomain">, invite: { token: string; email: string }) {
  try {
    await sendPatientInviteEmail({ clinicName: clinic.name, email: invite.email }, `${clinicLinkOrigin(clinic.subdomain)}${CLINIX_ROUTES.portalJoin}?token=${encodeURIComponent(invite.token)}`);
    return { emailed: true };
  } catch (error) {
    console.error("[email] patient invite failed:", error instanceof Error ? error.message : "unknown error");
    return { emailed: false };
  }
}

/** The pending invite behind a token, or null. Works before anyone is signed in. */
export async function findOpenPatientInvite(token: string) {
  const hash = sha256Hex(token);
  const invite = await withInviteToken(hash, async (tx) => {
    const [row] = await tx
      .select({ clinicId: patientInvites.clinicId, email: patientInvites.email })
      .from(patientInvites)
      .where(and(eq(patientInvites.tokenHash, hash), eq(patientInvites.status, "pending"), sql`${patientInvites.expiresAt} > now()`))
      .limit(1);
    return row ?? null;
  });
  if (!invite) return null;
  const clinicName = await withTenant(invite.clinicId, async (tx) => {
    const [row] = await tx.select({ name: clinics.name }).from(clinics).where(eq(clinics.id, invite.clinicId)).limit(1);
    return row?.name ?? "the clinic";
  });
  return { ...invite, clinicName };
}

/** Single-use: only the call that flips pending → accepted proceeds. */
export async function claimPatientInvite(token: string) {
  const hash = sha256Hex(token);
  return withInviteToken(hash, async (tx) => {
    const [row] = await tx
      .update(patientInvites)
      .set({ status: "accepted" })
      .where(and(eq(patientInvites.tokenHash, hash), eq(patientInvites.status, "pending"), sql`${patientInvites.expiresAt} > now()`))
      .returning({ clinicId: patientInvites.clinicId, patientId: patientInvites.patientId, email: patientInvites.email });
    return row ?? null;
  });
}

export async function releasePatientInvite(token: string) {
  const hash = sha256Hex(token);
  await withInviteToken(hash, (tx) => tx.update(patientInvites).set({ status: "pending" }).where(and(eq(patientInvites.tokenHash, hash), eq(patientInvites.status, "accepted"))));
}

/** Ties the patient record to the signed-up person. Refuses a record that is already linked or archived. */
export async function linkPortalUser(clinicId: string, patientId: string, userId: string) {
  await withTenant(clinicId, async (tx) => {
    const linked = await tx
      .update(patients)
      .set({ portalUserId: userId })
      .where(and(eq(patients.clinicId, clinicId), eq(patients.id, patientId), isNull(patients.portalUserId), isNull(patients.deletedAt)))
      .returning({ id: patients.id });
    if (linked.length === 0) throw new AlreadyLinkedError();
    await tx.insert(auditLogs).values({ clinicId, actorUserId: userId, entityType: "patient", entityId: patientId, action: "update", diff: { portalLinked: true } });
  });
}

export type PortalVisit = { id: string; startsAt: Date; status: string; serviceName: string | null };
export type PortalReceipt = { invoiceNumber: string; issuedAt: Date | null; totalCents: number; status: string };
export type PortalRecord = {
  clinicName: string;
  timezone: string;
  patientName: string;
  mrn: string;
  upcoming: PortalVisit[];
  past: PortalVisit[];
  receipts: PortalReceipt[];
};

/**
 * Everything a patient may see about themselves, and nothing else: their own
 * appointments and receipts. Clinical notes are never included. The patient id
 * comes from their own login (the `patient_self_read` policy), never from the request.
 */
export async function getPortalRecords(userId: string): Promise<PortalRecord[]> {
  const own = await withUser(userId, (tx) =>
    tx
      .select({ id: patients.id, clinicId: patients.clinicId, mrn: patients.medicalRecordNumber, firstName: patients.firstName, lastName: patients.lastName, displayName: patients.displayName })
      .from(patients)
      .where(and(eq(patients.portalUserId, userId), isNull(patients.deletedAt))),
  );
  return Promise.all(
    own.map((patient) =>
      withTenant(patient.clinicId, async (tx) => {
        const [clinic] = await tx.select({ name: clinics.name, timezone: clinics.timezone }).from(clinics).where(eq(clinics.id, patient.clinicId)).limit(1);
        const visitColumns = { id: appointments.id, startsAt: appointments.startsAt, status: appointments.status, serviceName: services.name };
        const base = (statuses: string[]) =>
          tx
            .select(visitColumns)
            .from(appointments)
            .leftJoin(services, and(eq(services.clinicId, appointments.clinicId), eq(services.id, appointments.serviceId)))
            .where(and(eq(appointments.clinicId, patient.clinicId), eq(appointments.patientId, patient.id), inArray(appointments.status, statuses as never[])));
        const now = new Date();
        const [upcoming, past, receipts] = await Promise.all([
          base(["requested", "confirmed", "checked_in", "in_progress"]).then((rows) => rows.filter((row) => row.startsAt >= now || row.status === "in_progress" || row.status === "checked_in")),
          base(["completed"]).orderBy(desc(appointments.startsAt)).limit(20),
          tx
            .select({ invoiceNumber: invoices.invoiceNumber, issuedAt: invoices.issuedAt, totalCents: invoices.totalCents, status: invoices.status })
            .from(invoices)
            .where(and(eq(invoices.clinicId, patient.clinicId), eq(invoices.patientId, patient.id), inArray(invoices.status, ["paid", "void"])))
            .orderBy(desc(invoices.createdAt))
            .limit(50),
        ]);
        const sortAsc = (rows: typeof upcoming) => [...rows].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
        return {
          clinicName: clinic?.name ?? "Clinic",
          timezone: clinic?.timezone ?? "Asia/Manila",
          patientName: nameOf(patient),
          mrn: patient.mrn,
          upcoming: sortAsc(upcoming).map((row) => ({ ...row })),
          past: past.map((row) => ({ ...row })),
          receipts,
        };
      }),
    ),
  );
}

