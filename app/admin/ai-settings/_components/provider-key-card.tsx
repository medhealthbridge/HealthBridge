"use client";

import { useActionState, useRef } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { removeKeyAction, saveKeyAction, type SaveKeyState } from "@/src/server/actions/ai-settings";
import type { SecretKey } from "@/src/server/db/schema";
import type { SecretStatus } from "@/src/server/services/platform-secrets";

const dateFormat = new Intl.DateTimeFormat("en-PH", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Manila" });

export function ProviderKeyCard({ name, title, help, status }: { name: SecretKey; title: string; help: string; status: SecretStatus }) {
  const [state, action, pending] = useActionState(saveKeyAction, {} as SaveKeyState);
  const form = useRef<HTMLFormElement>(null);
  const error = state.fieldErrors?.key?.[0];
  const inputId = `key-${name}`;

  return (
    <Panel>
      <PanelHeader title={title}>
        {status.source === "admin" && <Pill tone="accent">Saved · …{status.last4}</Pill>}
        {status.source === "env" && <Pill tone="info">Set in the environment</Pill>}
        {status.source === "none" && <Pill>Not set</Pill>}
      </PanelHeader>
      <div className="flex flex-col gap-3 px-3.5 py-3">
        <p className="text-xs text-console-muted">{help}</p>
        {status.updatedAt && <p className="text-[11px] text-console-subtle">Last changed {dateFormat.format(status.updatedAt)}</p>}
        <form
          ref={form}
          action={async (data) => {
            action(data);
            form.current?.reset();
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="name" value={name} />
          <div className="min-w-0 flex-1">
            <FormField id={inputId} label={status.source === "admin" ? "Replace key" : "Paste key"} error={error}>
              <input
                id={inputId}
                name="key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-error` : undefined}
                className={`${CONSOLE_INPUT} w-full font-data`}
              />
            </FormField>
          </div>
          <ConsoleButton type="submit" variant="primary" disabled={pending}>
            {pending ? "Checking…" : "Save key"}
          </ConsoleButton>
        </form>
        {state.saved && <p role="status" className="text-xs text-console-accent">{state.saved}</p>}
        {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
        {status.source === "admin" && (
          <form action={removeKeyAction}>
            <input type="hidden" name="name" value={name} />
            <ConsoleButton type="submit" variant="danger" size="sm">Remove saved key</ConsoleButton>
          </form>
        )}
      </div>
    </Panel>
  );
}
