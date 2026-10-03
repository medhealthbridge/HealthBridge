import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lt, max, or, sql } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { appointments, auditLogs, clinicStaff, clinics, patients, services, user } from "@/src/server/db/schema";

export type StaffRole = "owner" | "practitioner" | "assistant";

/** One clinic the signed-in user works at, with the role they hold there. */
export type StaffClinic = {
  id: string;
  accountId: string;
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
  endsAt: Date;
  serviceId: string | null;
  serviceName: string | null;
};

export type PatientRow = {
  id: string;
  mrn: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  kind: string;
  dateOfBirth: string | null;
  sex: string | null;
  phone: string | null;
  philhealth: string | null;
  oscaId: string | null;
  pwdId: string | null;
  discountId: string | null;
  lastVisit: Date | null;
  archived: boolean;
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
/** The practitioner already has an appointment in that time. */
export class ConflictError extends Error {}

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
          .select({ accountId: clinics.accountId, name: clinics.name, subdomain: clinics.subdomain, timezone: clinics.timezone })
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
  /** Any instant inside the day wanted; defaults to now (today). */
  on: Date = new Date(),
): Promise<TodayAppointment[]> {
  const { start, end } = dayBounds(clinic.timezone, on);
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
        endsAt: appointments.endsAt,
        serviceId: appointments.serviceId,
        serviceName: services.name,
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
      .leftJoin(services, and(eq(services.clinicId, appointments.clinicId), eq(services.id, appointments.serviceId)))
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
      endsAt: row.endsAt,
      serviceId: row.serviceId,
      serviceName: row.serviceName,
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

export async function listPatients(clinicId: string, query?: string, archived = false): Promise<{ rows: PatientRow[]; total: number }> {
  const needle = query?.trim();
  const pattern = needle ? `%${needle.replace(/[\\%_]/g, "\\$&")}%` : null;
  return withTenant(clinicId, async (tx) => {
    const scope = and(
      eq(patients.clinicId, clinicId),
      archived ? isNotNull(patients.deletedAt) : isNull(patients.deletedAt),
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
    // Latest finished visit per listed patient, in one query.
    const visits = rows.length
      ? await tx
          .select({ patientId: appointments.patientId, last: max(appointments.startsAt) })
          .from(appointments)
          .where(and(eq(appointments.clinicId, clinicId), eq(appointments.status, "completed"), inArray(appointments.patientId, rows.map((row) => row.id))))
          .groupBy(appointments.patientId)
      : [];
    const lastVisit = new Map(visits.map((visit) => [visit.patientId, visit.last]));
    return {
      total,
      rows: rows.map((row) => ({
        id: row.id,
        mrn: row.medicalRecordNumber,
        name: fullName(row),
        firstName: row.firstName,
        lastName: row.lastName,
        kind: row.patientKind,
        dateOfBirth: row.dateOfBirth,
        sex: row.sex,
        phone: row.contactPhone,
        philhealth: row.philhealthMemberPin,
        oscaId: row.oscaId,
        pwdId: row.pwdId,
        discountId: row.oscaId ?? row.pwdId,
        lastVisit: lastVisit.get(row.id) ?? null,
        archived: row.deletedAt !== null,
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


/** Offset of `timezone` from UTC at an instant, in ms (positive east of Greenwich). */
function zoneOffsetMs(timezone: string, at: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000) * 60000;
}

/** "2026-10-05T15:00" typed in the clinic's own time → the real instant. */
export function clinicLocalToUtc(local: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new Error("Expected YYYY-MM-DDTHH:mm");
  const [, y, mo, d, h, mi] = match.map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  const firstGuess = wallAsUtc - zoneOffsetMs(timezone, new Date(wallAsUtc));
  return new Date(wallAsUtc - zoneOffsetMs(timezone, new Date(firstGuess)));
}

export type PatientRecord = {
  id: string;
  mrn: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  sex: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  philhealth: string | null;
  oscaId: string | null;
  pwdId: string | null;
  archived: boolean;
};

export const PATIENT_EDITABLE = ["firstName", "lastName", "sex", "dateOfBirth", "phone", "philhealth", "oscaId", "pwdId"] as const;
export type PatientField = (typeof PATIENT_EDITABLE)[number];
export type PatientChanges = Partial<Record<PatientField, string | null>>;

/** One patient by MRN, archived ones only when asked for (to restore them). */
export async function findPatientByMrn(clinicId: string, mrn: string, includeArchived = false): Promise<PatientRecord | null> {
  return withTenant(clinicId, async (tx) => {
    const [row] = await tx
      .select()
      .from(patients)
      .where(and(eq(patients.clinicId, clinicId), eq(patients.medicalRecordNumber, mrn), includeArchived ? undefined : isNull(patients.deletedAt)))
      .limit(1);
    return row
      ? {
          id: row.id, mrn: row.medicalRecordNumber, firstName: row.firstName, lastName: row.lastName, name: fullName(row), sex: row.sex,
          dateOfBirth: row.dateOfBirth, phone: row.contactPhone, philhealth: row.philhealthMemberPin, oscaId: row.oscaId, pwdId: row.pwdId,
          archived: row.deletedAt !== null,
        }
      : null;
  });
}

const COLUMN: Record<PatientField, keyof typeof patients.$inferInsert> = {
  firstName: "firstName", lastName: "lastName", sex: "sex", dateOfBirth: "dateOfBirth", phone: "contactPhone",
  philhealth: "philhealthMemberPin", oscaId: "oscaId", pwdId: "pwdId",
};

export class StaleChangeError extends Error {}

/**
 * Edits fields on one patient. `expectedBefore` is what the person saw when they
 * approved: if the record has changed since, nothing is written. The audit row
 * carries the before/after of exactly the fields touched.
 */
export async function updatePatient(
  clinicId: string,
  actorUserId: string,
  patientId: string,
  changes: PatientChanges,
  expectedBefore?: PatientChanges,
) {
  const fields = Object.keys(changes) as PatientField[];
  if (fields.length === 0) throw new Error("No changes.");
  return withTenant(clinicId, async (tx) => {
    const [current] = await tx
      .select()
      .from(patients)
      .where(and(eq(patients.clinicId, clinicId), eq(patients.id, patientId), isNull(patients.deletedAt)))
      .for("update")
      .limit(1);
    if (!current) throw new NotFoundError("patient");
    const read = (field: PatientField) => (current[COLUMN[field] as keyof typeof current] as string | null) ?? null;
    if (expectedBefore && fields.some((field) => read(field) !== (expectedBefore[field] ?? null))) throw new StaleChangeError();

    const set = Object.fromEntries(fields.map((field) => [COLUMN[field], changes[field] ?? null]));
    await tx.update(patients).set(set).where(and(eq(patients.clinicId, clinicId), eq(patients.id, patientId)));
    await tx.insert(auditLogs).values({
      clinicId, actorUserId, entityType: "patient", entityId: patientId, action: "update",
      diff: { before: Object.fromEntries(fields.map((field) => [field, read(field)])), after: Object.fromEntries(fields.map((field) => [field, changes[field] ?? null])), via: "assistant" },
    });
  });
}

/** Archives (soft-deletes) or restores a patient. Records are never hard-deleted; the audit trail keeps both events. */
export async function setPatientArchived(clinicId: string, actorUserId: string, patientId: string, archived: boolean) {
  return withTenant(clinicId, async (tx) => {
    const rows = await tx
      .update(patients)
      .set({ deletedAt: archived ? new Date() : null })
      .where(and(eq(patients.clinicId, clinicId), eq(patients.id, patientId), archived ? isNull(patients.deletedAt) : sql`${patients.deletedAt} is not null`))
      .returning({ id: patients.id });
    if (rows.length === 0) throw new NotFoundError("patient");
    await tx.insert(auditLogs).values({
      clinicId, actorUserId, entityType: "patient", entityId: patientId, action: archived ? "delete" : "update",
      diff: { after: { archived }, via: "assistant" },
    });
  });
}

const OCCUPYING = ["requested", "confirmed", "checked_in", "in_progress", "completed"];

/** Whether the practitioner is free for [start, end), ignoring one appointment (the one being moved). */
async function assertPractitionerFree(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  clinicId: string,
  practitionerStaffId: string | null,
  start: Date,
  end: Date,
  ignoreId?: string,
) {
  if (!practitionerStaffId) return;
  const [clash] = await tx
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.practitionerStaffId, practitionerStaffId),
        isNull(appointments.deletedAt),
        inArray(appointments.status, OCCUPYING),
        lt(appointments.startsAt, end),
        sql`${appointments.endsAt} > ${start}`,
        ignoreId ? sql`${appointments.id} <> ${ignoreId}` : undefined,
      ),
    )
    .limit(1);
  if (clash) throw new ConflictError();
}

/** A booked (not walk-in) appointment at a clinic-local time, for a service and practitioner. Refuses a double-booked practitioner. */
export async function bookAppointment(
  clinic: Pick<StaffClinic, "id" | "timezone">,
  actorUserId: string,
  input: { patientId: string; startsAt: Date; practitionerStaffId: string | null; serviceId?: string | null },
) {
  if (input.startsAt.getTime() < Date.now() - 5 * 60_000) throw new Error("That time has passed.");
  return withTenant(clinic.id, async (tx) => {
    const [patient] = await tx
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.clinicId, clinic.id), eq(patients.id, input.patientId), isNull(patients.deletedAt)))
      .limit(1);
    if (!patient) throw new NotFoundError("patient");

    let minutes = WALK_IN_MINUTES;
    if (input.serviceId) {
      const [service] = await tx
        .select({ durationMinutes: services.durationMinutes })
        .from(services)
        .where(and(eq(services.clinicId, clinic.id), eq(services.id, input.serviceId), isNull(services.deletedAt)))
        .limit(1);
      if (!service) throw new NotFoundError("service");
      minutes = service.durationMinutes ?? WALK_IN_MINUTES;
    }
    const endsAt = new Date(input.startsAt.getTime() + minutes * 60_000);
    await assertPractitionerFree(tx, clinic.id, input.practitionerStaffId, input.startsAt, endsAt);

    const [row] = await tx
      .insert(appointments)
      .values({
        clinicId: clinic.id, patientId: input.patientId, practitionerStaffId: input.practitionerStaffId, serviceId: input.serviceId ?? null,
        startsAt: input.startsAt, endsAt, status: "confirmed", source: "phone",
      })
      .returning({ id: appointments.id });
    await tx.insert(auditLogs).values({
      clinicId: clinic.id, actorUserId, entityType: "appointment", entityId: row.id, action: "create",
      diff: { after: { status: "confirmed", source: "phone", startsAt: input.startsAt.toISOString(), serviceId: input.serviceId ?? null } },
    });
    return row;
  });
}

/** Moves a booking that hasn't started to a new time (and optionally practitioner), keeping its length. */
export async function rescheduleAppointment(
  clinic: Pick<StaffClinic, "id">,
  actorUserId: string,
  appointmentId: string,
  input: { startsAt: Date; practitionerStaffId?: string | null },
) {
  if (input.startsAt.getTime() < Date.now() - 5 * 60_000) throw new Error("That time has passed.");
  return withTenant(clinic.id, async (tx) => {
    const [current] = await tx
      .select()
      .from(appointments)
      .where(and(eq(appointments.clinicId, clinic.id), eq(appointments.id, appointmentId), isNull(appointments.deletedAt)))
      .for("update")
      .limit(1);
    if (!current) throw new NotFoundError("appointment");
    if (current.status !== "requested" && current.status !== "confirmed") throw new TransitionError(`${current.status} can't be rescheduled`);

    const practitionerStaffId = input.practitionerStaffId === undefined ? current.practitionerStaffId : input.practitionerStaffId;
    const endsAt = new Date(input.startsAt.getTime() + (current.endsAt.getTime() - current.startsAt.getTime()));
    await assertPractitionerFree(tx, clinic.id, practitionerStaffId, input.startsAt, endsAt, appointmentId);
    await tx.update(appointments).set({ startsAt: input.startsAt, endsAt, practitionerStaffId }).where(and(eq(appointments.clinicId, clinic.id), eq(appointments.id, appointmentId)));
    await tx.insert(auditLogs).values({
      clinicId: clinic.id, actorUserId, entityType: "appointment", entityId: appointmentId, action: "update",
      diff: { before: { startsAt: current.startsAt.toISOString(), practitionerStaffId: current.practitionerStaffId }, after: { startsAt: input.startsAt.toISOString(), practitionerStaffId } },
    });
  });
}

/** One appointment of this clinic, for previews. */
export async function findAppointment(clinicId: string, appointmentId: string) {
  return withTenant(clinicId, async (tx) => {
    const [row] = await tx
      .select({ id: appointments.id, status: appointments.status, startsAt: appointments.startsAt, firstName: patients.firstName, lastName: patients.lastName, displayName: patients.displayName })
      .from(appointments)
      .innerJoin(patients, and(eq(patients.clinicId, appointments.clinicId), eq(patients.id, appointments.patientId)))
      .where(and(eq(appointments.clinicId, clinicId), eq(appointments.id, appointmentId), isNull(appointments.deletedAt)))
      .limit(1);
    return row ? { id: row.id, status: row.status as AppointmentStatus, startsAt: row.startsAt, patientName: fullName(row) } : null;
  });
}

export type PatientChart = {
  patient: PatientRecord;
  visits: { id: string; startsAt: Date; status: AppointmentStatus; practitionerName: string | null; source: string }[];
};

/**
 * A patient's chart. Opening one is itself recorded (action "view"), because
 * who looked at a record is part of the audit trail.
 */
export async function openPatientChart(clinicId: string, actorUserId: string, mrn: string, includeArchived = false): Promise<PatientChart | null> {
  const patient = await findPatientByMrn(clinicId, mrn, includeArchived);
  if (!patient) return null;
  return withTenant(clinicId, async (tx) => {
    const visits = await tx
      .select({ id: appointments.id, startsAt: appointments.startsAt, status: appointments.status, source: appointments.source, practitionerName: user.name })
      .from(appointments)
      .leftJoin(clinicStaff, and(eq(clinicStaff.clinicId, appointments.clinicId), eq(clinicStaff.id, appointments.practitionerStaffId)))
      .leftJoin(user, eq(user.id, clinicStaff.userId))
      .where(and(eq(appointments.clinicId, clinicId), eq(appointments.patientId, patient.id), isNull(appointments.deletedAt)))
      .orderBy(desc(appointments.startsAt))
      .limit(50);
    await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "patient", entityId: patient.id, action: "view" });
    return { patient, visits: visits.map((visit) => ({ ...visit, status: visit.status as AppointmentStatus })) };
  });
}

/** The clinic-local calendar day of an instant, as YYYY-MM-DD. */
export function clinicDateString(timezone: string, at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Calendar arithmetic on a YYYY-MM-DD string (no time zones involved). */
export function addDays(date: string, days: number) {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}
