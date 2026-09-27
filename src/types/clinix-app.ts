/** Shapes for the Clinix PH phone app (today's floor work; setup and analysis live in the console). */

export const APP_ROLES = ["owner", "practitioner", "assistant", "patient"] as const;
export type AppRole = (typeof APP_ROLES)[number];

/** "hq" is the owner's cross-branch portal; every other value is a branch key. */
export type PortalKey = "hq" | BranchKey;
export type BranchKey = "bgc-dental" | "makati-vet" | "qc-eye";

export type Branch = {
  key: BranchKey;
  name: string;
  url: string;
  specialty: string;
  revenue: number;
  patients: number;
  status: string;
};

export type QueueEntry = {
  no: string;
  name: string;
  sub: string;
  procedure: string;
  tag: string;
  tone: QueueTone;
  time: string;
};

export type QueueTone = "accent" | "neutral" | "outline";

export type BranchQueue = { title: string; countLabel: string; items: QueueEntry[] };

export type CartItem = { name: string; meta: string; price: number };
export type Cart = { patient: string; items: CartItem[] };

export type Service = { name: string; meta: string; price: number; desc: string };

export type Patient = {
  id: string;
  first: string;
  middle: string;
  last: string;
  suffix: string;
  sex: "F" | "M";
  age: number | "";
  mobile: string;
  philhealth: string;
  oscaId: string;
  allergies: string;
  notes: string;
  archived: boolean;
};

/** The patient form's editable fields — everything on a Patient except its MRN and archived flag. */
export type PatientDraft = Omit<Patient, "id" | "archived">;

export type ScheduleSlot = { time: string; patient: string; service: string; tag: string; tone: QueueTone };

export type PastVisit = { service: string; date: string; paid: number; or: string };

export type RecordRow = { title: string; meta: string; tag: string; tone: QueueTone };
export type PatientRecords = { title: string; clinic: string; rows: RecordRow[] };

export type BookableDate = { dow: string; day: string; full: string };

export type LabelledRow = { label: string; hint?: string; value: string };

export type ReportRow = { label: string; value: string };
export type MethodRow = { name: string; value: string; pct: number };
export type NamedValueRow = { name: string; value: string };

/** A pending booking a clinic still has to confirm. */
export type PendingAppointment = { id: string; patient: string; service: string; when: string };

export type Kennel = { id: string; pet: string; note: string };

export type EyeRxRow = { eye: string; sph: string; cyl: string; axis: string; add: string };

export type SupplyAlert = { name: string; note: string; tone: QueueTone };
