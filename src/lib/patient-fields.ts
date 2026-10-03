import { z } from "zod";

export const FIELD_TYPES = ["text", "long_text", "number", "date", "yes_no", "select", "multi_select"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text", long_text: "Long text", number: "Number", date: "Date", yes_no: "Yes / no", select: "Pick one", multi_select: "Pick several",
};

export const MAX_ACTIVE_FIELDS = 40;
export const MAX_OPTIONS = 30;

export type FieldDefinition = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  options: string[];
  required: boolean;
  medical: boolean;
  section: string;
  sortOrder: number;
  scope: "standard" | "addon";
  createdByStaffId: string | null;
  createdByName: string | null;
  archived: boolean;
};

/** Fields every clinic has. Shown in settings so owners know they exist; they are not editable there. */
export const BUILT_IN_FIELDS = [
  { label: "First and last name", why: "Search, receipts and the patient portal" },
  { label: "Sex", why: "Shown on the chart and receipts" },
  { label: "Birth date", why: "Age, and senior-citizen checks" },
  { label: "MRN", why: "The record number every visit and receipt links to" },
  { label: "Mobile and email", why: "Reminders and the patient portal" },
  { label: "Senior (OSCA) and PWD ID", why: "The 20% discount at checkout (RA 9994, RA 10754)" },
  { label: "PhilHealth PIN", why: "PhilHealth claims" },
  { label: "Data privacy consent", why: "Required by RA 10173" },
] as const;

/** A stable key from a label: "Blood type" → "blood_type". Never changes once a field exists. */
export function fieldKey(label: string) {
  const base = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40);
  return base || "field";
}

const optionList = z
  .array(z.string().trim().min(1).max(60))
  .max(MAX_OPTIONS, `At most ${MAX_OPTIONS} choices.`)
  .transform((options) => [...new Set(options)]);

export const fieldDefinitionInputSchema = z
  .object({
    label: z.string().trim().min(2, "Enter a name for the field.").max(60),
    type: z.enum(FIELD_TYPES, "Choose a type."),
    options: optionList.default([]),
    required: z.boolean().default(false),
    medical: z.boolean().default(false),
    section: z.string().trim().min(1).max(40).default("Other details"),
  })
  .superRefine((value, ctx) => {
    if ((value.type === "select" || value.type === "multi_select") && value.options.length < 2) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Add at least two choices, one per line." });
    }
  });
export type FieldDefinitionInput = z.output<typeof fieldDefinitionInputSchema>;

/** Checks and normalises one value for a field. Empty is null. Returns an error message instead of throwing. */
export function normalizeFieldValue(field: Pick<FieldDefinition, "type" | "options" | "label">, raw: unknown): { value: unknown } | { error: string } {
  const empty = raw === null || raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0);
  if (empty) return { value: null };
  switch (field.type) {
    case "text":
    case "long_text": {
      const text = String(raw).trim();
      const max = field.type === "text" ? 200 : 2000;
      if (text.length > max) return { error: `${field.label}: keep it under ${max} characters.` };
      return { value: text || null };
    }
    case "number": {
      const number = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "").trim());
      if (!Number.isFinite(number)) return { error: `${field.label}: enter a number.` };
      return { value: number };
    }
    case "date": {
      const text = String(raw).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) return { error: `${field.label}: use a valid date.` };
      return { value: text };
    }
    case "yes_no": {
      if (raw === true || raw === "yes" || raw === "true" || raw === "on") return { value: true };
      if (raw === false || raw === "no" || raw === "false") return { value: false };
      return { error: `${field.label}: answer yes or no.` };
    }
    case "select": {
      const text = String(raw).trim();
      if (!field.options.includes(text)) return { error: `${field.label}: pick one of the choices.` };
      return { value: text };
    }
    case "multi_select": {
      const list = (Array.isArray(raw) ? raw : [raw]).map((item) => String(item).trim()).filter(Boolean);
      const bad = list.find((item) => !field.options.includes(item));
      if (bad) return { error: `${field.label}: "${bad}" isn't one of the choices.` };
      return { value: [...new Set(list)] };
    }
  }
}

/**
 * Whether existing values survive a type change. Converting to text always
 * works; anything else only if every stored value still fits the new type.
 * Returns how many values would not fit (0 means the change is safe).
 */
export function incompatibleValues(values: unknown[], to: Pick<FieldDefinition, "type" | "options" | "label">) {
  if (to.type === "text" || to.type === "long_text") return 0;
  return values.filter((value) => value !== null && value !== undefined && "error" in normalizeFieldValue(to, Array.isArray(value) && to.type !== "multi_select" ? value.join(", ") : value)).length;
}

/** How a stored value reads on the chart and in exports. */
export function displayFieldValue(type: FieldType, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (type === "yes_no") return value === true ? "Yes" : value === false ? "No" : String(value);
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

type Suggestion = Omit<FieldDefinitionInput, "options"> & { options?: string[] };

const general: Suggestion[] = [
  { label: "Allergies", type: "long_text", required: false, medical: true, section: "Medical history" },
  { label: "Maintenance medications", type: "long_text", required: false, medical: true, section: "Medical history" },
  { label: "Blood type", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"], required: false, medical: true, section: "Medical history" },
  { label: "Emergency contact", type: "text", required: false, medical: false, section: "Contact" },
  { label: "HMO and member number", type: "text", required: false, medical: false, section: "Coverage" },
  { label: "Referred by", type: "text", required: false, medical: false, section: "Other details" },
];

/** Starting points per clinic type. Adding one makes it the clinic's own field; they can rename or change it. */
export const FIELD_SUGGESTIONS: Record<string, Suggestion[]> = {
  dental: [
    { label: "Chief complaint", type: "long_text", required: false, medical: true, section: "Dental" },
    { label: "Medical alerts", type: "multi_select", options: ["Bleeding disorder", "On blood thinners", "Heart condition", "Diabetes", "Hypertension", "Pregnant", "Asthma"], required: false, medical: true, section: "Medical history" },
    { label: "Allergies", type: "multi_select", options: ["Local anesthesia", "Latex", "Penicillin", "Ibuprofen", "None known"], required: false, medical: true, section: "Medical history" },
    { label: "Current medications", type: "long_text", required: false, medical: true, section: "Medical history" },
    { label: "Last dental visit", type: "date", required: false, medical: false, section: "Dental" },
    { label: "Referring dentist", type: "text", required: false, medical: false, section: "Other details" },
    { label: "Emergency contact", type: "text", required: false, medical: false, section: "Contact" },
  ],
  eye: [
    { label: "Wears", type: "select", options: ["Nothing", "Glasses", "Contact lenses", "Both"], required: false, medical: false, section: "Eye care" },
    { label: "Last eye exam", type: "date", required: false, medical: false, section: "Eye care" },
    { label: "Diabetes or hypertension", type: "yes_no", required: false, medical: true, section: "Medical history" },
    { label: "Family history of glaucoma", type: "yes_no", required: false, medical: true, section: "Medical history" },
    { label: "Daily screen hours", type: "number", required: false, medical: false, section: "Eye care" },
    { label: "Occupation", type: "text", required: false, medical: false, section: "Other details" },
  ],
  vet: [
    { label: "Species", type: "select", options: ["Dog", "Cat", "Bird", "Rabbit", "Other"], required: true, medical: false, section: "Pet" },
    { label: "Breed", type: "text", required: false, medical: false, section: "Pet" },
    { label: "Color or markings", type: "text", required: false, medical: false, section: "Pet" },
    { label: "Weight (kg)", type: "number", required: false, medical: true, section: "Health" },
    { label: "Neutered or spayed", type: "yes_no", required: false, medical: false, section: "Pet" },
    { label: "Microchip number", type: "text", required: false, medical: false, section: "Pet" },
    { label: "Next vaccination due", type: "date", required: false, medical: true, section: "Health" },
  ],
  derma: [
    { label: "Skin type (Fitzpatrick)", type: "select", options: ["I", "II", "III", "IV", "V", "VI"], required: false, medical: true, section: "Skin" },
    { label: "Known allergies", type: "long_text", required: false, medical: true, section: "Medical history" },
    { label: "Current topical treatments", type: "long_text", required: false, medical: true, section: "Skin" },
    { label: "Pregnant or breastfeeding", type: "yes_no", required: false, medical: true, section: "Medical history" },
    { label: "Daily sun exposure", type: "select", options: ["Low", "Moderate", "High"], required: false, medical: false, section: "Skin" },
  ],
  general,
};

export function suggestionsFor(specialty: string): Suggestion[] {
  return FIELD_SUGGESTIONS[specialty] ?? general;
}
