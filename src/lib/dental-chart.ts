import { z } from "zod";

/** Permanent teeth, FDI two-digit numbering: first digit = quadrant (1 upper right, 2 upper left, 3 lower left, 4 lower right), second = position from the midline (1 central incisor … 8 wisdom). */
export const PERMANENT_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;
export type Tooth = (typeof PERMANENT_TEETH)[number];

export const isTooth = (value: number): value is Tooth => (PERMANENT_TEETH as readonly number[]).includes(value);

export const quadrantOf = (tooth: number) => Math.floor(tooth / 10);
export const positionOf = (tooth: number) => tooth % 10;
export const isUpper = (tooth: number) => quadrantOf(tooth) <= 2;

export type ToothKind = "incisor" | "canine" | "premolar" | "molar";
export const kindOf = (tooth: number): ToothKind => {
  const position = positionOf(tooth);
  return position <= 2 ? "incisor" : position === 3 ? "canine" : position <= 5 ? "premolar" : "molar";
};

/** Roots under the crown: upper molars 3, lower molars 2, upper first premolars 2, everything else 1. */
export function rootCount(tooth: number) {
  const kind = kindOf(tooth);
  if (kind === "molar") return isUpper(tooth) ? 3 : 2;
  if (kind === "premolar" && positionOf(tooth) === 4 && isUpper(tooth)) return 2;
  return 1;
}

/** US "Universal" number (1-32), which many Philippine dentists still use. */
export function universalNumber(tooth: number) {
  const q = quadrantOf(tooth);
  const p = positionOf(tooth);
  return q === 1 ? 9 - p : q === 2 ? 8 + p : q === 3 ? 25 - p : 24 + p;
}

const POSITION_NAMES = ["", "central incisor", "lateral incisor", "canine", "first premolar", "second premolar", "first molar", "second molar", "third molar (wisdom)"];
const QUADRANT_NAMES = ["", "Upper right", "Upper left", "Lower left", "Lower right"];
export const toothName = (tooth: number) => `${QUADRANT_NAMES[quadrantOf(tooth)]} ${POSITION_NAMES[positionOf(tooth)]}`;

export const SURFACES = ["M", "D", "B", "L", "O"] as const;
export type Surface = (typeof SURFACES)[number];
export const SURFACE_LABELS: Record<Surface, string> = { M: "Mesial", D: "Distal", B: "Buccal / facial", L: "Lingual / palatal", O: "Occlusal / incisal" };

/** Keeps only valid surface letters, once each, in M D B L O order. */
export function normalizeSurfaces(input: string | null | undefined): string {
  const letters = new Set((input ?? "").toUpperCase().split(""));
  return SURFACES.filter((surface) => letters.has(surface)).join("");
}

export type ChartCode = { code: string; label: string; kind: "condition" | "procedure"; color: string; /** Whether surfaces make sense for it. */ surfaces: boolean };

/** Findings (what is true of the tooth) and procedures (work done). Colours are shared by the 3D model, the flat chart and the legend. */
export const CHART_CODES: ChartCode[] = [
  { code: "caries", label: "Caries (decay)", kind: "condition", color: "#dc2626", surfaces: true },
  { code: "fracture", label: "Fractured", kind: "condition", color: "#ea580c", surfaces: false },
  { code: "periapical", label: "Periapical lesion", kind: "condition", color: "#db2777", surfaces: false },
  { code: "mobility", label: "Mobile", kind: "condition", color: "#d97706", surfaces: false },
  { code: "impacted", label: "Impacted / unerupted", kind: "condition", color: "#7c3aed", surfaces: false },
  { code: "missing", label: "Missing", kind: "condition", color: "#94a3b8", surfaces: false },
  { code: "watch", label: "Watch", kind: "condition", color: "#ca8a04", surfaces: true },
  { code: "filling", label: "Filling", kind: "procedure", color: "#0ea5e9", surfaces: true },
  { code: "sealant", label: "Sealant", kind: "procedure", color: "#22c55e", surfaces: true },
  { code: "veneer", label: "Veneer", kind: "procedure", color: "#f5f5f4", surfaces: false },
  { code: "crown", label: "Crown", kind: "procedure", color: "#eab308", surfaces: false },
  { code: "rct", label: "Root canal", kind: "procedure", color: "#4f46e5", surfaces: false },
  { code: "bridge", label: "Bridge (abutment / pontic)", kind: "procedure", color: "#f59e0b", surfaces: false },
  { code: "implant", label: "Implant", kind: "procedure", color: "#64748b", surfaces: false },
  { code: "extraction", label: "Extraction", kind: "procedure", color: "#475569", surfaces: false },
];
export const CODE_BY_KEY = new Map(CHART_CODES.map((entry) => [entry.code, entry]));

export const chartEntrySchema = z.object({
  tooth: z.coerce.number().int().refine(isTooth, "Choose a tooth."),
  code: z.string().refine((value) => CODE_BY_KEY.has(value), "Choose what to record."),
  surfaces: z.string().max(10).default("").transform(normalizeSurfaces),
  note: z.string().trim().max(300).or(z.literal("")).nullish().transform((value) => value || null),
  occurredOn: z.iso.date("Use a valid date.").optional(),
});
export type ChartEntryInput = z.output<typeof chartEntrySchema>;

export type ChartEntry = {
  id: string;
  tooth: number;
  surfaces: string | null;
  kind: "condition" | "procedure";
  code: string;
  occurredOn: string;
  createdAt?: string;
  voided?: boolean;
};

export type ToothState = {
  missing: boolean;
  implant: boolean;
  crown: boolean;
  veneer: boolean;
  bridge: boolean;
  rct: boolean;
  fracture: boolean;
  impacted: boolean;
  mobile: boolean;
  lesion: boolean;
  watch: string;
  caries: string;
  filling: string;
  sealant: string;
  /** The code that decides the tooth's main colour: the most significant live finding or work. */
  headline: string | null;
};

const EMPTY: ToothState = { missing: false, implant: false, crown: false, veneer: false, bridge: false, rct: false, fracture: false, impacted: false, mobile: false, lesion: false, watch: "", caries: "", filling: "", sealant: "", headline: null };

const union = (a: string, b: string) => normalizeSurfaces(a + b);
const without = (from: string, remove: string) => normalizeSurfaces(from.split("").filter((letter) => !remove.includes(letter)).join(""));
const ALL = "MDBLO";

/** Most important first: what you notice about a tooth. */
const HEADLINE_ORDER = ["missing", "extraction", "implant", "crown", "bridge", "veneer", "rct", "fracture", "periapical", "caries", "impacted", "mobility", "filling", "sealant", "watch"];

/**
 * A tooth's current state from its live history, oldest first. Work done clears the finding it treats:
 * a filling clears caries on those surfaces, a crown, root canal or extraction clears the decay, an
 * extraction leaves the tooth missing, and an implant fills the gap again.
 */
export function deriveToothStates(entries: ChartEntry[]): Map<number, ToothState> {
  const states = new Map<number, ToothState>();
  const live = entries.filter((entry) => !entry.voided).sort((a, b) => (a.occurredOn + (a.createdAt ?? "")).localeCompare(b.occurredOn + (b.createdAt ?? "")));
  for (const entry of live) {
    const state = { ...(states.get(entry.tooth) ?? EMPTY) };
    const surfaces = normalizeSurfaces(entry.surfaces);
    switch (entry.code) {
      case "caries": state.caries = union(state.caries, surfaces || "O"); break;
      case "watch": state.watch = union(state.watch, surfaces || "O"); break;
      case "fracture": state.fracture = true; break;
      case "periapical": state.lesion = true; break;
      case "mobility": state.mobile = true; break;
      case "impacted": state.impacted = true; break;
      case "missing": state.missing = true; state.implant = false; break;
      case "filling": state.filling = union(state.filling, surfaces || "O"); state.caries = without(state.caries, surfaces || "O"); state.missing = false; break;
      case "sealant": state.sealant = union(state.sealant, surfaces || "O"); break;
      case "veneer": state.veneer = true; state.caries = without(state.caries, "B"); break;
      case "crown": state.crown = true; state.caries = ""; state.fracture = false; state.missing = false; break;
      case "rct": state.rct = true; state.lesion = false; state.caries = ""; break;
      case "bridge": state.bridge = true; break;
      case "implant": state.implant = true; state.missing = false; state.caries = ""; break;
      case "extraction": state.missing = true; state.caries = ""; state.fracture = false; state.lesion = false; state.mobile = false; state.rct = false; state.crown = false; state.filling = ""; state.sealant = ""; state.implant = false; break;
    }
    states.set(entry.tooth, state);
  }
  for (const [tooth, state] of states) {
    const present: Record<string, boolean> = {
      missing: state.missing && !state.implant, extraction: false, implant: state.implant, crown: state.crown, bridge: state.bridge, veneer: state.veneer, rct: state.rct,
      fracture: state.fracture, periapical: state.lesion, caries: state.caries !== "", impacted: state.impacted, mobility: state.mobile, filling: state.filling !== "", sealant: state.sealant !== "", watch: state.watch !== "",
    };
    states.set(tooth, { ...state, headline: HEADLINE_ORDER.find((code) => present[code]) ?? null });
  }
  return states;
}

/** A one-line description of a tooth for lists and tooltips. */
export function describeTooth(state: ToothState | undefined): string {
  if (!state) return "No findings";
  const parts: string[] = [];
  if (state.missing && !state.implant) parts.push("missing");
  if (state.implant) parts.push("implant");
  if (state.crown) parts.push("crown");
  if (state.bridge) parts.push("bridge");
  if (state.veneer) parts.push("veneer");
  if (state.rct) parts.push("root canal");
  if (state.filling) parts.push(`filling ${state.filling}`);
  if (state.sealant) parts.push(`sealant ${state.sealant}`);
  if (state.caries) parts.push(`caries ${state.caries}`);
  if (state.fracture) parts.push("fractured");
  if (state.lesion) parts.push("periapical lesion");
  if (state.mobile) parts.push("mobile");
  if (state.impacted) parts.push("impacted");
  if (state.watch) parts.push(`watch ${state.watch}`);
  return parts.length ? parts.join(", ") : "No findings";
}

export const ALL_SURFACES = ALL;

/** A reasonable chart code for a service by its name, so marking "Composite Filling" done charts a filling. The dentist can change it. */
export function guessChartCode(serviceName: string): string | null {
  const name = serviceName.toLowerCase();
  const rules: [RegExp, string][] = [
    [/root canal|\brct\b|endodont/, "rct"],
    [/extract|pasta|surgical removal|odontectomy/, "extraction"],
    [/implant/, "implant"],
    [/crown|cap\b/, "crown"],
    [/bridge|pontic/, "bridge"],
    [/veneer/, "veneer"],
    [/sealant/, "sealant"],
    [/fill|restoration|composite|amalgam|\bglass ionomer|\bgic\b|pasta/, "filling"],
  ];
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}
