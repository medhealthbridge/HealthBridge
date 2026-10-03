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
import { createClinicPendingAction, type ClinicActionKind } from "@/src/server/services/clinic-agent-actions";
import { listServices, type ServiceRow } from "@/src/server/services/price-list";
import { serviceInputSchema } from "@/src/lib/schemas/service";
import { claimInputSchema } from "@/src/lib/schemas/claim";
import { formatPesoExact } from "@/src/lib/utils";
import { listInventory, type InventoryRow } from "@/src/server/services/inventory";
import { listInvoices } from "@/src/server/services/billing";
import { listClaims, summarizeClaims } from "@/src/server/services/claims";
import { listActivity } from "@/src/server/services/activity";
import { getOverview } from "@/src/server/services/overview";
import { clinicDateString } from "@/src/server/services/clinic-app";
import { CLAIM_STATUSES, PAYOR_TYPES } from "@/src/lib/schemas/claim";
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
      name: "get_money_today",
      description: "Revenue today against the same day last week, collections by payment method over 30 days, and stock alerts. Read-only.",
      input: z.object({}),
      run: async () => {
        const o = await getOverview(clinic);
        return { revenueToday: o.kpis[0].value, vsLastWeek: o.kpis[0].delta, receiptsToday: o.kpis[3].value, collections30Days: o.collections.map((c) => ({ method: c.name, amount: c.value, percent: c.pct })), stockAlerts: o.lowStock.length };
      },
    }),
    defineTool({
      name: "list_receipts",
      description: "The 15 most recent official receipts: number, patient, total, how paid, status. Read-only; voiding a receipt is done by the owner on the Billing page, not here.",
      input: z.object({}),
      run: async () => (await listInvoices(clinic.id, { limit: 15 })).map((r) => ({ receipt: r.invoiceNumber, patient: r.patientName, mrn: r.patientMrn, totalPesos: r.totalCents / 100, paidBy: r.method, status: r.status, date: r.issuedAt?.toISOString().slice(0, 10) ?? null })),
    }),
    defineTool({
      name: "list_inventory",
      description: "Inventory items with stock on hand, reorder level, next expiry and status (ok, low, out, expiring). Use attention=true for only the ones needing action.",
      input: z.object({ attention: z.boolean().default(false) }),
      run: async ({ attention }) => {
        const rows = await listInventory(clinic.id, clinicDateString(clinic.timezone));
        return rows.filter((r) => !attention || r.status !== "ok" || r.expiredQty > 0).map((r) => ({ name: r.name, sku: r.sku, unit: r.unit, onHand: r.onHand, reorderAt: r.reorderThreshold, nextExpiry: r.nextExpiry, expiredQty: r.expiredQty, status: r.status }));
      },
    }),
    defineTool({
      name: "list_claims",
      description: "PhilHealth and HMO claims with id, patient, payor, amount, status and age in days, plus the outstanding total.",
      input: z.object({ status: z.enum(CLAIM_STATUSES).optional() }),
      run: async ({ status }) => {
        const rows = await listClaims(clinic.id);
        const summary = summarizeClaims(rows);
        return { outstandingPesos: summary.outstandingCents / 100, openClaims: summary.openCount, overSixtyDaysPesos: summary.overSixtyCents / 100, claims: rows.filter((r) => !status || r.status === status).slice(0, 30).map((r) => ({ id: r.id, patient: r.patientName, mrn: r.patientMrn, payor: r.payorName, amountPesos: r.claimAmountCents / 100, status: r.status, ageDays: r.ageDays })) };
      },
    }),
    defineTool({
      name: "recent_activity",
      description: "The latest 15 entries of the clinic's activity log (who did what). Read-only.",
      input: z.object({}),
      run: async () => (await listActivity(clinic.id, clinic.timezone, { limit: 15 })).map((e) => ({ what: e.meta, by: e.by.split(" · ")[0], when: e.when })),
    }),
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
      name: "list_services",
      description: "The clinic's price list: each service with category, duration, price in pesos and whether it is VAT-exempt. Use archived: true to see retired services.",
      input: z.object({ archived: z.boolean().default(false) }),
      run: async ({ archived }) => (await listServices(clinic.id, { archived })).map((s) => ({ name: s.name, category: s.category, minutes: s.durationMinutes, pricePesos: s.priceCentavos / 100, vatExempt: s.vatExempt, code: s.code })),
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

  const findServiceByName = async (name: string, archived = false): Promise<{ service: ServiceRow } | { problem: string }> => {
    const needle = name.trim().toLowerCase();
    const rows = await listServices(ctx.clinic.id, { archived });
    const exact = rows.filter((row) => row.name.toLowerCase() === needle);
    const found = exact.length > 0 ? exact : rows.filter((row) => row.name.toLowerCase().includes(needle));
    if (found.length === 0) return { problem: `No ${archived ? "archived " : ""}service matches "${name}".` };
    if (found.length > 1) return { problem: `More than one service matches: ${found.slice(0, 8).map((row) => row.name).join(", ")}. Ask which one.` };
    return { service: found[0] };
  };
  const findItem = async (name: string): Promise<{ item: InventoryRow } | { problem: string }> => {
    const needle = name.trim().toLowerCase();
    const rows = await listInventory(ctx.clinic.id, clinicDateString(ctx.clinic.timezone));
    const exact = rows.filter((row) => row.name.toLowerCase() === needle);
    const found = exact.length > 0 ? exact : rows.filter((row) => row.name.toLowerCase().includes(needle));
    if (found.length === 0) return { problem: `No inventory item matches "${name}". Offer to add it with propose_create_item.` };
    if (found.length > 1) return { problem: `More than one item matches: ${found.slice(0, 8).map((row) => row.name).join(", ")}. Ask which one.` };
    return { item: found[0] };
  };
  const peso = (centavos: number) => formatPesoExact(centavos / 100);
  const describe = (key: string, value: unknown) =>
    key === "priceCentavos" ? peso(Number(value)) : key === "durationMinutes" ? (value ? `${value} min` : "none") : key === "vatExempt" ? (value ? "VAT-exempt" : "VATable") : String(value ?? "empty");

  return [
    defineTool({
      name: "propose_create_item",
      description: "Prepare to add an inventory item (name, optional SKU, unit like box, reorder level). Check list_inventory first to avoid duplicates.",
      input: z.object({ name: z.string().trim().min(2).max(120), sku: z.string().trim().max(40).optional(), unit: z.string().trim().min(1).max(20).default("unit"), reorderThreshold: z.number().int().min(0).max(100_000).default(0) }),
      run: (args) => propose("create_item", { name: args.name, sku: args.sku ?? "", unit: args.unit, reorderThreshold: args.reorderThreshold }, `Add inventory item ${args.name} (${args.unit}, reorder at ${args.reorderThreshold}).`),
    }),
    defineTool({
      name: "propose_receive_stock",
      description: "Prepare to record a delivery of an existing inventory item as a new lot, with optional lot number and expiry (YYYY-MM-DD).",
      input: z.object({ itemName: z.string().trim().min(2).max(120), quantity: z.number().int().min(1).max(100_000), lotNumber: z.string().trim().max(40).optional(), expiresOn: z.iso.date().optional() }),
      run: async ({ itemName, quantity, lotNumber, expiresOn }) => {
        const picked = await findItem(itemName);
        if ("problem" in picked) return { proposed: false, note: picked.problem };
        return propose("receive_stock", { itemId: picked.item.id, name: picked.item.name, quantity, lotNumber: lotNumber ?? null, expiresOn: expiresOn ?? null }, `Receive ${quantity} ${picked.item.unit} of ${picked.item.name}${expiresOn ? `, expiring ${expiresOn}` : ""}.`);
      },
    }),
    defineTool({
      name: "propose_record_stock_use",
      description: "Prepare to record stock used (takes the earliest-expiring lot first). Refused if there is not enough in date.",
      input: z.object({ itemName: z.string().trim().min(2).max(120), quantity: z.number().int().min(1).max(100_000), reason: z.string().trim().max(120).optional() }),
      run: async ({ itemName, quantity, reason }) => {
        const picked = await findItem(itemName);
        if ("problem" in picked) return { proposed: false, note: picked.problem };
        if (picked.item.onHand < quantity) return { proposed: false, note: `Only ${picked.item.onHand} ${picked.item.unit} of ${picked.item.name} in date.` };
        return propose("use_stock", { itemId: picked.item.id, name: picked.item.name, quantity, reason: reason ?? null }, `Record ${quantity} ${picked.item.unit} of ${picked.item.name} used (${picked.item.onHand} on hand now).`);
      },
    }),
    defineTool({
      name: "propose_file_claim",
      description: "Prepare to file a PhilHealth or HMO claim for a patient (MRN), with payor name, amount in pesos and optional LOA, member number or receipt number.",
      input: z.object({ mrn: mrnSchema, payorType: z.enum(PAYOR_TYPES), payorName: z.string().trim().min(2).max(80), amountPesos: z.number().min(1).max(10_000_000), loaNumber: z.string().trim().max(40).optional(), memberOrPolicyNumber: z.string().trim().max(40).optional(), receiptNumber: z.string().trim().max(20).optional() }),
      run: async (args) => {
        const patient = await findPatientByMrn(ctx.clinic.id, args.mrn);
        if (!patient) return notFound;
        const input = claimInputSchema.parse({ patientId: patient.id, payorType: args.payorType, payorName: args.payorName, claimAmountCents: args.amountPesos, loaNumber: args.loaNumber ?? "", memberOrPolicyNumber: args.memberOrPolicyNumber ?? "", receiptNumber: args.receiptNumber ?? "", notes: "" });
        return propose("file_claim", { ...input, patientName: patient.name }, `File a ${args.payorType === "philhealth" ? "PhilHealth" : "HMO"} claim with ${args.payorName} for ${patient.name} (${args.mrn}): ${peso(input.claimAmountCents)}.`);
      },
    }),
    defineTool({
      name: "propose_set_claim_status",
      description: "Prepare to move a claim (id from list_claims) to filed, pending, approved, denied, resubmitted or paid. Withdrawing a claim is done on the Claims page, not here.",
      input: z.object({ claimId: z.uuid(), to: z.enum(CLAIM_STATUSES).exclude(["withdrawn"]) }),
      run: async ({ claimId, to }) => {
        const claim = (await listClaims(ctx.clinic.id)).find((row) => row.id === claimId);
        if (!claim) return { proposed: false, note: "No such claim at this clinic." };
        if (claim.status === "paid" || claim.status === "withdrawn") return { proposed: false, note: `That claim is already ${claim.status}.` };
        const label = `${claim.patientName}'s ${claim.payorName} claim`;
        return propose("set_claim_status", { claimId, label, to }, `Mark ${label} (${peso(claim.claimAmountCents)}) as ${to}.`);
      },
    }),
    defineTool({
      name: "propose_create_service",
      description: "Prepare to add a service to the price list. pricePesos is the price in pesos. Check list_services first to avoid duplicates.",
      input: z.object({
        name: z.string().trim().min(2).max(120),
        pricePesos: z.number().min(0).max(1_000_000),
        category: z.string().trim().max(40).optional(),
        durationMinutes: z.number().int().min(5).max(600).optional(),
        vatExempt: z.boolean().default(false),
        code: z.string().trim().max(20).optional(),
      }),
      run: async (args) => {
        const service = serviceInputSchema.parse({ name: args.name, priceCentavos: args.pricePesos, category: args.category ?? "", durationMinutes: args.durationMinutes, vatExempt: args.vatExempt, code: args.code ?? "" });
        return propose("create_service", service, `Add ${service.name} at ${peso(service.priceCentavos)}${service.durationMinutes ? `, ${service.durationMinutes} min` : ""}${service.vatExempt ? ", VAT-exempt" : ""}.`);
      },
    }),
    defineTool({
      name: "propose_update_service",
      description: "Prepare to change a service's price (in pesos), name, category, duration, code or VAT status. The owner sees old and new values before confirming.",
      input: z.object({
        serviceName: z.string().trim().min(2).max(120),
        changes: z
          .object({ name: z.string().trim().min(2).max(120), pricePesos: z.number().min(0).max(1_000_000), category: z.string().trim().max(40), durationMinutes: z.number().int().min(5).max(600), vatExempt: z.boolean(), code: z.string().trim().max(20) })
          .partial(),
      }),
      run: async ({ serviceName, changes }) => {
        const picked = await findServiceByName(serviceName);
        if ("problem" in picked) return { proposed: false, note: picked.problem };
        const { pricePesos, ...rest } = changes;
        const wanted: Record<string, unknown> = { ...rest, ...(pricePesos !== undefined && { priceCentavos: Math.round(pricePesos * 100) }) };
        const current = picked.service as unknown as Record<string, unknown>;
        const changed = Object.keys(wanted).filter((key) => wanted[key] !== current[key]);
        if (changed.length === 0) return { proposed: false, note: "Those values are already what the price list has." };
        const lines = changed.map((key) => `${key === "priceCentavos" ? "price" : key}: ${describe(key, current[key])} → ${describe(key, wanted[key])}`);
        return propose(
          "update_service",
          { serviceId: picked.service.id, name: picked.service.name, changes: Object.fromEntries(changed.map((key) => [key, wanted[key]])), before: Object.fromEntries(changed.map((key) => [key, current[key]])) },
          `Edit ${picked.service.name}: ${lines.join("; ")}.`,
        );
      },
    }),
    defineTool({
      name: "propose_archive_service",
      description: "Prepare to archive a service (stops new bookings and checkouts; past invoices keep it; can be restored). The owner must enter their password and type the service name.",
      input: z.object({ serviceName: z.string().trim().min(2).max(120) }),
      run: async ({ serviceName }) => {
        const picked = await findServiceByName(serviceName);
        if ("problem" in picked) return { proposed: false, note: picked.problem };
        return propose("archive_service", { serviceId: picked.service.id, phrase: picked.service.name }, `Archive ${picked.service.name} (${peso(picked.service.priceCentavos)}). It can be restored.`, picked.service.name);
      },
    }),
    defineTool({
      name: "propose_restore_service",
      description: "Prepare to restore an archived service.",
      input: z.object({ serviceName: z.string().trim().min(2).max(120) }),
      run: async ({ serviceName }) => {
        const picked = await findServiceByName(serviceName, true);
        if ("problem" in picked) return { proposed: false, note: picked.problem };
        return propose("restore_service", { serviceId: picked.service.id, name: picked.service.name }, `Restore ${picked.service.name}.`);
      },
    }),
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
      input: z.object({ mrn: mrnSchema, startsAtLocal: localDateTimeSchema, practitionerName: z.string().trim().max(80).optional(), serviceName: z.string().trim().max(120).optional() }),
      run: async ({ mrn, startsAtLocal, practitionerName, serviceName }) => {
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
        let service: ServiceRow | undefined;
        if (serviceName) {
          const picked = await findServiceByName(serviceName);
          if ("problem" in picked) return { proposed: false, note: picked.problem };
          service = picked.service;
        }
        return propose("book_appointment", { patientId: patient.id, startsAt: startsAt.toISOString(), practitionerStaffId: practitioner?.staffId ?? null, serviceId: service?.id ?? null }, `Book ${patient.name} on ${startsAtLocal.replace("T", " at ")}${service ? ` for ${service.name}` : ""}${practitioner ? ` with ${practitioner.name}` : ""}.`);
      },
    }),
    defineTool({
      name: "propose_reschedule_appointment",
      description: "Prepare to move a booked appointment (id from list_appointments) to a new clinic-local time. Refused if the practitioner is busy then.",
      input: z.object({ appointmentId: z.uuid(), startsAtLocal: localDateTimeSchema }),
      run: async ({ appointmentId, startsAtLocal }) => {
        const appointment = await findAppointment(ctx.clinic.id, appointmentId);
        if (!appointment) return { proposed: false, note: "No such appointment at this clinic." };
        if (appointment.status !== "requested" && appointment.status !== "confirmed") return { proposed: false, note: "Only booked appointments that haven't started can be moved." };
        const startsAt = clinicLocalToUtc(startsAtLocal, ctx.clinic.timezone);
        if (startsAt.getTime() < Date.now()) return { proposed: false, note: "That time has already passed." };
        return propose("reschedule_appointment", { appointmentId, startsAt: startsAt.toISOString() }, `Move ${appointment.patientName}'s appointment to ${startsAtLocal.replace("T", " at ")}.`);
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

