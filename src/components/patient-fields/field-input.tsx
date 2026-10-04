"use client";

import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import type { FieldDefinition } from "@/src/lib/patient-fields";

/** One input for a clinic-defined patient field, named `cf.<key>` so a form action can read it back. */
export function FieldInput({ field, value }: { field: FieldDefinition; value: unknown }) {
  const name = `cf.${field.key}`;
  const id = `cf-${field.key}`;
  const text = value === null || value === undefined ? "" : String(value);
  switch (field.type) {
    case "long_text":
      return <textarea id={id} name={name} rows={3} maxLength={2000} defaultValue={text} className={CONSOLE_INPUT} />;
    case "number":
      return <input id={id} name={name} inputMode="decimal" defaultValue={text} className={CONSOLE_INPUT} />;
    case "date":
      return <input id={id} name={name} type="date" defaultValue={text} className={CONSOLE_INPUT} />;
    case "yes_no":
      return (
        <select id={id} name={name} defaultValue={value === true ? "yes" : value === false ? "no" : ""} className={CONSOLE_INPUT}>
          <option value="">Not answered</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      );
    case "select": {
      // A choice the owner has since removed stays selectable for this patient, so saving doesn't wipe it.
      const options = text && !field.options.includes(text) ? [...field.options, text] : field.options;
      return (
        <select id={id} name={name} defaultValue={text} className={CONSOLE_INPUT}>
          <option value="">Not answered</option>
          {options.map((option) => <option key={option} value={option}>{field.options.includes(option) ? option : `${option} (retired choice)`}</option>)}
        </select>
      );
    }
    case "multi_select": {
      const chosen = Array.isArray(value) ? value.map(String) : [];
      const options = [...field.options, ...chosen.filter((item) => !field.options.includes(item))];
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <label key={option} className="flex min-h-9 items-center gap-1.5 rounded-lg border border-console-line px-2.5 text-[13px]">
              <input type="checkbox" name={name} value={option} defaultChecked={chosen.includes(option)} className="size-4 accent-[var(--color-console-accent)]" />
              {field.options.includes(option) ? option : `${option} (retired choice)`}
            </label>
          ))}
        </div>
      );
    }
    default:
      return <input id={id} name={name} maxLength={200} defaultValue={text} className={CONSOLE_INPUT} />;
  }
}
