import { relations } from "drizzle-orm";
import { user } from "./auth";
import { accounts, clinics, subscriptions, domainLookups } from "./tenancy";
import { clinicStaff, staffInvites, platformAdmins } from "./staff";
import { patients, patientAttachments, clinicalNotes, recalls } from "./patients";
import { appointments } from "./appointments";
import { invoices, invoiceLineItems, payments, hmoClaims } from "./billing";
import { inventoryItems, inventoryBatches, inventoryTransfers } from "./inventory";
import { auditLogs } from "./audit";

export const userRelations = relations(user, ({ many, one }) => ({
  ownedAccount: one(accounts, { fields: [user.id], references: [accounts.ownerUserId] }),
  clinicMemberships: many(clinicStaff),
  patientProfile: one(patients, { fields: [user.id], references: [patients.portalUserId] }),
  platformAdmin: one(platformAdmins, { fields: [user.id], references: [platformAdmins.userId] }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  owner: one(user, { fields: [accounts.ownerUserId], references: [user.id] }),
  clinics: many(clinics),
  subscription: one(subscriptions, { fields: [accounts.id], references: [subscriptions.accountId] }),
  inventoryTransfers: many(inventoryTransfers),
}));

export const clinicsRelations = relations(clinics, ({ one, many }) => ({
  account: one(accounts, { fields: [clinics.accountId], references: [accounts.id] }),
  domainLookups: many(domainLookups),
  staff: many(clinicStaff),
  staffInvites: many(staffInvites),
  patients: many(patients),
  appointments: many(appointments),
  invoices: many(invoices),
  inventoryItems: many(inventoryItems),
  auditLogs: many(auditLogs),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  account: one(accounts, { fields: [subscriptions.accountId], references: [accounts.id] }),
}));

export const domainLookupsRelations = relations(domainLookups, ({ one }) => ({
  clinic: one(clinics, { fields: [domainLookups.clinicId], references: [clinics.id] }),
}));

export const clinicStaffRelations = relations(clinicStaff, ({ one, many }) => ({
  clinic: one(clinics, { fields: [clinicStaff.clinicId], references: [clinics.id] }),
  user: one(user, { fields: [clinicStaff.userId], references: [user.id] }),
  appointmentsAsPractitioner: many(appointments),
}));

export const staffInvitesRelations = relations(staffInvites, ({ one }) => ({
  clinic: one(clinics, { fields: [staffInvites.clinicId], references: [clinics.id] }),
  invitedBy: one(clinicStaff, { fields: [staffInvites.invitedByStaffId], references: [clinicStaff.id] }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  clinic: one(clinics, { fields: [patients.clinicId], references: [clinics.id] }),
  portalUser: one(user, { fields: [patients.portalUserId], references: [user.id] }),
  attachments: many(patientAttachments),
  clinicalNotes: many(clinicalNotes),
  recalls: many(recalls),
  appointments: many(appointments),
  invoices: many(invoices),
  hmoClaims: many(hmoClaims),
}));

export const patientAttachmentsRelations = relations(patientAttachments, ({ one }) => ({
  patient: one(patients, { fields: [patientAttachments.patientId], references: [patients.id] }),
  uploadedBy: one(clinicStaff, { fields: [patientAttachments.uploadedByStaffId], references: [clinicStaff.id] }),
}));

export const clinicalNotesRelations = relations(clinicalNotes, ({ one }) => ({
  patient: one(patients, { fields: [clinicalNotes.patientId], references: [patients.id] }),
  appointment: one(appointments, { fields: [clinicalNotes.appointmentId], references: [appointments.id] }),
  author: one(clinicStaff, { fields: [clinicalNotes.authorStaffId], references: [clinicStaff.id] }),
}));

export const recallsRelations = relations(recalls, ({ one }) => ({
  patient: one(patients, { fields: [recalls.patientId], references: [patients.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  clinic: one(clinics, { fields: [appointments.clinicId], references: [clinics.id] }),
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  practitioner: one(clinicStaff, { fields: [appointments.practitionerStaffId], references: [clinicStaff.id] }),
  clinicalNotes: many(clinicalNotes),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  clinic: one(clinics, { fields: [invoices.clinicId], references: [clinics.id] }),
  patient: one(patients, { fields: [invoices.patientId], references: [patients.id] }),
  appointment: one(appointments, { fields: [invoices.appointmentId], references: [appointments.id] }),
  lineItems: many(invoiceLineItems),
  payments: many(payments),
  hmoClaims: many(hmoClaims),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceLineItems.invoiceId], references: [invoices.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));

export const hmoClaimsRelations = relations(hmoClaims, ({ one }) => ({
  patient: one(patients, { fields: [hmoClaims.patientId], references: [patients.id] }),
  invoice: one(invoices, { fields: [hmoClaims.invoiceId], references: [invoices.id] }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  clinic: one(clinics, { fields: [inventoryItems.clinicId], references: [clinics.id] }),
  batches: many(inventoryBatches),
}));

export const inventoryBatchesRelations = relations(inventoryBatches, ({ one }) => ({
  item: one(inventoryItems, { fields: [inventoryBatches.itemId], references: [inventoryItems.id] }),
}));

export const inventoryTransfersRelations = relations(inventoryTransfers, ({ one }) => ({
  account: one(accounts, { fields: [inventoryTransfers.accountId], references: [accounts.id] }),
  fromClinic: one(clinics, { fields: [inventoryTransfers.fromClinicId], references: [clinics.id] }),
  toClinic: one(clinics, { fields: [inventoryTransfers.toClinicId], references: [clinics.id] }),
  item: one(inventoryItems, { fields: [inventoryTransfers.itemId], references: [inventoryItems.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  clinic: one(clinics, { fields: [auditLogs.clinicId], references: [clinics.id] }),
  actor: one(user, { fields: [auditLogs.actorUserId], references: [user.id] }),
}));
