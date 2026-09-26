"use client";

import type { ReactNode } from "react";
import type { DrawerAction, DrawerPill, DrawerRow } from "@/src/types/console";
import { ConsoleDialog } from "./console-dialog";
import { ConsoleButton } from "./console-button";
import { DrawerHeader } from "./drawer-header";
import { Kicker, Panel } from "./panel";
import { Pill } from "./pill";
import { useToast } from "./toast";

type DetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  pills: DrawerPill[];
  rows: DrawerRow[];
  historyTitle: string;
  /** History list items (activity or visits). */
  history: ReactNode;
  actions: DrawerAction[];
};

/** Side sheet for one record (tenant, patient): pills, key/value details, history and actions. */
export function DetailDrawer({ open, onClose, title, subtitle, pills, rows, historyTitle, history, actions }: DetailDrawerProps) {
  const toast = useToast();

  return (
    <ConsoleDialog open={open} onClose={onClose} label={title}>
      <DrawerHeader title={title} subtitle={subtitle} onClose={onClose} />
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4">
        <div className="flex flex-wrap gap-1.5">
          {pills.map((pill) => (
            <Pill key={pill.label} tone={pill.tone}>
              {pill.label}
            </Pill>
          ))}
        </div>
        <Panel className="flex flex-col gap-2 p-3.5">
          <Kicker>Details</Kicker>
          <dl className="flex flex-col gap-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline gap-2 text-[13px]">
                <dt className="text-console-subtle">{row.label}</dt>
                <span aria-hidden="true" className="flex-1 border-b border-dotted border-console-line" />
                <dd className="font-data">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel className="flex flex-col gap-2 p-3.5">
          <Kicker>{historyTitle}</Kicker>
          <ul className="flex flex-col gap-2">{history}</ul>
        </Panel>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 border-t border-console-line px-4 py-3.5">
        {actions.map((action) => (
          <ConsoleButton key={action.label} variant={action.variant} onClick={() => toast(action.toast)} className="flex-[1_1_7rem]">
            {action.label}
          </ConsoleButton>
        ))}
      </div>
    </ConsoleDialog>
  );
}
