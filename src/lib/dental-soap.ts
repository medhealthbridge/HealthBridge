import { CODE_BY_KEY, quadrantOf, type ToothState } from "@/src/lib/dental-chart";

export type SoapDraft = { subjective: string; objective: string; assessment: string; plan: string };
export type PlannedWork = { tooth: number | null; description: string };

const list = (teeth: number[]) => teeth.sort((a, b) => a - b).map((t) => `#${t}`).join(", ");
const join = (parts: string[]) => (parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`);

/** Findings worth acting on, each with the usual next step. Order = clinical priority. */
const FINDINGS: { key: keyof ToothState; label: string; next: string; surfaces?: boolean }[] = [
  { key: "lesion", label: "Periapical lesion", next: "evaluate for root canal treatment" },
  { key: "fracture", label: "Fracture", next: "evaluate for crown or restoration" },
  { key: "caries", label: "Caries", next: "restore (filling)", surfaces: true },
  { key: "mobile", label: "Mobility", next: "periodontal evaluation" },
  { key: "impacted", label: "Impacted / unerupted", next: "evaluate for surgical removal" },
  { key: "watch", label: "Watch", next: "monitor at recall", surfaces: true },
];
const EXISTING: { key: keyof ToothState; label: string }[] = [
  { key: "crown", label: "Crown" }, { key: "bridge", label: "Bridge" }, { key: "veneer", label: "Veneer" }, { key: "rct", label: "Root canal treated" },
  { key: "implant", label: "Implant" }, { key: "filling", label: "Filling" }, { key: "sealant", label: "Sealant" },
];

/**
 * A starting point for the visit note, written from the tooth chart. The dentist edits it before saving;
 * nothing is saved automatically. Plain clinical wording, FDI numbers.
 */
export function draftSoapNote(states: Map<number, ToothState>, planned: PlannedWork[] = []): SoapDraft {
  const teeth = [...states.entries()];
  const objective: string[] = [];
  const nextSteps: string[] = [];
  const involved = new Set<number>();
  let findingCount = 0;

  for (const finding of FINDINGS) {
    const hits = teeth.filter(([, s]) => (typeof s[finding.key] === "string" ? s[finding.key] !== "" : s[finding.key] === true));
    if (!hits.length) continue;
    findingCount += hits.length;
    hits.forEach(([t]) => involved.add(t));
    const detail = finding.surfaces ? hits.map(([t, s]) => `#${t} (${s[finding.key]})`).join(", ") : list(hits.map(([t]) => t));
    objective.push(`${finding.label} on ${detail}.`);
    nextSteps.push(`${finding.next} ${list(hits.map(([t]) => t))}`);
  }
  const missing = teeth.filter(([, s]) => s.missing && !s.implant).map(([t]) => t);
  if (missing.length) {
    objective.push(`Missing ${list(missing)}.`);
    missing.forEach((t) => involved.add(t));
  }
  for (const work of EXISTING) {
    const hits = teeth.filter(([, s]) => (typeof s[work.key] === "string" ? s[work.key] !== "" : s[work.key] === true)).map(([t]) => t);
    if (hits.length) objective.push(`${work.label}: ${list(hits)}.`);
  }

  const quadrants = new Set([...involved].map(quadrantOf)).size;
  const assessment = findingCount === 0
    ? "No active findings charted."
    : `${findingCount} finding${findingCount === 1 ? "" : "s"} across ${quadrants} quadrant${quadrants === 1 ? "" : "s"}. Teeth involved: ${list([...involved])}.`;

  const plannedText = planned.map((p) => (p.tooth ? `${p.description} #${p.tooth}` : p.description));
  const plan = plannedText.length
    ? `${join(plannedText)}.`
    : nextSteps.length
      ? `${join(nextSteps).replace(/^./, (c) => c.toUpperCase())}.`
      : "Routine recall.";

  return {
    subjective: "Patient presents for dental examination and evaluation.",
    objective: objective.length ? objective.join(" ") : "No findings charted.",
    assessment,
    plan,
  };
}

export const soapAsText = (d: SoapDraft) => `S: ${d.subjective}\nO: ${d.objective}\nA: ${d.assessment}\nP: ${d.plan}`;
export const codeColor = (code: string | null | undefined) => (code ? CODE_BY_KEY.get(code)?.color : undefined);
