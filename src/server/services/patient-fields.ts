import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { auditLogs, clinics, clinicStaff, patientFieldDefinitions, patients, user } from "@/src/server/db/schema";
import {
  fieldKey, incompatibleValues, MAX_ACTIVE_FIELDS, suggestionsFor, validateCustomFields,
  type FieldDefinition, type FieldDefinitionInput, type FieldType,
} from "@/src/lib/patient-fields";
import { NotFoundError, type StaffClinic } from "./clinic-app";

export class FieldLimitError extends Error {}
export class FieldNotFoundError extends Error {}
export class FieldPermissionError extends Error {}
export class IncompatibleTypeError extends Error {
  constructor(public count: number) {
    super("incompatible");
  }
}
export class FieldValuesError extends Error {
  constructor(public messages: string[]) {
    super("invalid values");
  }
}

type Actor = Pick<StaffClinic, "id" | "staffId" | "role">;
type Tx = Parameters<Parameters<typeof withTenant>[1]>[0];

/** Owner manages every field; a practitioner manages only the add-ons they created; the front desk manages none. */
export function canManageField(actor: Pick<StaffClinic, "role" | "staffId">, field: Pick<FieldDefinition, "scope" | "createdByStaffId">) {
  if (actor.role === "owner") return true;
  return actor.role === "practitioner" && field.scope === "addon" && field.createdByStaffId === actor.staffId;
}

/** Medical fields are for the doctors: the front desk never sees them. */
export function visibleTo(role: StaffClinic["role"], fields: FieldDefinition[]) {
  return role === "assistant" ? fields.filter((field) => !field.medical) : fields;
}

export async function listFieldDefinitions(clinicId: string): Promise<FieldDefinition[]> {
  return withTenant(clinicId, async (tx) => {
    const rows = await tx
      .select({ field: patientFieldDefinitions, createdByName: user.name })
      .from(patientFieldDefinitions)
      .leftJoin(clinicStaff, and(eq(clinicStaff.clinicId, patientFieldDefinitions.clinicId), eq(clinicStaff.id, patientFieldDefinitions.createdByStaffId)))
      .leftJoin(user, eq(user.id, clinicStaff.userId))
      .where(eq(patientFieldDefinitions.clinicId, clinicId))
      .orderBy(asc(patientFieldDefinitions.sortOrder), asc(patientFieldDefinitions.createdAt));
    return rows.map(({ field, createdByName }) => ({
      id: field.id, key: field.key, label: field.label, type: field.type as FieldType, options: field.options, required: field.required, medical: field.medical,
      section: field.section, sortOrder: field.sortOrder, scope: field.scope as FieldDefinition["scope"], createdByStaffId: field.createdByStaffId,
      createdByName, archived: field.archivedAt !== null,
    }));
  });
}

async function activeCount(tx: Tx, clinicId: string) {
  const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(patientFieldDefinitions).where(and(eq(patientFieldDefinitions.clinicId, clinicId), isNull(patientFieldDefinitions.archivedAt)));
  return total;
}

async function insertField(tx: Tx, clinic: Actor, actorUserId: string, input: FieldDefinitionInput, scope: "standard" | "addon") {
  if ((await activeCount(tx, clinic.id)) >= MAX_ACTIVE_FIELDS) throw new FieldLimitError();
  const taken = new Set((await tx.select({ key: patientFieldDefinitions.key }).from(patientFieldDefinitions).where(eq(patientFieldDefinitions.clinicId, clinic.id))).map((row) => row.key));
  const base = fieldKey(input.label);
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}_${n}`;
  const [{ next }] = await tx.select({ next: sql<number>`coalesce(max(${patientFieldDefinitions.sortOrder}), 0)::int + 1` }).from(patientFieldDefinitions).where(eq(patientFieldDefinitions.clinicId, clinic.id));
  const [row] = await tx
    .insert(patientFieldDefinitions)
    .values({ clinicId: clinic.id, key, ...input, options: input.type === "select" || input.type === "multi_select" ? input.options : [], sortOrder: next, scope, createdByStaffId: clinic.staffId })
    .returning({ id: patientFieldDefinitions.id });
  await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "patient_field", entityId: row.id, action: "create", diff: { after: { key, label: input.label, type: input.type, medical: input.medical, scope } } });
  return { id: row.id, key };
}

/** The owner adds a standard field; a practitioner can only add an add-on. */
export async function createFieldDefinition(clinic: Actor, actorUserId: string, input: FieldDefinitionInput) {
  if (clinic.role === "assistant") throw new FieldPermissionError();
  return withTenant(clinic.id, (tx) => insertField(tx, clinic, actorUserId, input, clinic.role === "owner" ? "standard" : "addon"));
}

async function loadForChange(tx: Tx, clinic: Actor, fieldId: string) {
  const [field] = await tx.select().from(patientFieldDefinitions).where(and(eq(patientFieldDefinitions.clinicId, clinic.id), eq(patientFieldDefinitions.id, fieldId))).for("update").limit(1);
  if (!field) throw new FieldNotFoundError();
  if (!canManageField(clinic, { scope: field.scope as FieldDefinition["scope"], createdByStaffId: field.createdByStaffId })) throw new FieldPermissionError();
  return field;
}

/** Every stored value for one field across the clinic's patients (archived patients included: their data counts too). */
async function storedValues(tx: Tx, clinicId: string, key: string) {
  const rows = await tx
    .select({ value: sql<unknown>`${patients.customFields} -> ${key}` })
    .from(patients)
    .where(and(eq(patients.clinicId, clinicId), sql`${patients.customFields} ? ${key}`));
  return rows.map((row) => row.value).filter((value) => value !== null);
}

/**
 * Edits a field. The key never changes, so a rename keeps every value. A type
 * change is refused if any stored value wouldn't fit the new type. Removing a
 * choice is allowed: patients who had it keep it (shown as a retired choice).
 */
export async function updateFieldDefinition(clinic: Actor, actorUserId: string, fieldId: string, input: FieldDefinitionInput) {
  await withTenant(clinic.id, async (tx) => {
    const field = await loadForChange(tx, clinic, fieldId);
    if (input.type !== field.type) {
      const bad = incompatibleValues(await storedValues(tx, clinic.id, field.key), { type: input.type, options: input.options, label: input.label });
      if (bad > 0) throw new IncompatibleTypeError(bad);
    }
    const options = input.type === "select" || input.type === "multi_select" ? input.options : [];
    await tx.update(patientFieldDefinitions).set({ ...input, options }).where(eq(patientFieldDefinitions.id, fieldId));
    await tx.insert(auditLogs).values({
      clinicId: clinic.id, actorUserId, entityType: "patient_field", entityId: fieldId, action: "update",
      diff: { before: { label: field.label, type: field.type, options: field.options, required: field.required, medical: field.medical, section: field.section }, after: { ...input, options } },
    });
  });
}

/** Soft delete only: retiring hides the field from forms; every patient's value stays and returns on restore. */
export async function setFieldArchived(clinic: Actor, actorUserId: string, fieldId: string, archived: boolean) {
  await withTenant(clinic.id, async (tx) => {
    const field = await loadForChange(tx, clinic, fieldId);
    if (!archived && field.archivedAt && (await activeCount(tx, clinic.id)) >= MAX_ACTIVE_FIELDS) throw new FieldLimitError();
    const affected = (await storedValues(tx, clinic.id, field.key)).length;
    await tx.update(patientFieldDefinitions).set({ archivedAt: archived ? new Date() : null }).where(eq(patientFieldDefinitions.id, fieldId));
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "patient_field", entityId: fieldId, action: archived ? "delete" : "update", diff: { after: { archived, label: field.label, patientsWithValues: affected } } });
  });
}

/** Moves a field one place up or down in the form. */
export async function moveField(clinic: Actor, actorUserId: string, fieldId: string, direction: "up" | "down") {
  await withTenant(clinic.id, async (tx) => {
    await loadForChange(tx, clinic, fieldId);
    const all = await tx.select({ id: patientFieldDefinitions.id, sortOrder: patientFieldDefinitions.sortOrder }).from(patientFieldDefinitions).where(and(eq(patientFieldDefinitions.clinicId, clinic.id), isNull(patientFieldDefinitions.archivedAt))).orderBy(asc(patientFieldDefinitions.sortOrder), asc(patientFieldDefinitions.createdAt));
    const index = all.findIndex((row) => row.id === fieldId);
    const other = all[direction === "up" ? index - 1 : index + 1];
    if (index < 0 || !other) return;
    // Renumber so equal sort orders (from copies) can't make a swap a no-op.
    const order = all.map((row) => row.id);
    [order[index], order[direction === "up" ? index - 1 : index + 1]] = [order[direction === "up" ? index - 1 : index + 1], order[index]];
    for (const [position, id] of order.entries()) await tx.update(patientFieldDefinitions).set({ sortOrder: position + 1 }).where(eq(patientFieldDefinitions.id, id));
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "patient_field", entityId: fieldId, action: "update", diff: { moved: direction } });
  });
}

/** Owner adds suggested fields by label. A field with the same key (active or retired) is skipped, never duplicated. */
export async function addSuggestedFields(clinic: Actor, actorUserId: string, specialty: string, labels: string[]) {
  if (clinic.role !== "owner") throw new FieldPermissionError();
  const wanted = suggestionsFor(specialty).filter((suggestion) => labels.includes(suggestion.label));
  return withTenant(clinic.id, async (tx) => {
    const taken = new Set((await tx.select({ key: patientFieldDefinitions.key }).from(patientFieldDefinitions).where(eq(patientFieldDefinitions.clinicId, clinic.id))).map((row) => row.key));
    let added = 0;
    for (const suggestion of wanted) {
      if (taken.has(fieldKey(suggestion.label))) continue;
      await insertField(tx, clinic, actorUserId, { ...suggestion, options: suggestion.options ?? [] }, "standard");
      added++;
    }
    return added;
  });
}

/**
 * Copies another branch's active standard fields into this one, as a template.
 * Fields this branch already has (same key) are left alone. The caller must have
 * checked the person owns the source branch.
 */
export async function copyFieldsFromClinic(clinic: Actor, actorUserId: string, sourceClinicId: string) {
  if (clinic.role !== "owner") throw new FieldPermissionError();
  const source = (await listFieldDefinitions(sourceClinicId)).filter((field) => !field.archived && field.scope === "standard");
  return withTenant(clinic.id, async (tx) => {
    const taken = new Set((await tx.select({ key: patientFieldDefinitions.key }).from(patientFieldDefinitions).where(eq(patientFieldDefinitions.clinicId, clinic.id))).map((row) => row.key));
    let added = 0;
    for (const field of source) {
      if (taken.has(field.key)) continue;
      await insertField(tx, clinic, actorUserId, { label: field.label, type: field.type, options: field.options, required: field.required, medical: field.medical, section: field.section }, "standard");
      added++;
    }
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "patient_field", entityId: clinic.id, action: "create", diff: { copiedFrom: sourceClinicId, added } });
    return added;
  });
}

export async function getPatientCustomFields(clinicId: string, patientId: string): Promise<Record<string, unknown>> {
  return withTenant(clinicId, async (tx) => {
    const [row] = await tx.select({ values: patients.customFields }).from(patients).where(and(eq(patients.clinicId, clinicId), eq(patients.id, patientId))).limit(1);
    return row?.values ?? {};
  });
}

/**
 * Saves the fields this person may edit. Values of fields they can't see
 * (medical, for the front desk) and of retired fields are kept untouched.
 * Required fields must be filled. The audit row lists which fields changed, not their values.
 */
export async function savePatientCustomFields(clinic: Actor, actorUserId: string, patientId: string, raw: Record<string, unknown>) {
  const editable = visibleTo(clinic.role, (await listFieldDefinitions(clinic.id)).filter((field) => !field.archived));
  const { values: next, errors } = validateCustomFields(editable, raw);
  if (errors.length) throw new FieldValuesError(errors);

  await withTenant(clinic.id, async (tx) => {
    const [current] = await tx.select({ values: patients.customFields }).from(patients).where(and(eq(patients.clinicId, clinic.id), eq(patients.id, patientId), isNull(patients.deletedAt))).for("update").limit(1);
    if (!current) throw new NotFoundError("patient");
    const merged = { ...current.values };
    const changed: string[] = [];
    for (const [key, value] of Object.entries(next)) {
      if (JSON.stringify(merged[key] ?? null) === JSON.stringify(value)) continue;
      changed.push(key);
      if (value === null) delete merged[key];
      else merged[key] = value;
    }
    if (changed.length === 0) return;
    await tx.update(patients).set({ customFields: merged }).where(and(eq(patients.clinicId, clinic.id), eq(patients.id, patientId)));
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "patient", entityId: patientId, action: "update", diff: { customFieldsChanged: changed } });
  });
}

export async function clinicSpecialty(clinicId: string) {
  return withTenant(clinicId, async (tx) => {
    const [row] = await tx.select({ specialty: clinics.specialty }).from(clinics).where(eq(clinics.id, clinicId)).limit(1);
    return row?.specialty ?? "general";
  });
}

/** What a chart shows: the fields this role may see, plus the patient's values for them (and nothing else). */
export async function patientFieldsForChart(clinic: Pick<StaffClinic, "id" | "role">, patientId: string) {
  const [fields, stored] = await Promise.all([listFieldDefinitions(clinic.id), getPatientCustomFields(clinic.id, patientId)]);
  const visible = visibleTo(clinic.role, fields);
  const values = Object.fromEntries(visible.filter((field) => field.key in stored).map((field) => [field.key, stored[field.key]]));
  return { fields: visible, values, canEdit: true };
}
