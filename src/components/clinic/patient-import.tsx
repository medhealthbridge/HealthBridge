"use client";

import { useActionState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { Panel } from "@/src/components/console/panel";
import { importPatientsAction, type ImportState } from "@/src/server/actions/patient-import";

const INITIAL: ImportState = {};

/** Pick a CSV, preview what would be added, then import. The same file is re-read on import, so nothing is trusted from the preview. */
export function PatientImport() {
  const [state, action, pending] = useActionState(importPatientsAction, INITIAL);
  return (
    <Panel className="flex flex-col gap-3 p-4">
      <div>
        <h2 className="font-display text-base font-extrabold">Import patients</h2>
        <p className="text-xs text-console-muted">CSV with first_name, last_name, sex (F or M), and optionally birth_date (YYYY-MM-DD), mobile, philhealth_pin, osca_id, pwd_id. Add a column named exactly like one of your patient fields to fill it (separate pick-several answers with ;). Up to 500 rows. <a href="/api/clinic/import-template" className="font-semibold text-console-accent underline">Download the template</a>.</p>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <input type="file" name="file" accept=".csv,text/csv" required aria-label="Patients CSV file" className="text-[13px] file:mr-3 file:min-h-9 file:rounded-lg file:border file:border-console-line file:bg-console-panel file:px-3 file:text-[13px]" />
        {state.preview && (
          <div role="status" className="rounded-lg bg-console-hover/60 p-3 text-[13px]">
            <p><strong>{state.preview.ready}</strong> ready to add{state.preview.problemCount > 0 && <>, <strong>{state.preview.problemCount}</strong> with problems (these will be skipped)</>}.</p>
            {state.preview.customColumns.length > 0 && <p className="mt-1 text-console-muted">Your own fields found: {state.preview.customColumns.join(", ")}.</p>}
            {state.preview.ignoredColumns.length > 0 && <p className="mt-1 text-console-warn">Not recognised, left out: {state.preview.ignoredColumns.join(", ")}. Check the spelling against your field names.</p>}
            {state.preview.problems.length > 0 && (
              <ul className="mt-1.5 list-disc pl-5 text-console-muted">
                {state.preview.problems.map((problem) => <li key={problem.line}>Line {problem.line}: {problem.errors.join(" ")}</li>)}
              </ul>
            )}
          </div>
        )}
        {state.preview && state.preview.ready > 0 && (
          <label className="flex items-start gap-2.5 text-xs">
            <input type="checkbox" name="consent" className="mt-0.5 size-4 shrink-0 accent-[var(--color-console-accent)]" />
            <span>These patients agreed to the clinic&rsquo;s data privacy notice (RA 10173).</span>
          </label>
        )}
        {state.imported !== undefined && <p role="status" className="text-[13px] font-semibold">Added {state.imported} {state.imported === 1 ? "patient" : "patients"}{state.skipped ? `, skipped ${state.skipped}` : ""}.</p>}
        {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
        <div className="flex flex-wrap gap-2">
          <ConsoleButton type="submit" name="intent" value="preview" disabled={pending}>{pending ? "Checking…" : "Preview"}</ConsoleButton>
          {state.preview && state.preview.ready > 0 && <ConsoleButton type="submit" name="intent" value="import" variant="primary" disabled={pending}>Import {state.preview.ready}</ConsoleButton>}
        </div>
      </form>
    </Panel>
  );
}
