"use client";

import { useState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { Kicker, Panel } from "@/src/components/console/panel";
import { useToast } from "@/src/components/console/toast";
import type { CustomField } from "@/src/lib/mock-data/clinix-admin";

const GROUPS: CustomField["appliesTo"][] = ["Patients", "Inventory"];

export function CustomFieldsSettings({ fields: initial }: { fields: CustomField[] }) {
  const toast = useToast();
  const [fields, setFields] = useState(initial);

  function remove(field: CustomField) {
    setFields((current) => current.filter((f) => f.id !== field.id));
    toast(`Removed · ${field.label}`);
  }

  return GROUPS.map((group) => (
    <Panel key={group} className="flex max-w-2xl flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <Kicker>Custom fields — {group}</Kicker>
        <ConsoleButton size="sm" onClick={() => toast("Opening custom field editor")}>
          + Add field
        </ConsoleButton>
      </div>
      <ul className="flex flex-col gap-2.5">
        {fields
          .filter((field) => field.appliesTo === group)
          .map((field) => (
            <li key={field.id} className="flex items-center gap-2.5 border-t border-console-line pt-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{field.label}</p>
                <p className="font-data text-[11px] text-console-subtle">
                  {field.type} · applies to {field.appliesTo}
                </p>
              </div>
              <ConsoleButton size="sm" onClick={() => remove(field)} aria-label={`Remove ${field.label}`}>
                Remove
              </ConsoleButton>
            </li>
          ))}
      </ul>
    </Panel>
  ));
}
