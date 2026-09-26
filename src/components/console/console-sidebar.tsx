"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import type { ConsoleTheme } from "@/src/lib/constants";
import type { ConsoleBrand, ConsoleUser, NavGroup } from "@/src/types/console";
import { ConsoleIcon } from "./console-icon";
import { consoleButtonClass } from "./console-button";

type ConsoleSidebarProps = {
  brand: ConsoleBrand;
  user: ConsoleUser;
  nav: NavGroup[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  theme: ConsoleTheme;
  onToggleTheme: () => void;
  /** Extra control under the brand, e.g. a branch switcher. Desktop only. */
  slot?: ReactNode;
};

export function ConsoleSidebar({ brand, user, nav, collapsed, onToggleCollapsed, theme, onToggleTheme, slot }: ConsoleSidebarProps) {
  const pathname = usePathname();
  const ThemeGlyph = theme === "dark" ? Moon : Sun;
  const themeLabel = theme === "dark" ? "Dark" : "Light";

  return (
    <aside
      className={`flex shrink-0 items-center gap-2 border-b border-console-line bg-console-panel px-2.5 py-2 md:sticky md:top-0 md:h-dvh md:flex-col md:items-stretch md:gap-0 md:border-r md:border-b-0 md:py-3.5 md:transition-[width] md:duration-200 ${
        collapsed ? "md:w-[58px]" : "md:w-[228px]"
      }`}
    >
      <div className="flex shrink-0 items-center gap-2 md:px-1.5 md:pb-2.5">
        <span
          aria-hidden="true"
          className="grid size-[26px] shrink-0 place-items-center rounded-[7px] bg-console-accent font-display text-[13px] font-extrabold text-console-on-accent"
        >
          {brand.initial}
        </span>
        <div className={`min-w-0 flex-col ${collapsed ? "sr-only" : "hidden md:flex"}`}>
          <span className="font-display text-[13.5px] font-extrabold whitespace-nowrap">{brand.name}</span>
          <span className="text-[10px] tracking-widest text-console-subtle uppercase">{brand.kicker}</span>
        </div>
      </div>

      {!collapsed && slot && <div className="hidden md:block">{slot}</div>}

      <nav aria-label={`${brand.name} sections`} className="min-w-0 flex-1 overflow-x-auto md:overflow-x-visible md:overflow-y-auto">
        <div className="flex gap-1 md:block">
          {nav.map((group, index) => (
            <div key={group.label ?? index} className="flex gap-1 md:block">
              {group.label && !collapsed && (
                <p className="hidden px-3 pt-3.5 pb-1.5 text-[10px] tracking-[0.12em] text-console-subtle uppercase md:block">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex min-h-11 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-console-accent md:min-h-9 md:w-full md:flex-row md:justify-start md:gap-2.5 md:text-[13px] ${
                      active
                        ? "bg-console-accent/12 text-console-ink"
                        : "text-console-muted hover:bg-console-ink/6 hover:text-console-ink"
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-console-accent md:inset-x-auto md:inset-y-2 md:left-0 md:h-auto md:w-0.5"
                      />
                    )}
                    <span
                      className={`grid size-[18px] shrink-0 place-items-center rounded ${
                        active ? "bg-console-accent text-console-on-accent" : "bg-console-ink/12"
                      }`}
                    >
                      <ConsoleIcon name={item.icon} className="size-3" />
                    </span>
                    <span className={collapsed ? "sr-only" : "min-w-0 truncate"}>{item.label}</span>
                    {item.badge && !collapsed && (
                      <span className="hidden rounded-full bg-console-danger/15 px-1.5 text-[10px] font-semibold text-console-danger md:ml-auto md:inline">
                        {item.badge}
                        <span className="sr-only"> need attention</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={`Theme: ${themeLabel}. Switch theme`}
        className={consoleButtonClass("secondary", "sm", "w-11 shrink-0 md:hidden")}
      >
        <ThemeGlyph aria-hidden="true" className="size-4" />
      </button>

      <div className="hidden shrink-0 flex-col gap-2 border-t border-console-line pt-2.5 md:flex">
        <div className="flex items-center gap-2 px-1">
          <span
            aria-hidden="true"
            className="grid size-[26px] shrink-0 place-items-center rounded-full bg-console-info text-[11px] font-bold text-console-on-accent"
          >
            {user.initials}
          </span>
          <div className={`min-w-0 flex-col ${collapsed ? "sr-only" : "flex"}`}>
            <span className="truncate text-xs font-semibold">{user.name}</span>
            <span className="text-[10px] text-console-accent">● Live syncing</span>
          </div>
        </div>
        <div className={`flex gap-1.5 ${collapsed ? "flex-col" : ""}`}>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={collapsed ? `Theme: ${themeLabel}. Switch theme` : undefined}
            className={consoleButtonClass("secondary", "sm", "flex-1")}
          >
            <ThemeGlyph aria-hidden="true" className="size-3.5" />
            {!collapsed && themeLabel}
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={consoleButtonClass("secondary", "sm")}
          >
            {collapsed ? <ChevronsRight aria-hidden="true" className="size-3.5" /> : <ChevronsLeft aria-hidden="true" className="size-3.5" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
