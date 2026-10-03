import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { displayFieldValue, type FieldDefinition } from "@/src/lib/patient-fields";
import { PatientFieldsDialog } from "./patient-fields-dialog";

export type PatientFieldsData = { fields: FieldDefinition[]; values: Record<string, unknown>; canEdit: boolean };

/** The clinic's own fields on a chart, by section. Retired fields with answers stay visible, read-only. */
export function PatientFieldsPanel({ patientId, data }: { patientId: string; data: PatientFieldsData }) {
  const active = data.fields.filter((field) => !field.archived);
  const retired = data.fields.filter((field) => field.archived && displayFieldValue(field.type, data.values[field.key]) !== "");
  if (active.length === 0 && retired.length === 0) return null;
  const missing = active.filter((field) => field.required && displayFieldValue(field.type, data.values[field.key]) === "").length;
  const sections = [...new Set(active.map((field) => field.section))];

  return (
    <Panel>
      <PanelHeader title="More details">
        <div className="flex items-center gap-2">
          {missing > 0 && <Pill tone="warn">{missing} required missing</Pill>}
          {data.canEdit && active.length > 0 && <PatientFieldsDialog patientId={patientId} fields={active} values={data.values} />}
        </div>
      </PanelHeader>
      <div className="flex flex-col gap-3 px-3.5 py-2">
        {sections.map((section) => (
          <div key={section}>
            <p className="pt-1 text-[10px] font-semibold tracking-widest text-console-subtle uppercase">{section}</p>
            <dl>
              {active.filter((field) => field.section === section).map((field) => {
                const shown = displayFieldValue(field.type, data.values[field.key]);
                return (
                  <div key={field.key} className="flex justify-between gap-4 border-b border-console-line py-2 text-[13px] last:border-0">
                    <dt className="text-console-muted">{field.label}{field.medical && <span className="text-console-subtle"> · medical</span>}</dt>
                    <dd className={`text-right font-medium ${shown ? "" : field.required ? "text-console-warn" : "text-console-subtle"}`}>{shown || (field.required ? "Missing" : "—")}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
        {retired.length > 0 && (
          <details className="pb-2 text-[13px]">
            <summary className="cursor-pointer py-1 text-xs font-semibold text-console-muted">Retired fields ({retired.length})</summary>
            <dl>
              {retired.map((field) => (
                <div key={field.key} className="flex justify-between gap-4 border-b border-console-line py-2 last:border-0">
                  <dt className="text-console-muted">{field.label}</dt>
                  <dd className="text-right">{displayFieldValue(field.type, data.values[field.key])}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
    </Panel>
  );
}
