"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BOOKABLE_DATES,
  BRANCHES,
  CARTS,
  DEFAULT_SENIOR_ID,
  HQ_PORTAL_NAME,
  HQ_PORTAL_URL,
  INITIAL_PENDING,
  PATIENTS,
  PATIENT_NAME_BY_BRANCH,
  POS_OR_SERIES,
  SERVICES,
  type PaymentMethod,
} from "@/src/lib/mock-data/clinix-app";
import type {
  AppRole,
  BranchKey,
  CartItem,
  Patient,
  PatientDraft,
  PendingAppointment,
  PortalKey,
  Service,
} from "@/src/types/clinix-app";
import { tabsFor, type AppTab } from "../_data";
import { ArchivePatientDialog } from "./archive-patient-dialog";
import { BottomNav } from "./bottom-nav";
import { ClinicSwitcherSheet } from "./clinic-switcher-sheet";
import { PatientFormSheet } from "./patient-form-sheet";
import { PhoneTopbar } from "./phone-topbar";
import { PosAddServiceSheet } from "./pos-add-service-sheet";
import { RoleSwitcher } from "./role-switcher";
import { ToastBanner } from "./toast-banner";
import { BookPickStep } from "./screens/book-pick-step";
import { BookReviewStep } from "./screens/book-review-step";
import { BookTicketStep } from "./screens/book-ticket-step";
import { BranchHomeScreen } from "./screens/branch-home-screen";
import { EarningsScreen } from "./screens/earnings-screen";
import { HqHomeScreen } from "./screens/hq-home-screen";
import { PatientDetailScreen } from "./screens/patient-detail-screen";
import { PatientMeScreen } from "./screens/patient-me-screen";
import { PatientsScreen } from "./screens/patients-screen";
import { PosScreen } from "./screens/pos-screen";
import { PractitionerMeScreen } from "./screens/practitioner-me-screen";
import { QueueScreen } from "./screens/queue-screen";
import { RecordsScreen } from "./screens/records-screen";
import { ReportsScreen } from "./screens/reports-screen";
import { ScheduleScreen } from "./screens/schedule-screen";
import { VisitsScreen } from "./screens/visits-screen";

const TOAST_MS = 2600;
const DEFAULT_PATIENT_BRANCH: BranchKey = "qc-eye";
const DEFAULT_STAFF_BRANCH: BranchKey = "bgc-dental";

type Booking = { serviceIndex: number; dateIndex: number; slot: string; step: 1 | 2 | 3; placed: boolean; confirmed: boolean };

const INITIAL_BOOKING: Booking = { serviceIndex: 0, dateIndex: 1, slot: "9:40 AM", step: 1, placed: false, confirmed: false };

/** Portal the role lands on: only the owner has an HQ view above the branches. */
function homePortal(role: AppRole, current: PortalKey): PortalKey {
  if (role === "owner") return current;
  if (role === "patient") return current === "hq" ? DEFAULT_PATIENT_BRANCH : current;
  return current === "hq" ? DEFAULT_STAFF_BRANCH : current;
}

export function PhoneApp() {
  const [role, setRole] = useState<AppRole>("owner");
  const [portal, setPortal] = useState<PortalKey>("hq");
  const [tab, setTab] = useState<AppTab>("hq");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [toast, setToast] = useState("");

  const [patients, setPatients] = useState<Record<BranchKey, Patient[]>>(PATIENTS);
  const [patientSearch, setPatientSearch] = useState("");
  const [viewedPatientId, setViewedPatientId] = useState<string | null>(null);
  const [patientFormOpen, setPatientFormOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [archivingPatientId, setArchivingPatientId] = useState<string | null>(null);

  const [cartOverrides, setCartOverrides] = useState<Partial<Record<BranchKey, CartItem[]>>>({});
  const [posAddOpen, setPosAddOpen] = useState(false);
  const [senior, setSenior] = useState(true);
  const [seniorId, setSeniorId] = useState(DEFAULT_SENIOR_ID);
  const [payment, setPayment] = useState<PaymentMethod>("GCash");

  const [pending, setPending] = useState<PendingAppointment[]>(INITIAL_PENDING);
  const [booking, setBooking] = useState<Booking>(INITIAL_BOOKING);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const flash = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), TOAST_MS);
  }, []);

  const isHq = portal === "hq";
  const branchKey: BranchKey = isHq ? DEFAULT_PATIENT_BRANCH : portal;
  const branch = BRANCHES.find((entry) => entry.key === branchKey)!;
  const tabs = tabsFor(role, isHq);
  const activeTab = tabs.includes(tab) ? tab : tabs[0];

  function changeRole(next: AppRole) {
    const nextPortal = homePortal(next, portal);
    setRole(next);
    setPortal(nextPortal);
    setTab(tabsFor(next, nextPortal === "hq")[0]);
    setViewedPatientId(null);
    setSwitcherOpen(false);
  }

  function changePortal(next: PortalKey) {
    setPortal(next);
    setTab(tabsFor(role, next === "hq")[0]);
    setViewedPatientId(null);
    setSwitcherOpen(false);
    if (role === "patient") setBooking(INITIAL_BOOKING);
  }

  // ── patients ──────────────────────────────────────────────────────────────
  const branchPatients = patients[branchKey];
  const viewedPatient = branchPatients.find((patient) => patient.id === viewedPatientId) ?? null;
  const editingPatient = branchPatients.find((patient) => patient.id === editingPatientId) ?? null;

  function savePatient(draft: PatientDraft) {
    setPatients((current) => {
      const list = current[branchKey];
      if (editingPatientId) {
        return { ...current, [branchKey]: list.map((patient) => (patient.id === editingPatientId ? { ...patient, ...draft } : patient)) };
      }
      const nextNumber = String(list.length + 1).padStart(4, "0");
      return { ...current, [branchKey]: [...list, { id: `MRN-${branchKey.slice(0, 1).toUpperCase()}${nextNumber}`, archived: false, ...draft }] };
    });
    setPatientFormOpen(false);
    flash(`${editingPatientId ? "Updated" : "Registered"} · ${draft.first} ${draft.last}`);
    setEditingPatientId(null);
  }

  function archivePatient() {
    if (!archivingPatientId) return;
    setPatients((current) => ({
      ...current,
      [branchKey]: current[branchKey].map((patient) => (patient.id === archivingPatientId ? { ...patient, archived: true } : patient)),
    }));
    setArchivingPatientId(null);
    setViewedPatientId(null);
    flash("Patient archived · records retained");
  }

  // ── POS ───────────────────────────────────────────────────────────────────
  const cartItems = cartOverrides[branchKey] ?? CARTS[branchKey].items;

  function removeCartItem(index: number) {
    const removed = cartItems[index];
    setCartOverrides((current) => ({ ...current, [branchKey]: cartItems.filter((_, position) => position !== index) }));
    flash(`Removed · ${removed.name}`);
  }

  function addCartItem(service: Service) {
    setCartOverrides((current) => ({
      ...current,
      [branchKey]: [...cartItems, { name: service.name, meta: `Service · ${service.meta}`, price: service.price }],
    }));
    setPosAddOpen(false);
    flash(`Added · ${service.name}`);
  }

  // ── booking ───────────────────────────────────────────────────────────────
  const bookedService = SERVICES[branchKey][booking.serviceIndex] ?? SERVICES[branchKey][0];
  const bookedDate = BOOKABLE_DATES[booking.dateIndex];
  const ticketNo = `${branch.specialty[0]}-${17 + booking.dateIndex}`;
  const ticketWhen = `${bookedDate.full} 2026 · ${booking.slot}`;

  function confirmBooking() {
    setBooking((current) => ({ ...current, step: 3, placed: true, confirmed: false }));
    setPending((current) => [
      ...current,
      { id: `ap-${Date.now()}`, patient: PATIENT_NAME_BY_BRANCH[branchKey], service: bookedService.name, when: ticketWhen },
    ]);
    flash("Request sent · awaiting clinic confirmation");
  }

  function cancelBooking() {
    setBooking(INITIAL_BOOKING);
    setTab("book");
    flash("Booking cancelled · slot freed · clinic notified");
  }

  function confirmPending(appointment: PendingAppointment) {
    setPending((current) => current.filter((entry) => entry.id !== appointment.id));
    setBooking((current) => (current.placed ? { ...current, confirmed: true } : current));
    flash(`Confirmed · SMS sent to ${appointment.patient}`);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center gap-3.5 bg-slate-200 px-4 py-6 font-text">
      <RoleSwitcher role={role} onSelect={changeRole} />

      <div className="relative flex h-[844px] w-full max-w-[390px] flex-col overflow-hidden rounded-2xl bg-slate-50 text-slate-900 shadow-xl">
        <PhoneTopbar
          name={isHq ? HQ_PORTAL_NAME : branch.name}
          url={isHq ? HQ_PORTAL_URL : branch.url}
          shortLabel={isHq ? "HQ" : branch.specialty}
          onOpenSwitcher={() => setSwitcherOpen(true)}
        />

        <ClinicSwitcherSheet
          open={switcherOpen}
          active={portal}
          includeHq={role === "owner"}
          onPick={changePortal}
          onClose={() => setSwitcherOpen(false)}
        />

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeTab === "hq" ? <HqHomeScreen onOpenBranch={changePortal} /> : null}
          {activeTab === "reports" ? <ReportsScreen /> : null}

          {activeTab === "home" ? (
            <BranchHomeScreen
              branch={branch}
              canSeeRevenue={role === "owner"}
              canManageClinic={role === "owner"}
              pending={pending}
              onConfirm={confirmPending}
            />
          ) : null}

          {activeTab === "queue" ? (
            <QueueScreen
              branch={branchKey}
              onCallIn={(name) => flash(`Called in · ${name}`)}
              onCharge={() => setTab("pos")}
            />
          ) : null}

          {activeTab === "patients" && !viewedPatient ? (
            <PatientsScreen
              patients={branchPatients}
              search={patientSearch}
              canEdit={role !== "practitioner"}
              onSearchChange={setPatientSearch}
              onView={setViewedPatientId}
              onRegister={() => {
                setEditingPatientId(null);
                setPatientFormOpen(true);
              }}
            />
          ) : null}

          {activeTab === "patients" && viewedPatient ? (
            <PatientDetailScreen
              patient={viewedPatient}
              canEdit={role !== "practitioner"}
              onBack={() => setViewedPatientId(null)}
              onEdit={() => {
                setEditingPatientId(viewedPatient.id);
                setPatientFormOpen(true);
              }}
              onArchive={() => setArchivingPatientId(viewedPatient.id)}
            />
          ) : null}

          {activeTab === "pos" ? (
            <PosScreen
              patient={CARTS[branchKey].patient}
              items={cartItems}
              senior={senior}
              seniorId={seniorId}
              payment={payment}
              onRemoveItem={removeCartItem}
              onOpenAdd={() => setPosAddOpen(true)}
              onToggleSenior={() => setSenior(!senior)}
              onSeniorIdChange={setSeniorId}
              onPaymentChange={setPayment}
              onIssueReceipt={(net) => flash(`OR ${POS_OR_SERIES} issued · ${net} via ${payment} · e-copy sent`)}
            />
          ) : null}

          {activeTab === "schedule" ? <ScheduleScreen clinicName={branch.name} /> : null}
          {activeTab === "earnings" ? <EarningsScreen /> : null}
          {activeTab === "me" && role === "practitioner" ? <PractitionerMeScreen /> : null}
          {activeTab === "me" && role === "patient" ? <PatientMeScreen name={PATIENT_NAME_BY_BRANCH[branchKey]} /> : null}

          {activeTab === "book" && booking.step === 1 ? (
            <BookPickStep
              branch={branchKey}
              clinicUrl={branch.url}
              serviceIndex={booking.serviceIndex}
              dateIndex={booking.dateIndex}
              slot={booking.slot}
              onServiceChange={(serviceIndex) => setBooking((current) => ({ ...current, serviceIndex }))}
              onDateChange={(dateIndex) => setBooking((current) => ({ ...current, dateIndex }))}
              onSlotChange={(slot) => setBooking((current) => ({ ...current, slot }))}
              onReview={() => setBooking((current) => ({ ...current, step: 2 }))}
            />
          ) : null}

          {activeTab === "book" && booking.step === 2 ? (
            <BookReviewStep
              rows={[
                { label: "Clinic", value: branch.name },
                { label: "Service", value: bookedService.name },
                { label: "Date", value: `${bookedDate.full} 2026` },
                { label: "Time", value: booking.slot },
                { label: "Patient", value: PATIENT_NAME_BY_BRANCH[branchKey] },
              ]}
              price={bookedService.price}
              onBack={() => setBooking((current) => ({ ...current, step: 1 }))}
              onConfirm={confirmBooking}
            />
          ) : null}

          {activeTab === "book" && booking.step === 3 ? (
            <BookTicketStep
              branch={branchKey}
              clinicName={branch.name}
              ticketNo={ticketNo}
              when={ticketWhen}
              serviceName={bookedService.name}
              confirmed={booking.confirmed}
              onViewVisits={() => setTab("visits")}
              onCancel={cancelBooking}
            />
          ) : null}

          {activeTab === "visits" ? (
            <VisitsScreen
              branch={branchKey}
              clinicName={branch.name}
              upcoming={booking.placed ? { ticketNo, serviceName: bookedService.name, when: ticketWhen } : null}
              onViewTicket={() => {
                setBooking((current) => ({ ...current, step: 3 }));
                setTab("book");
              }}
              onCancel={cancelBooking}
            />
          ) : null}

          {activeTab === "records" ? <RecordsScreen branch={branchKey} /> : null}
        </div>

        <ToastBanner message={toast} />
        <BottomNav tabs={tabs} active={activeTab} onSelect={setTab} />

        <PatientFormSheet
          open={patientFormOpen}
          editing={editingPatient}
          existing={branchPatients}
          onSave={savePatient}
          onClose={() => {
            setPatientFormOpen(false);
            setEditingPatientId(null);
          }}
        />
        <ArchivePatientDialog
          open={archivingPatientId !== null}
          onConfirm={archivePatient}
          onCancel={() => setArchivingPatientId(null)}
        />
        <PosAddServiceSheet open={posAddOpen} branch={branchKey} onAdd={addCartItem} onClose={() => setPosAddOpen(false)} />
      </div>
    </div>
  );
}
