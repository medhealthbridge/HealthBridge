"use client";

import type { ConsoleNotification } from "@/src/types/console";
import { ConsoleDialog } from "./console-dialog";
import { DrawerHeader } from "./drawer-header";
import { Pill } from "./pill";

type NotificationsDrawerProps = { open: boolean; onClose: () => void; notifications: ConsoleNotification[] };

export function NotificationsDrawer({ open, onClose, notifications }: NotificationsDrawerProps) {
  return (
    <ConsoleDialog open={open} onClose={onClose} label="Notifications" className="md:w-[370px]">
      <DrawerHeader title="Notifications" onClose={onClose} />
      <ul className="flex-1 overflow-y-auto">
        {notifications.map((item) => (
          <li key={item.title} className="flex items-start gap-2.5 border-b border-console-line px-4 py-3.5">
            <Pill tone={item.tone}>{item.kind}</Pill>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">{item.title}</p>
              <p className="mt-0.5 text-xs leading-normal text-console-muted">{item.body}</p>
              <p className="mt-1 font-data text-[10px] text-console-subtle">{item.when}</p>
            </div>
          </li>
        ))}
      </ul>
    </ConsoleDialog>
  );
}
