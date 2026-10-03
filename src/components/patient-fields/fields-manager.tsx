import { ArchiveButton } from "@/src/components/console/archive-button";
import { RowActions, TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Kicker, Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { setFieldArchivedAction } from "@/src/server/actions/patient-fields";
import { canManageField } from "@/src/server/services/patient-fields";
import type { StaffClinic } from "@/src/server/services/clinic-app";
import { BUILT_IN_FIELDS, FIELD_TYPE_LABELS, MAX_ACTIVE_FIELDS, type FieldDefinition } from "@/src/lib/patient-fields";
import { CopyFromBranch, MoveButtons, SuggestionPicker } from "./field-controls";
import { FieldDialog } from "./field-dialog";

type Props = {
  actor: Pick<StaffClinic, "role" | "staffId">;
  fields: FieldDefinition[];
  /** Owner only: suggestions not yet added, and other owned branches to copy from. */
  suggestions?: { label: string; detail: string; medical: boolean }[];
  branches?: { id: string; name: string }[];
  specialtyLabel?: string;
};

function FieldTable({ label, rows, actor, sections, reorder }: { label: string; rows: FieldDefinition[]; actor: Props["actor"]; sections: string[]; reorder: boolean }) {
  return (
    <TableCard label={label}>
      <thead>
        <tr><Th>Field</Th><Th>Type</Th><Th>Section</Th><Th>Flags</Th><Th className="w-64"><span className="sr-only">Actions</span></Th></tr>
      </thead>
      <tbody>
        {rows.map((field, index) => {
          const manage = canManageField(actor, field);
          return (
            <Tr key={field.id}>
              <Td className="font-semibold">
                {field.label}
                {field.scope === "addon" && field.createdByName && <span className="block text-[11px] font-normal text-console-muted">Add-on by {field.createdByName}</span>}
              </Td>
              <Td className="text-console-muted">{FIELD_TYPE_LABELS[field.type]}{field.options.length ? ` · ${field.options.length} choices` : ""}</Td>
              <Td className="text-console-muted">{field.section}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {field.required && <Pill tone="info">Required</Pill>}
                  {field.medical && <Pill tone="warn">Medical</Pill>}
                  {field.archived && <Pill tone="neutral">Retired</Pill>}
                </div>
              </Td>
              <Td>
                <RowActions>
                  {manage ? (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {reorder && !field.archived && <MoveButtons id={field.id} label={field.label} first={index === 0} last={index === rows.length - 1} />}
                      {!field.archived && <FieldDialog field={field} sections={sections} addon={field.scope === "addon"} />}
                      <ArchiveButton id={field.id} name={field.label} noun="field" action={setFieldArchivedAction} archived={field.archived} consequence="It disappears from patient forms. Every answer already saved is kept and comes back if you restore it." />
                    </div>
                  ) : (
                    <span className="text-[11px] text-console-subtle">Managed by the owner</span>
                  )}
                </RowActions>
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </TableCard>
  );
}

/** The patient-fields tab: built-ins (read-only), the clinic's standard fields, practitioners' add-ons, retired fields. */
export function FieldsManager({ actor, fields, suggestions, branches, specialtyLabel }: Props) {
  const active = fields.filter((field) => !field.archived);
  const standard = active.filter((field) => field.scope === "standard");
  const addons = active.filter((field) => field.scope === "addon");
  const retired = fields.filter((field) => field.archived && (actor.role === "owner" || canManageField(actor, field)));
  const sections = [...new Set(fields.map((field) => field.section))];
  const isOwner = actor.role === "owner";

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader title="Built-in fields">
          <span className="text-[11px] text-console-muted">Every clinic has these. They can&rsquo;t be changed here.</span>
        </PanelHeader>
        <ul className="grid gap-x-6 px-3.5 py-2 sm:grid-cols-2">
          {BUILT_IN_FIELDS.map((field) => (
            <li key={field.label} className="border-b border-console-line py-2 text-[13px] last:border-0">
              <span className="font-semibold">{field.label}</span>
              <span className="block text-[11px] text-console-muted">{field.why}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-extrabold">{isOwner ? "Your clinic's fields" : "The clinic's fields"}</h2>
          <p className="text-[13px] text-console-muted">
            {isOwner ? `${active.length} of ${MAX_ACTIVE_FIELDS} active. Retiring a field keeps every answer already saved.` : "Set by the owner. You can add your own add-on fields below."}
          </p>
        </div>
        {isOwner && <FieldDialog sections={sections} />}
      </div>
      {standard.length === 0 ? (
        <Panel className="px-4 py-6 text-center text-[13px] text-console-muted">{isOwner ? "No fields yet. Add your own, or start from the suggestions below." : "The owner hasn't added fields yet."}</Panel>
      ) : (
        <FieldTable label="Standard fields" rows={standard} actor={actor} sections={sections} reorder={isOwner} />
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-extrabold">Practitioner add-ons</h2>
          <p className="text-[13px] text-console-muted">Extra fields practitioners add for their own work. Each practitioner manages their own; the owner can manage all.</p>
        </div>
        {actor.role === "practitioner" && <FieldDialog sections={sections} addon />}
      </div>
      {addons.length === 0 ? (
        <Panel className="px-4 py-6 text-center text-[13px] text-console-muted">No add-ons yet.</Panel>
      ) : (
        <FieldTable label="Practitioner add-ons" rows={addons} actor={actor} sections={sections} reorder={false} />
      )}

      {isOwner && suggestions && (
        <Panel className="flex flex-col gap-3 p-4">
          <div>
            <Kicker>Suggestions{specialtyLabel ? ` for ${specialtyLabel} clinics` : ""}</Kicker>
            <p className="mt-1 text-[13px] text-console-muted">Starting points. Once added they&rsquo;re your own fields: rename, change or retire them any time.</p>
          </div>
          <SuggestionPicker suggestions={suggestions} />
        </Panel>
      )}

      {isOwner && branches && branches.length > 0 && (
        <Panel className="flex flex-col gap-3 p-4">
          <div>
            <Kicker>Use another branch as a template</Kicker>
            <p className="mt-1 text-[13px] text-console-muted">Copies that branch&rsquo;s standard fields here. Each branch keeps its own list afterwards.</p>
          </div>
          <CopyFromBranch branches={branches} />
        </Panel>
      )}

      {retired.length > 0 && (
        <>
          <div>
            <h2 className="font-display text-base font-extrabold">Retired fields</h2>
            <p className="text-[13px] text-console-muted">Hidden from forms. Saved answers stay on each chart, read-only, and return if you restore the field.</p>
          </div>
          <FieldTable label="Retired fields" rows={retired} actor={actor} sections={sections} reorder={false} />
        </>
      )}
    </div>
  );
}
