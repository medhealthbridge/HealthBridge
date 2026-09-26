"use client";

import { useState, type ReactNode } from "react";
import { CONSOLE_THEME_COOKIE, type ConsoleTheme } from "@/src/lib/constants";
import type { ConsoleBrand, ConsoleNotification, ConsoleUser, NavGroup, QuickAction } from "@/src/types/console";
import { ConsoleSidebar } from "./console-sidebar";
import { ConsoleTopbar } from "./console-topbar";
import { ToastProvider } from "./toast";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type ConsoleShellProps = {
  initialTheme: ConsoleTheme;
  brand: ConsoleBrand;
  user: ConsoleUser;
  nav: NavGroup[];
  searchPlaceholder: string;
  quickActions: QuickAction[];
  notifications: ConsoleNotification[];
  sidebarSlot?: ReactNode;
  children: ReactNode;
};

/** Frame shared by the company admin and the clinic owner console. Pages render inside as server components. */
export function ConsoleShell({ initialTheme, brand, user, nav, searchPlaceholder, quickActions, notifications, sidebarSlot, children }: ConsoleShellProps) {
  const [theme, setTheme] = useState(initialTheme);
  const [collapsed, setCollapsed] = useState(false);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    // Read by the layout on the next request so the server renders the right theme.
    document.cookie = `${CONSOLE_THEME_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  }

  return (
    <div className={`${theme === "dark" ? "dark" : ""} flex min-h-dvh flex-1 flex-col bg-console-canvas font-text text-console-ink [color-scheme:light] md:flex-row dark:[color-scheme:dark]`}>
      <ToastProvider>
        <ConsoleSidebar
          brand={brand}
          user={user}
          nav={nav}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(!collapsed)}
          theme={theme}
          onToggleTheme={toggleTheme}
          slot={sidebarSlot}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <ConsoleTopbar nav={nav} searchPlaceholder={searchPlaceholder} quickActions={quickActions} notifications={notifications} />
          <main className="flex min-w-0 flex-1 flex-col gap-4 px-3 pt-3.5 pb-10 md:px-5 md:pt-[18px] md:pb-11">{children}</main>
        </div>
      </ToastProvider>
    </div>
  );
}
