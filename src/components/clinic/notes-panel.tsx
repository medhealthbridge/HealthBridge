import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import type { ClinicalNote } from "@/src/server/services/clinical-notes";
import { NoteDialog } from "./note-dialog";
import { VoidNoteButton } from "./void-note-button";

const dateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });
const SECTION_LABEL = { subjective: "Subjective", objective: "Objective", assessment: "Assessment", plan: "Plan" } as const;

/** A patient's visit notes. Doctors (owner, practitioner) write; everyone shown this panel can read. */
export function NotesPanel({ notes, patientId, canWrite }: { notes: ClinicalNote[]; patientId: string; canWrite: boolean }) {
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader title="Clinical notes">{canWrite && <NoteDialog mode="new" patientId={patientId} />}</PanelHeader>
      {notes.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-[13px] text-console-muted">No notes yet.</p>
      ) : (
        <ul className="divide-y divide-console-line">
          {notes.map((note) => {
            const seed = { subjective: note.subjective, objective: note.objective, assessment: note.assessment, plan: note.plan };
            return (
              <li key={note.id} className={`flex flex-col gap-2 px-3.5 py-3 ${note.voidedAt ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-console-subtle">
                  <span className="font-semibold text-console-ink">{note.authorName}</span>
                  <span>{dateTime.format(note.createdAt)}</span>
                  {note.amendsNoteId && <Pill tone="info">Amendment</Pill>}
                  {note.voidedAt && <Pill tone="danger">Voided</Pill>}
                </div>
                {note.voidedAt ? (
                  <p className="text-[13px] text-console-muted">Voided: {note.voidReason}</p>
                ) : (
                  <dl className="grid gap-1.5 text-[13px]">
                    {(Object.keys(SECTION_LABEL) as (keyof typeof SECTION_LABEL)[]).filter((key) => note[key]).map((key) => (
                      <div key={key}>
                        <dt className="text-[10px] tracking-widest text-console-subtle uppercase">{SECTION_LABEL[key]}</dt>
                        <dd className="whitespace-pre-wrap">{note[key]}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {canWrite && note.authoredByMe && !note.voidedAt && (
                  <div className="flex flex-wrap gap-1.5">
                    {note.editable ? <NoteDialog mode="edit" noteId={note.id} seed={seed} /> : <NoteDialog mode="amend" patientId={patientId} amendsNoteId={note.id} seed={seed} />}
                    <VoidNoteButton noteId={note.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
