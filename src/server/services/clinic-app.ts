import { and, asc, count, eq, gte, ilike, inArray, isNull, lt, max, or } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { appointments, auditLogs, clinicStaff, clinics, patients, user } from "@/src/server/db/schema";

export type StaffRole = "owner" | "practitioner" | "assistant";

/** One clinic the signed-in user works at, with the role they hold there. */
export type StaffClinic = {
  id: string;
  staffId: string;
  role: StaffRole;
  name: string;
  subdomain: string;
  timezone: string;
};

export type AppointmentStatus =
  | "requested"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type TodayAppointment = {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  startsAt: Date;
  status: AppointmentStatus;
  source: string;
  queueNumber: number | null;
  practitionerStaffId: string | null;
  practitionerName: string | null;
  chairOrRoom: string | null;
};

export type PatientRow = {
  id: string;
  mrn: string;
  name: string;
  kind: string;
  dateOfBirth: string | null;
  sex: string | null;
  phone: string | null;
  philhealth: string | null;
  discountId: string | null;
  createdAt: Date;
};

export type PractitionerOption = { staffId: string; name: string };

/** The next states an appointment may move to. Anything not listed is refused. */
export const NEXT_STATUS: Record<AppointmentStatus, AppointmentStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "no_show", "cancelled"],
  checked_in: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export class TransitionError extends Error {}
export class NotFoundError extends Error {}

const WALK_IN_MINUTES = 30;

/** Clinic-local midnight to midnight, as absolute instants. */
export function dayBounds(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const localAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offsetMs = Math.round((localAsUtc - now.getTime()) / 60000) * 60000;
  const start = new Date(Date.UTC(get("year"), get("month") - 1, get("day")) - offsetMs);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/** Clinic details for each membership; `memberships` comes from the verified session. */
export async function describeStaffClinics(
  memberships: { staffId: string; clinicId: string; role: StaffRole }[],
): Promise<StaffClinic[]> {
  const found = await Promise.all(
    memberships.map((membership) =>
      withTenant(membership.clinicId, async (tx) => {
        const [row] = await tx
          .select({ name: clinics.name, subdomain: clinics.subdomain, timezone: clinics.timezone })
          .from(clinics)
          .where(eq(clinics.id, membership.clinicId))
          .limit(1);
        return row ? { id: membership.clinicId, staffId: membership.staffId, role: membership.role, ...row } : null;
      }),
    ),
  );
  return found.filter((clinic): clinic is StaffClinic => clinic !== null);
}

function fullName(row: { firstName: string | null; lastName: string | null; displayName: string | null }) {
  return row.displayName || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unnamed patient";
}

/**
 * Today's bookings and walk-ins. A practitioner passes their own staff id so
 * they only see their own chair; owners and assistants see the whole floor.
 */
export async function listTodayAppointments(
  clinic: Pick<StaffClinic, "id" | "timezone">,
  onlyPractitionerStaffId?: string,
): Promise<TodayAppointment[]> {
  const { start, end } = dayBounds(clinic.timezone);
  return withTenant(clinic.id, async (tx) => {
    const rows = await tx
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        startsAt: appointments.startsAt,
        status: appointments.status,
        source: appointments.source,
        queueNumber: appointments.queueNumber,
        practitionerStaffId: appointments.practitionerStaffId,
        chairOrRoom: appointments.chairOrRoom,
        firstName: patients.firstName,
        lastName: patients.lastName,
        displayName: patients.displayName,
        mrn: patients.medicalRecordNumber,
        practitionerName: user.name,
      })
      .from(appointments)
      .innerJoin(patients, and(eq(patients.clinicId, appointments.clinicId), eq(patients.id, appointments.patientId)))
      .leftJoin(
        clinicStaff,
        and(eq(clinicStaff.clinicId, appointments.clinicId), eq(clinicStaff.id, appointments.practitionerStaffId)),
      )
      .leftJoin(user, eq(user.id, clinicStaff.userId))
      .where(
        and(
          eq(appointments.clinicId, clinic.id),
          isNull(appointments.deletedAt),
          gte(appointments.startsAt, start),
          lt(appointments.startsAt, end),
          onlyPractitionerStaffId ? eq(appointments.practitionerStaffId, onlyPractitionerStaffId) : undefined,
        ),
      )
      .orderBy(asc(appointments.startsAt));
    return rows.map((row) => ({
      id: row.id,
      patientId: row.patientId,
      patientName: fullName(row),
      mrn: row.mrn,
      startsAt: row.startsAt,
      status: row.status as AppointmentStatus,
      source: row.source,
      queueNumber: row.queueNumber,
      practitionerStaffId: row.practitionerStaffId,
      practitionerName: row.practitionerName,
      chairOrRoom: row.chairOrRoom,
    }));
  });
}

export async function listPractitioners(clinicId: string): Promise<PractitionerOption[]> {
  return withTenant(clinicId, async (tx) => {
    const rows = await tx
      .select({ staffId: clinicStaff.id, name: user.name })
      .from(clinicStaff)
      .innerJoin(user, eq(user.id, clinicStaff.userId))
      .where(
        and(
          eq(clinicStaff.clinicId, clinicId),
          eq(clinicStaff.isActive, true),
          isNull(clinicStaff.deletedAt),
          inArray(clinicStaff.role, ["owner", "practitioner"]),
        ),
      )
      .orderBy(asc(user.name));
    return rows;
  });
}

const PATIENT_LIMIT = 200;

export async function listPatients(clinicId: string, query?: string): Promise<{ rows: PatientRow[]; total: number }> {
  const needle = query?.trim();
  const pattern = needle ? `%${needle.replace(/[\\%_]/g, "\\$&")}%` : null;
  return withTenant(clinicId, async (tx) => {
    const scope = and(
      eq(patients.clinicId, clinicId),
      isNull(patients.deletedAt),
      pattern
        ? or(
            ilike(patients.firstName, pattern),
            ilike(patients.lastName, pattern),
            ilike(patients.displayName, pattern),
            ilike(patients.medicalRecordNumber, pattern),
            ilike(patients.contactPhone, pattern),
          )
        : undefined,
    );
    const [{ total }] = await tx.select({ total: count() }).from(patients).where(scope);
    const rows = await tx
      .select()
      .from(patients)
      .where(scope)
      .orderBy(asc(patients.lastName), asc(patients.firstName))
      .limit(PATIENT_LIMIT);
    return {
      total,
      rows: rows.map((row) => ({
        id: row.id,
        mrn: row.medicalRecordNumber,
        name: fullName(row),
        kind: row.patientKind,
        dateOfBirth: row.dateOfBirth,
        sex: row.sex,
        phone: row.contactPhone,
        philhealth: row.philhealthMemberPin,
        discountId: row.oscaId ?? row.pwdId,
        createdAt: row.createdAt,
      })),
    };
  });
}

export type NewPatient = {
  firstName: string;
  lastName: string;
  sex: "F" | "M";
  dateOfBirth: string | null;
  phone: string | null;
  philhealth: string | null;
  oscaId: string | null;
  pwdId: string | null;
};

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}

/** Adds a patient with the intake consent stamped, and its audit row, in one transaction. */
export async function createPatient(clinicId: string, actorUserId: string, input: NewPatient) {
  // MRNs are sequential per clinic. Two front-desk staff adding at once can
  // pick the same number; the unique index refuses the loser, who takes the next.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await withTenant(clinicId, async (tx) => {
        const [{ total }] = await tx.select({ total: count() }).from(patients).where(eq(patients.clinicId, clinicId));
        const mrn = `MRN-${String(total + 1 + attempt).padStart(5, "0")}`;
        const [row] = await tx
          .insert(patients)
          .values({
            clinicId,
            medicalRecordNumber: mrn,
            firstName: input.firstName,
            lastName: input.lastName,
            sex: input.sex,
            dateOfBirth: input.dateOfBirth,
            contactPhone: input.phone,
            philhealthMemberPin: input.philhealth,
            oscaId: input.oscaId,
            pwdId: input.pwdId,
            dataPrivacyConsentAt: new Date(),
          })
          .returning({ id: patients.id, mrn: patients.medicalRecordNumber });
        await tx.insert(auditLogs).values({
          clinicId,
          actorUserId,
          entityType: "patient",
          entityId: row.id,
          action: "create",
          diff: { after: { mrn: row.mrn } },
        });
        return row;
      });
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 3) throw error;
    }
  }
  throw new Error("unreachable");
}

/** Puts an existing patient in today's queue, checked in now, with the next queue number. */
export async function addWalkIn(
  clinic: Pick<StaffClinic, "id" | "timezone">,
  actorUserId: string,
  input: { patientId: string; practitionerStaffId: string | null; chairOrRoom: string | null },
) {
  const { start, end } = dayBounds(clinic.timezone);
  return withTenant(clinic.id, async (tx) => {
    const [patient] = await tx
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.clinicId, clinic.id), eq(patients.id, input.patientId), isNull(patients.deletedAt)))
      .limit(1);
    if (!patient) throw new NotFoundError("patient");

    if (input.practitionerStaffId) {
      const [staff] = await tx
        .select({ id: clinicStaff.id })
        .from(clinicStaff)
        .where(
          and(
            eq(clinicStaff.clinicId, clinic.id),
            eq(clinicStaff.id, input.practitionerStaffId),
            eq(clinicStaff.isActive, true),
            isNull(clinicStaff.deletedAt),
          ),
        )
        .limit(1);
      if (!staff) throw new NotFoundError("practitioner");
    }

    const [{ last }] = await tx
      .select({ last: max(appointments.queueNumber) })
      .from(appointments)
      .where(and(eq(appointments.clinicId, clinic.id), gte(appointments.startsAt, start), lt(appointments.startsAt, end)));
    const now = new Date();
    const [row] = await tx
      .insert(appointments)
      .values({
        clinicId: clinic.id,
        patientId: input.patientId,
        practitionerStaffId: input.practitionerStaffId,
        chairOrRoom: input.chairOrRoom,
        startsAt: now,
        endsAt: new Date(now.getTime() + WALK_IN_MINUTES * 60_000),
        status: "checked_in",
        source: "walk_in",
        queueNumber: (last ?? 0) + 1,
      })
      .returning({ id: appointments.id, queueNumber: appointments.queueNumber });
    await tx.insert(auditLogs).values({
      clinicId: clinic.id,
      actorUserId,
      entityType: "appointment",
      entityId: row.id,
      action: "create",
      diff: { after: { status: "checked_in", source: "walk_in" } },
    });
    return row;
  });
}

/**
 * Moves an appointment along its workflow. `onlyPractitionerStaffId` limits a
 * practitioner to their own chair; the transition table refuses everything else.
 */
export async function changeAppointmentStatus(
  clinicId: string,
  actorUserId: string,
  input: { appointmentId: string; to: AppointmentStatus; onlyPractitionerStaffId?: string },
) {
  return withTenant(clinicId, async (tx) => {
    const [current] = await tx
      .select({ status: appointments.status, practitioner: appointments.practitionerStaffId })
      .from(appointments)
      .where(
        and(eq(appointments.clinicId, clinicId), eq(appointments.id, input.appointmentId), isNull(appointments.deletedAt)),
      )
      .for("update")
      .limit(1);
    if (!current) throw new NotFoundError("appointment");
    if (input.onlyPractitionerStaffId && current.practitioner !== input.onlyPractitionerStaffId) {
      throw new NotFoundError("appointment");
    }
    const from = current.status as AppointmentStatus;
    if (!NEXT_STATUS[from]?.includes(input.to)) throw new TransitionError(`${from} → ${input.to}`);

    await tx
      .update(appointments)
      .set({ status: input.to })
      .where(and(eq(appointments.clinicId, clinicId), eq(appointments.id, input.appointmentId)));
    await tx.insert(auditLogs).values({
      clinicId,
      actorUserId,
      entityType: "appointment",
      entityId: input.appointmentId,
      action: "update",
      diff: { before: { status: from }, after: { status: input.to } },
    });
  });
}

