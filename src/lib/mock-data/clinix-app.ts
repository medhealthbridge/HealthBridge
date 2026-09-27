import type {
  Branch,
  BranchKey,
  BranchQueue,
  BookableDate,
  Cart,
  EyeRxRow,
  Kennel,
  LabelledRow,
  MethodRow,
  NamedValueRow,
  PastVisit,
  Patient,
  PatientRecords,
  PendingAppointment,
  ReportRow,
  ScheduleSlot,
  Service,
  SupplyAlert,
} from "@/src/types/clinix-app";

export const CLINIX_APP_ACCOUNT = "Dra. M. Villanueva";
export const HQ_PORTAL_NAME = "Owner HQ Portal";
export const HQ_PORTAL_URL = "hq.clinix.ph";

export const BRANCHES: Branch[] = [
  { key: "bgc-dental", name: "BGC Dental Studio", url: "bgc-dental.clinix.ph", specialty: "Dental", revenue: 48250, patients: 32, status: "Open · 6 in queue" },
  { key: "makati-vet", name: "Makati Vet Clinic", url: "makati-vet.clinix.ph", specialty: "Veterinary", revenue: 36900, patients: 24, status: "Open · 4 in queue" },
  { key: "qc-eye", name: "QC Eye Care Center", url: "qc-eye.clinix.ph", specialty: "Eye Care", revenue: 27400, patients: 19, status: "Closing 6:00 PM" },
];

export const QUEUES: Record<BranchKey, BranchQueue> = {
  "bgc-dental": {
    title: "Chair queue",
    countLabel: "Patients today",
    items: [
      { no: "D1", name: "Maria Santos", sub: "34 F · PhilHealth · Chair 2", procedure: "Root Canal — molar 36, session 2", tag: "In chair", tone: "accent", time: "10:15" },
      { no: "D2", name: "Joel Ramirez", sub: "41 M · Self-pay", procedure: "Oral Prophylaxis (Cleaning)", tag: "Waiting", tone: "neutral", time: "10:40" },
      { no: "D3", name: "Andrea Lim", sub: "9 F · Guardian present", procedure: "Fluoride application + sealant", tag: "Waiting", tone: "neutral", time: "11:00" },
      { no: "D4", name: "Ben Cruz", sub: "58 M · Senior ID on file", procedure: "Extraction — tooth 18", tag: "Senior", tone: "outline", time: "11:20" },
    ],
  },
  "makati-vet": {
    title: "Consult queue",
    countLabel: "Pets seen today",
    items: [
      { no: "V1", name: "Bantay · Golden Retriever", sub: "Owner: Liza Mendoza · 4 yr M", procedure: "Annual check + 5-in-1 booster", tag: "Vax due", tone: "accent", time: "10:05" },
      { no: "V2", name: "Miming · Domestic Shorthair Cat", sub: "Owner: R. Bautista · 2 yr F", procedure: "Spay pre-op assessment", tag: "Vax ok", tone: "neutral", time: "10:30" },
      { no: "V3", name: "Coco · Shih Tzu", sub: "Owner: A. Dizon · 7 yr F", procedure: "Dermatitis follow-up", tag: "Vax ok", tone: "neutral", time: "10:55" },
      { no: "V4", name: "Tofu · French Bulldog", sub: "Owner: M. Yap · 1 yr M", procedure: "Anti-rabies + deworming", tag: "Vax due", tone: "accent", time: "11:15" },
    ],
  },
  "qc-eye": {
    title: "Refraction queue",
    countLabel: "Exams today",
    items: [
      { no: "E1", name: "Ramon Tolentino", sub: "62 M · Senior ID SC-2019-QC-004821", procedure: "Refraction + progressive lens fitting", tag: "In room", tone: "accent", time: "10:10" },
      { no: "E2", name: "Kai Fernandez", sub: "17 M · Student", procedure: "Auto-refraction, myopia recheck", tag: "Waiting", tone: "neutral", time: "10:35" },
      { no: "E3", name: "Grace Ubaldo", sub: "45 F · HMO — Maxicare", procedure: "Tonometry + reading add", tag: "HMO", tone: "outline", time: "11:05" },
    ],
  },
};

export const CARTS: Record<BranchKey, Cart> = {
  "bgc-dental": {
    patient: "Ben Cruz",
    items: [
      { name: "Extraction — tooth 18", meta: "Procedure · Dr. Reyes", price: 3500 },
      { name: "Oral Prophylaxis", meta: "Procedure · with polishing", price: 1500 },
      { name: "Amoxicillin 500mg", meta: "Medication · 21 caps", price: 630 },
    ],
  },
  "makati-vet": {
    patient: "Bantay (L. Mendoza)",
    items: [
      { name: "5-in-1 Canine Vaccine", meta: "Vaccine · 1 dose", price: 1200 },
      { name: "Deworming — Praziquantel", meta: "Medication · 2 tabs", price: 380 },
      { name: "Boarding — 2 nights", meta: "Kennel K3 · large", price: 1600 },
    ],
  },
  "qc-eye": {
    patient: "Ramon Tolentino",
    items: [
      { name: "Comprehensive refraction", meta: "Procedure · optometrist", price: 900 },
      { name: "Progressive lens pair 1.59", meta: "Optical · polycarbonate", price: 6800 },
      { name: "Anti-reflective coating", meta: "Optical add-on", price: 1200 },
    ],
  },
};

export const SERVICES: Record<BranchKey, Service[]> = {
  "bgc-dental": [
    { name: "Oral Prophylaxis (Cleaning)", meta: "45 min · Dr. Reyes", price: 1500, desc: "Full scaling and polishing to remove plaque and stains." },
    { name: "Tooth Extraction", meta: "30 min · simple, per tooth", price: 3500, desc: "Simple extraction under local anesthesia, per tooth." },
    { name: "Root Canal Therapy", meta: "90 min · per session", price: 8500, desc: "Cleans and seals infected root canal, billed per session." },
    { name: "Dental Consultation", meta: "20 min · includes x-ray review", price: 800, desc: "Initial exam with x-ray review and treatment plan." },
  ],
  "makati-vet": [
    { name: "Wellness Check + Vaccine", meta: "30 min · Dr. Lao", price: 1200, desc: "Routine physical exam plus core vaccine dose." },
    { name: "Deworming", meta: "15 min · by weight", price: 380, desc: "Oral deworming dosed by the pet’s weight." },
    { name: "Grooming — full service", meta: "60 min · small to medium", price: 950, desc: "Bath, haircut, nail trim, and ear cleaning." },
    { name: "Kennel Boarding", meta: "Per night · incl. feeding", price: 800, desc: "Overnight boarding with feeding included, per night." },
  ],
  "qc-eye": [
    { name: "Comprehensive Refraction", meta: "40 min · optometrist", price: 900, desc: "Full eye exam to determine corrective lens prescription." },
    { name: "Contact Lens Fitting", meta: "45 min · incl. trial pair", price: 1500, desc: "Fitting session with a trial pair of contact lenses." },
    { name: "Tonometry (Eye Pressure)", meta: "20 min · glaucoma screening", price: 700, desc: "Measures intraocular pressure to screen for glaucoma." },
    { name: "Lens Replacement", meta: "30 min · frame check included", price: 2400, desc: "New lenses fitted to an existing frame, with frame check." },
  ],
};

export const PATIENTS: Record<BranchKey, Patient[]> = {
  "bgc-dental": [
    { id: "MRN-0001", first: "Maria", middle: "Reyes", last: "Santos", suffix: "", sex: "F", age: 34, mobile: "0917 555 4412", philhealth: "12-345678901-2", oscaId: "", allergies: "Penicillin", notes: "Root canal molar 36 in progress (session 2 of 3).", archived: false },
    { id: "MRN-0002", first: "Joel", middle: "Dela Cruz", last: "Ramirez", suffix: "", sex: "M", age: 41, mobile: "0918 220 8830", philhealth: "", oscaId: "", allergies: "None on file", notes: "For oral prophylaxis, self-pay.", archived: false },
    { id: "MRN-0003", first: "Andrea", middle: "Lim", last: "Tan", suffix: "", sex: "F", age: 9, mobile: "0917 004 1121", philhealth: "", oscaId: "", allergies: "None on file", notes: "Pedia · fluoride + sealant. Guardian: L. Tan.", archived: false },
  ],
  "makati-vet": [
    { id: "MRN-0101", first: "Bantay", middle: "", last: "(L. Mendoza)", suffix: "", sex: "M", age: 4, mobile: "0917 811 2200", philhealth: "", oscaId: "", allergies: "None on file", notes: "Golden Retriever · 5-in-1 due, deworming.", archived: false },
    { id: "MRN-0102", first: "Miming", middle: "", last: "(G. Ubaldo)", suffix: "", sex: "F", age: 2, mobile: "0920 447 1918", philhealth: "", oscaId: "", allergies: "None on file", notes: "DSH cat · post-op watch.", archived: false },
  ],
  "qc-eye": [
    { id: "MRN-0201", first: "Ramon", middle: "Bautista", last: "Tolentino", suffix: "Sr.", sex: "M", age: 62, mobile: "0917 333 7788", philhealth: "12-998877665-1", oscaId: "SC-2019-QC-004821", allergies: "None on file", notes: "Senior · refraction + progressive lens fitting.", archived: false },
  ],
};

export const INITIAL_PENDING: PendingAppointment[] = [
  { id: "ap1", patient: "Grace Ubaldo", service: "Skin consult · derma", when: "Today · 2:20 PM" },
];

export const PRACTITIONER_SCHEDULE: ScheduleSlot[] = [
  { time: "9:00 AM", patient: "Maria Santos", service: "Root Canal — session 2", tag: "Confirmed", tone: "neutral" },
  { time: "9:40 AM", patient: "Joel Ramirez", service: "Oral Prophylaxis", tag: "Checked in", tone: "accent" },
  { time: "10:20 AM", patient: "Andrea Tan", service: "Fluoride + sealant", tag: "Confirmed", tone: "neutral" },
  { time: "1:00 PM", patient: "Walk-in slot", service: "Open", tag: "Open", tone: "outline" },
];

export const PRACTITIONER_NAME = "Dr. Paolo Reyes";
export const PRACTITIONER_LICENCE = "PRC 0092841 · PTR 4471209";

export const PRACTITIONER_EARNINGS: ReportRow[] = [
  { label: "Consultations (14)", value: "11200" },
  { label: "Procedures (6)", value: "38600" },
  { label: "Professional-fee share (60%)", value: "29880" },
];

export const PRACTITIONER_NET_FEE = 29880;

export const PAST_VISITS: Record<BranchKey, PastVisit[]> = {
  "bgc-dental": [
    { service: "Root Canal Therapy — session 1", date: "02 Sep 2026", paid: 8500, or: "0041-1884" },
    { service: "Dental Consultation", date: "18 Aug 2026", paid: 800, or: "0041-1702" },
    { service: "Oral Prophylaxis", date: "11 Mar 2026", paid: 1500, or: "0039-8841" },
  ],
  "makati-vet": [
    { service: "Wellness Check + 5-in-1", date: "28 Aug 2026", paid: 1200, or: "0052-2194" },
    { service: "Kennel Boarding — 3 nights", date: "14 Jul 2026", paid: 2400, or: "0052-1780" },
    { service: "Grooming — full service", date: "02 Jun 2026", paid: 950, or: "0052-1401" },
  ],
  "qc-eye": [
    { service: "Comprehensive Refraction", date: "14 Aug 2026", paid: 900, or: "0044-0912" },
    { service: "Progressive lens pair", date: "14 Aug 2026", paid: 6800, or: "0044-0913" },
    { service: "Tonometry", date: "09 Feb 2026", paid: 700, or: "0043-6620" },
  ],
};

export const PATIENT_RECORDS: Record<BranchKey, PatientRecords> = {
  "bgc-dental": {
    title: "Dental records",
    clinic: "BGC Dental Studio",
    rows: [
      { title: "Root canal — molar 36", meta: "Session 1 of 2 done · 02 Sep 2026", tag: "ongoing", tone: "accent" },
      { title: "Composite filling — tooth 24", meta: "Completed · 18 Aug 2026", tag: "done", tone: "neutral" },
      { title: "Panoramic x-ray", meta: "Film on file · 18 Aug 2026", tag: "file", tone: "neutral" },
      { title: "Amoxicillin 500mg", meta: "Prescribed 21 caps · 02 Sep 2026", tag: "rx", tone: "outline" },
    ],
  },
  "makati-vet": {
    title: "Pet records · Bantay",
    clinic: "Makati Vet Clinic",
    rows: [
      { title: "Golden Retriever · 4 yr · male", meta: "28.4 kg · microchip 900219000417", tag: "profile", tone: "neutral" },
      { title: "Anti-rabies vaccine", meta: "Due 12 Oct 2026 · last 12 Oct 2025", tag: "due soon", tone: "accent" },
      { title: "5-in-1 canine booster", meta: "Given 28 Aug 2026", tag: "valid", tone: "neutral" },
      { title: "Deworming", meta: "Given 28 Aug 2026 · next Feb 2027", tag: "valid", tone: "neutral" },
    ],
  },
  "qc-eye": {
    title: "Eye records",
    clinic: "QC Eye Care Center",
    rows: [
      { title: "Progressive lenses 1.59", meta: "Dispensed 14 Aug 2026 · AR coated", tag: "active", tone: "neutral" },
      { title: "Tonometry — 14 / 15 mmHg", meta: "Within range · 14 Aug 2026", tag: "normal", tone: "neutral" },
      { title: "Annual recheck", meta: "Recommended Aug 2027", tag: "reminder", tone: "outline" },
    ],
  },
};

export const BOOKABLE_DATES: BookableDate[] = [
  { dow: "Wed", day: "16", full: "Wed 16 Sep" },
  { dow: "Thu", day: "17", full: "Thu 17 Sep" },
  { dow: "Fri", day: "18", full: "Fri 18 Sep" },
  { dow: "Sat", day: "19", full: "Sat 19 Sep" },
  { dow: "Mon", day: "21", full: "Mon 21 Sep" },
];

export const BOOKABLE_SLOTS = ["9:00 AM", "9:40 AM", "10:20 AM", "11:00 AM", "1:00 PM", "1:40 PM", "2:20 PM", "3:00 PM", "4:00 PM"] as const;
export const FULLY_BOOKED_SLOTS: readonly string[] = ["10:20 AM", "1:40 PM"];

export const CLINIC_ADDRESSES: Record<BranchKey, string> = {
  "bgc-dental": "12F One Bonifacio High St, BGC",
  "makati-vet": "2F Chino Roces Ave, Makati",
  "qc-eye": "Ground Fl, Trinoma, Quezon City",
};

export const PATIENT_NAME_BY_BRANCH: Record<BranchKey, string> = {
  "bgc-dental": "Ramon Tolentino",
  "makati-vet": "Bantay (pet)",
  "qc-eye": "Ramon Tolentino",
};

export const PATIENT_PROFILE: LabelledRow[] = [
  { label: "Mobile number", hint: "Used for queue SMS alerts", value: "+63 917 ••• 4412" },
  { label: "Senior / PWD ID", hint: "Auto-applies the statutory discount", value: "SC-2019-QC-004821" },
  { label: "PhilHealth number", hint: "For claim-eligible procedures", value: "12-••••••-7" },
  { label: "Linked clinics", hint: "Subdomains you have records with", value: "3 clinics" },
  { label: "Pets", hint: "Veterinary profiles under your account", value: "Bantay, Chico" },
  { label: "Saved payment", hint: "Charged only at the counter", value: "GCash" },
];

export const PAYMENT_METHODS = ["GCash", "Maya", "QR Ph", "Cash", "Card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const VAT_RATE = 12;
export const STATUTORY_DISCOUNT_RATE = 20;
export const DEFAULT_SENIOR_ID = "SC-2019-QC-004821";
export const POS_TXN_NO = "2260-0117";
export const POS_OR_SERIES = "0041-2260";
export const BIR_FOOTER = "VAT Reg TIN 009-482-117-000 · OR Series 0041-2260 · POS Permit 0324-FP-00219";

export const REPORTS_AS_OF = "All branches · 20 Sep 2026";

export const REPORT_DAILY_SALES: ReportRow[] = [
  { label: "Gross sales", value: "112550" },
  { label: "SC / PWD discounts", value: "-8420" },
  { label: "VAT-exempt sales", value: "37600" },
  { label: "Net collected", value: "104130" },
];

export const REPORT_METHODS: MethodRow[] = [
  { name: "GCash", value: "41200", pct: 40 },
  { name: "Cash", value: "28600", pct: 27 },
  { name: "Card", value: "18900", pct: 18 },
  { name: "Maya", value: "9800", pct: 9 },
  { name: "HMO / PhilHealth", value: "5630", pct: 6 },
];

export const REPORT_TOP_SERVICES: NamedValueRow[] = [
  { name: "Root Canal Therapy", value: "18 · ₱153,000" },
  { name: "Oral Prophylaxis", value: "42 · ₱63,000" },
  { name: "Comprehensive Refraction", value: "31 · ₱27,900" },
  { name: "Wellness Check + Vaccine", value: "24 · ₱28,800" },
];

export const REPORT_PRACTITIONER_EARNINGS: NamedValueRow[] = [
  { name: "Dr. Paolo Reyes", value: "₱29,880" },
  { name: "Dr. Lao (Vet)", value: "₱21,440" },
  { name: "Dra. Villanueva", value: "₱33,120" },
];

export const REPORT_NO_SHOW_RATE = "7.4%";

/** FDI upper arch. `state` drives the odontogram legend. */
export const ODONTOGRAM_TEETH: { no: string; state: "sound" | "restored" | "work" }[] = [
  { no: "11", state: "sound" }, { no: "12", state: "sound" }, { no: "13", state: "restored" }, { no: "14", state: "sound" },
  { no: "15", state: "sound" }, { no: "16", state: "work" }, { no: "17", state: "sound" }, { no: "18", state: "sound" },
  { no: "21", state: "sound" }, { no: "22", state: "restored" }, { no: "23", state: "sound" }, { no: "24", state: "sound" },
  { no: "25", state: "sound" }, { no: "26", state: "work" }, { no: "27", state: "sound" }, { no: "28", state: "restored" },
];

export const ODONTOGRAM_PATIENT = "Maria Santos";

export const KENNELS: Kennel[] = [
  { id: "K1", pet: "Bantay", note: "Day 2 of 3" },
  { id: "K2", pet: "Miming", note: "Post-op watch" },
  { id: "K3", pet: "Tofu", note: "Checkout 4 PM" },
  { id: "K4", pet: "Vacant", note: "Large" },
  { id: "K5", pet: "Chico", note: "Day 1 of 5" },
  { id: "K6", pet: "Vacant", note: "Small" },
];

export const EYE_PRESCRIPTION: EyeRxRow[] = [
  { eye: "OD", sph: "-2.25", cyl: "-0.75", axis: "180", add: "+1.00" },
  { eye: "OS", sph: "-2.00", cyl: "-0.50", axis: "175", add: "+1.00" },
];

export const EYE_PRESCRIPTION_PATIENT = "R. Tolentino";
export const EYE_PRESCRIPTION_DATE = "14 Aug 2026";

export const SUPPLY_ALERTS: Record<BranchKey, { title: string; rows: SupplyAlert[] }> = {
  "bgc-dental": {
    title: "Dental supply alerts",
    rows: [
      { name: "Lidocaine 2% ampoules", note: "14 left · low", tone: "accent" },
      { name: "Composite resin A2", note: "3 left · critical", tone: "accent" },
      { name: "Fluoride varnish", note: "36 · ok", tone: "neutral" },
    ],
  },
  "makati-vet": {
    title: "Vaccine stock",
    rows: [
      { name: "Rabies vaccine (1ml)", note: "18 · low", tone: "accent" },
      { name: "5-in-1 canine", note: "54 · ok", tone: "neutral" },
    ],
  },
  "qc-eye": {
    title: "Optic lens stock",
    rows: [
      { name: "CR-39 blanks", note: "6 pairs · critical", tone: "accent" },
      { name: "Polycarbonate 1.59", note: "42 pairs", tone: "neutral" },
      { name: "Photochromic 1.56", note: "27 pairs", tone: "neutral" },
    ],
  },
};

export const HQ_STOCK_ALERT_COUNT = 5;
export const KENNELS_OCCUPIED_LABEL = "4 / 6 occupied";
