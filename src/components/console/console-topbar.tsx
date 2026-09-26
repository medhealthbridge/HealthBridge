"use client";

import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import type { ConsoleNotification, NavGroup, QuickAction } from "@/src/types/console";
import { CommandPalette } from "./command-palette";
import { ConsoleButton } from "./console-button";
import { NotificationsDrawer } from "./notifications-drawer";
import { QuickActionsMenu } from "./quick-actions-menu";

type ConsoleTopbarProps = {
  nav: NavGroup[];
  searchPlaceholder: string;
  quickActions: QuickAction[];
  notifications: ConsoleNotification[];
};

export function ConsoleTopbar({ nav, searchPlaceholder, quickActions, notifications }: ConsoleTopbarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex shrink-0 items-center gap-2.5 border-b border-console-line bg-console-canvas/90 px-3 py-2.5 backdrop-blur-md md:px-5 md:py-3">
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg border border-console-line bg-console-canvas px-3 text-left text-[13px] text-console-subtle transition-colors duration-150 hover:border-console-accent/50 focus-visible:outline-2 focus-visible:outline-console-accent md:min-h-9"
      >
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{searchPlaceholder}</span>
        <kbd className="hidden shrink-0 rounded-[5px] border border-console-line px-1.5 font-data text-[10px] sm:inline">⌘K</kbd>
      </button>
      <QuickActionsMenu actions={quickActions} />
      <ConsoleButton
        onClick={() => setNotificationsOpen(true)}
        aria-label={`Notifications, ${notifications.length} new`}
        className="shrink-0"
      >
        <Bell aria-hidden="true" className="size-4" />
        <span className="rounded-full bg-console-danger/15 px-1.5 text-[10px] font-semibold text-console-danger">{notifications.length}</span>
      </ConsoleButton>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} nav={nav} />
      <NotificationsDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} notifications={notifications} />
    </header>
  );
}
