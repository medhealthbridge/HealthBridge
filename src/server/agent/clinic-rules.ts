import type { RuleRunner } from "./rules";

type Overview = { clinic: string; appointmentsToday: number; byStatus: Record<string, number>; patientRecords: number };
type Appt = { time: string; patient: string; status: string; practitioner: string | null };

const CHANGE_WORDS = /\b(add|create|register|edit|update|change|rename|archive|delete|remove|restore|book|cancel|reschedule|move|set|mark)\b/i;
const STATUS_LABEL: Record<string, string> = { requested: "requested", confirmed: "booked", checked_in: "waiting", in_progress: "in chair", completed: "done", cancelled: "cancelled", no_show: "no-show" };

/** Free instant answers for the questions a clinic owner asks every day. Anything that changes data goes to a model, which can only propose. */
export async function answerClinicByRules(question: string, run: RuleRunner, timezone: string): Promise<string | null> {
  const text = question.trim();
  if (text.length > 140 || CHANGE_WORDS.test(text)) return null;

  if (/^(hi|hello|hey|help|what can you do)\b/i.test(text)) {
    return "I can tell you how today looks, list today's or tomorrow's appointments, and find patients (“find Santos”). I can also prepare changes — adding or editing patients, booking, archiving — which only happen after you confirm.";
  }
  if (/\b(appointments?|schedule|queue)\b.*\b(today|tomorrow)\b|\b(today|tomorrow)\b.*\b(appointments?|schedule|queue)\b/i.test(text)) {
    const when = /tomorrow/i.test(text) ? "tomorrow" : "today";
    const rows = (await run("list_appointments", { when })) as Appt[];
    const time = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: timezone });
    return rows.length === 0 ? `No appointments ${when}.` : `${rows.length} appointment${rows.length === 1 ? "" : "s"} ${when}:\n${rows.map((r) => `• ${time.format(new Date(r.time))} — ${r.patient} (${STATUS_LABEL[r.status] ?? r.status})${r.practitioner ? ` · ${r.practitioner}` : ""}`).join("\n")}`;
  }
  if (/\b(today|overview|summary|how (?:is|are)|how many patients|patient count)\b/i.test(text)) {
    const o = (await run("get_clinic_overview")) as Overview;
    const parts = Object.entries(o.byStatus).map(([status, n]) => `${n} ${STATUS_LABEL[status] ?? status}`);
    return `${o.clinic}: ${o.appointmentsToday} appointment${o.appointmentsToday === 1 ? "" : "s"} today${parts.length ? ` (${parts.join(", ")})` : ""}. ${o.patientRecords} patient record${o.patientRecords === 1 ? "" : "s"} on file.`;
  }
  const find = text.match(/^(?:find|search(?: for)?|look up|who is)\s+(.{2,60}?)\??$/i);
  if (find) {
    const result = (await run("search_patients", { query: find[1] })) as { matched: number; patients: { mrn: string; name: string; sex: string | null; age: number | null; phone: string | null }[] };
    return result.matched === 0 ? `No patients match “${find[1]}”.` : `${result.matched} match${result.matched === 1 ? "" : "es"}:\n${result.patients.map((p) => `• ${p.name} (${p.mrn}) — ${[p.sex, p.age !== null ? `${p.age} yrs` : null, p.phone].filter(Boolean).join(", ")}`).join("\n")}`;
  }
  return null;
}
