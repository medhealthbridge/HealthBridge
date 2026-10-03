import { z } from "zod";
import { localDateTimeSchema, mrnSchema, newPatientByAssistantSchema, patientChangesSchema } from "@/src/lib/schemas/clinic-assistant";
import {
  clinicLocalToUtc,
  dayBounds,
  findAppointment,
  findPatientByMrn,
  listPatients,
  listPractitioners,
  listTodayAppointments,
  PATIENT_EDITABLE,
  type PatientChanges,
  type PatientRecord,
  type StaffClinic,
} from "@/src/server/services/clinic-app";
import { createClinicPendingAction, riskOf, type ClinicActionKind } from "@/src/server/services/clinic-agent-actions";
import { defineTool, type AgentTool, type Proposal } from "./core";

export type ClinicToolContext = {
  userId: string;
  clinic: StaffClinic;
  /** Filled as tools run, so the route can show a Confirm card for each. */
  proposals: Proposal[];
};

const ageOf = (dateOfBirth: string | null) => (dateOfBirth ? Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)) : null);
// Keep only the last three digits of a phone: enough to tell two people apart, not enough to dial.
const maskPhone = (phone: string | null) => (phone ? `•••${phone.replace(/\D/g, "").slice(-3)}` : null);

function safePatient(p: PatientRecord) {
  return { mrn: p.mrn, name: p.name, sex: p.sex, age: ageOf(p.dateOfBirth), phone: maskPhone(p.phone), hasPhilHealth: Boolean(p.philhealth), hasDiscountId: Boolean(p.oscaId || p.pwdId), archived: p.archived };
}

/** The editable values as strings, for before/after comparison and the preview. */
function snapshot(p: PatientRecord, fields: readonly (typeof PATIENT_EDITABLE)[number][]) {
  const all: Record<(typeof PATIENT_EDITABLE)[number], string | null> = {
    firstName: p.firstName, lastName: p.lastName, sex: p.sex, dateOfBirth: p.dateOfBirth, phone: p.phone, philhealth: p.philhealth, oscaId: p.oscaId, pwdId: p.pwdId,
  };
  return Object.fromEntries(fields.map((field) => [field, all[field]]));
}

const whenSchema = z.string().trim().regex(/^(today|tomorrow|\d{4}-\d{2}-\d{2})$/, "Use today, tomorrow or YYYY-MM-DD.");

function dayInstant(when: string, clinic: StaffClinic) {
  const base = new Date();
  if (when === "today") return base;
  if (when === "tomorrow") return new Date(dayBounds(clinic.timezone, base).end.getTime() + 60_000);
  return clinicLocalToUtc(`${when}T12:00`, clinic.timezone);
}

function readTools(ctx: ClinicToolContext): AgentTool[] {
  const { clinic } = ctx;
  return [
    defineTool({
      name: "get_clinic_overview",
      description: "Today at a glance: appointments by status and how many patient records the clinic has.",
      input: z.object({}),
      run: async () => {
        const [today, patients] = await Promise.all([listTodayAppointments(clinic), listPatients(clinic.id)]);
        const byStatus: Record<string, number> = {};
        for (const item of today) byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
        return { clinic: clinic.name, appointmentsToday: today.length, byStatus, patientRecords: patients.total };
      },
    }),
    defineTool({
      name: "list_appointments",
      description: "Appointments on a day (today, tomorrow or a YYYY-MM-DD date), with patient, time and status. Each has an id usable with propose_change_appointment_status.",
      input: z.object({ when: whenSchema.default("today") }),
      run: async ({ when }) => {
        const rows = await listTodayAppointments(clinic, undefined, dayInstant(when, clinic));
        return rows.map((r) => ({ id: r.id, time: r.startsAt.toISOString(), patient: r.patientName, mrn: r.mrn, status: r.status, practitioner: r.practitionerName, source: r.source }));
      },
    }),
    defineTool({
      name: "search_patients",
      description: "Find patients by name, MRN or mobile. Returns up to 10 with their MRN, which every other patient tool uses.",
      input: z.object({ query: z.string().trim().min(2).max(80) }),
      run: async ({ query }) => {
        const { rows, total } = await listPatients(clinic.id, query);
        return { matched: total, patients: rows.slice(0, 10).map((r) => ({ mrn: r.mrn, name: r.name, sex: r.sex, age: ageOf(r.dateOfBirth), phone: maskPhone(r.phone), hasPhilHealth: Boolean(r.philhealth) })) };
      },
    }),
    defineTool({
      name: "get_patient",
      description: "One patient's record summary by MRN (including archived ones).",
      input: z.object({ mrn: mrnSchema }),
      run: async ({ mrn }) => {
        const patient = await findPatientByMrn(clinic.id, mrn, true);
        return patient ? { found: true, patient: safePatient(patient) } : { found: false };
      },
    }),
  ];
}

/** What the model is told after proposing: the change is not made until the owner confirms. */
function proposed(result: { id: string; summary: string; stepUp: Proposal["stepUp"] }, ctx: ClinicToolContext, phrase?: string) {
  ctx.proposals.push({ ...result, phrase });
  const need = result.stepUp === "password+typed" ? " They will also have to enter their password and type the MRN." : result.stepUp === "unlock" ? " They may be asked for their password." : "";
  return { proposed: true, summary: result.summary, note: `Not applied yet. The owner must press Confirm under your reply.${need} Tell them what you prepared.` };
}

function writeTools(ctx: ClinicToolContext): AgentTool[] {
  const who = { id: ctx.userId, clinic: ctx.clinic };
  const propose = async (kind: ClinicActionKind, args: unknown, summary: string, phrase?: string) => proposed(await createClinicPendingAction(who, kind, args, summary), ctx, phrase);
  const notFound = { proposed: false, note: "No patient with that MRN. Search for them first." };

  return [
    defineTool({
      name: "propose_create_patient",
      description: "Prepare to add a new patient record. Search first to avoid duplicates. Nothing is saved until the owner confirms.",
      input: newPatientByAssistantSchema,
      run: (args) => propose("create_patient", args, `Add patient ${args.firstName} ${args.lastName} (${args.sex}${args.phone ? `, ${args.phone}` : ""}).`),
    }),
    defineTool({
      name: "propose_update_patient",
      description: "Prepare to change fields on a patient (name, sex, birth date, mobile, PhilHealth PIN, senior/PWD ID). Use null to clear an optional field. The owner sees old and new values before confirming.",
      input: z.object({ mrn: mrnSchema, changes: patientChangesSchema }),
      run: async ({ mrn, changes }) => {
        const patient = await findPatientByMrn(ctx.clinic.id, mrn);
        if (!patient) return notFound;
        const fields = Object.keys(changes) as (typeof PATIENT_EDITABLE)[number][];
        const before = snapshot(patient, fields);
        const changed = fields.filter((field) => (changes[field] ?? null) !== before[field]);
        if (changed.length === 0) return { proposed: false, note: "Those values are already what the record has." };
        const lines = changed.map((field) => `${field}: ${before[field] ?? "empty"} → ${changes[field] ?? "empty"}`);
        const onlyChanged = Object.fromEntries(changed.map((field) => [field, changes[field] ?? null])) as PatientChanges;
        return propose("update_patient", { patientId: patient.id, mrn, changes: onlyChanged, before: snapshot(patient, changed) }, `Edit ${patient.name} (${mrn}): ${lines.join("; ")}.`);
      },
    }),
    defineTool({
      name: "propose_archive_patient",
      description: "Prepare to archive (soft-delete) a patient record. Nothing is erased and it can be restored. The owner must enter their password and type the MRN to confirm.",
      input: z.object({ mrn: mrnSchema }),
      run: async ({ mrn }) => {
        const patient = await findPatientByMrn(ctx.clinic.id, mrn);
        if (!patient) return notFound;
        return propose("archive_patient", { patientId: patient.id, mrn }, `Archive ${patient.name} (${mrn}). The record is kept and can be restored.`, mrn);
      },
    }),
    defineTool({
      name: "propose_restore_patient",
      description: "Prepare to restore an archived patient record.",
      input: z.object({ mrn: mrnSchema }),
      run: async ({ mrn }) => {
        const patient = await findPatientByMrn(ctx.clinic.id, mrn, true);
        if (!patient?.archived) return { proposed: false, note: "No archived patient with that MRN." };
        return propose("restore_patient", { patientId: patient.id, mrn }, `Restore ${patient.name} (${mrn}).`);
      },
    }),
    defineTool({
      name: "propose_book_appointment",
      description: "Prepare to book a patient for a time in the clinic's own timezone. Optionally name the practitioner.",
      input: z.object({ mrn: mrnSchema, startsAtLocal: localDateTimeSchema, practitionerName: z.string().trim().max(80).optional() }),
      run: async ({ mrn, startsAtLocal, practitionerName }) => {
        const patient = await findPatientByMrn(ctx.clinic.id, mrn);
        if (!patient) return notFound;
        const startsAt = clinicLocalToUtc(startsAtLocal, ctx.clinic.timezone);
        if (startsAt.getTime() < Date.now()) return { proposed: false, note: "That time has already passed." };
        let practitioner: { staffId: string; name: string } | undefined;
        if (practitionerName) {
          const matches = (await listPractitioners(ctx.clinic.id)).filter((p) => p.name.toLowerCase().includes(practitionerName.toLowerCase()));
          if (matches.length !== 1) return { proposed: false, note: matches.length === 0 ? "No practitioner by that name." : "More than one practitioner matches. Ask which." };
          practitioner = matches[0];
        }
        return propose("book_appointment", { patientId: patient.id, startsAt: startsAt.toISOString(), practitionerStaffId: practitioner?.staffId ?? null }, `Book ${patient.name} on ${startsAtLocal.replace("T", " at ")}${practitioner ? ` with ${practitioner.name}` : ""}.`);
      },
    }),
    defineTool({
      name: "propose_change_appointment_status",
      description: "Prepare to confirm, cancel or mark no-show on an appointment (id from list_appointments). Floor states like checked-in are set by staff, not here.",
      input: z.object({ appointmentId: z.uuid(), to: z.enum(["confirmed", "cancelled", "no_show"]) }),
      run: async ({ appointmentId, to }) => {
        const appointment = await findAppointment(ctx.clinic.id, appointmentId);
        if (!appointment) return { proposed: false, note: "No such appointment at this clinic." };
        return propose("change_appointment_status", { appointmentId, to }, `Mark ${appointment.patientName}'s appointment (${appointment.startsAt.toISOString().slice(0, 16).replace("T", " ")} UTC) as ${to.replace("_", " ")}.`);
      },
    }),
  ];
}

/** Owner-only tool pack for one clinic. Nothing takes a clinic id: the clinic comes from the session. */
export function buildClinicTools(ctx: ClinicToolContext): AgentTool[] {
  return [...readTools(ctx), ...writeTools(ctx)];
}

export { riskOf };
