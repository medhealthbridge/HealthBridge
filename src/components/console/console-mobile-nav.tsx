"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Ellipsis, LogOut, Moon, Sun } from "lucide-react";
import type { ConsoleTheme } from "@/src/lib/constants";
import type { ConsoleUser, NavGroup, NavItem } from "@/src/types/console";
import { SignOutButton } from "@/src/components/sign-out-button";
import { consoleButtonClass } from "./console-button";
import { ConsoleDialog } from "./console-dialog";
import { ConsoleIcon } from "./console-icon";

/** Bottom-bar slots before "More"; four keeps every label readable on a 360px phone. */
const PRIMARY_COUNT = 4;

type ConsoleMobileNavProps = {
  nav: NavGroup[];
  user: ConsoleUser;
  theme: ConsoleTheme;
  onToggleTheme: () => void;
  /** Console-specific control (branch switcher), shown at the top of the sheet. */
  slot?: ReactNode;
};

/** The longest matching href wins, so "Overview" at /admin isn't lit up on every sub-page. */
function activeHref(items: NavItem[], pathname: string) {
  const matches = items.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** Phone navigation: a floating bar at the thumb's reach, with the rest behind "More". Hidden from md up. */
export function ConsoleMobileNav({ nav, user, theme, onToggleTheme, slot }: ConsoleMobileNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = nav.flatMap((group) => group.items);
  const primary = items.slice(0, PRIMARY_COUNT);
  const active = activeHref(items, pathname);
  const overflowActive = items.slice(PRIMARY_COUNT).some((item) => item.href === active);
  const ThemeGlyph = theme === "dark" ? Moon : Sun;

  const tab = "relative flex min-h-14 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-console-accent";

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex gap-1 rounded-[28px] border border-console-line bg-console-panel/90 p-1.5 shadow-lg shadow-black/20 backdrop-blur-md md:hidden"
      >
        {primary.map((item) => {
          const current = item.href === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={`${tab} ${current ? "bg-console-accent/15 text-console-accent" : "text-console-muted active:bg-console-ink/6"}`}
            >
              <ConsoleIcon name={item.icon} className="size-5" />
              <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={`${tab} ${overflowActive ? "bg-console-accent/15 text-console-accent" : "text-console-muted active:bg-console-ink/6"}`}
        >
          <Ellipsis aria-hidden="true" className="size-5" />
          <span>More</span>
        </button>
      </nav>

      <ConsoleDialog open={moreOpen} onClose={() => setMoreOpen(false)} label="More" placement="bottom">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 pb-2">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-console-info text-xs font-bold text-console-on-accent">
              {user.initials}
            </span>
            <span className="min-w-0 truncate text-sm font-semibold">{user.name}</span>
          </div>
          {slot}
          {nav.map((group, index) => {
            const rest = group.items.filter((item) => !primary.includes(item));
            if (rest.length === 0) return null;
            return (
              <div key={group.label ?? index} className="flex flex-col gap-1">
                {group.label && <p className="px-1 text-[10px] tracking-[0.12em] text-console-subtle uppercase">{group.label}</p>}
                {rest.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={item.href === active ? "page" : undefined}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm focus-visible:outline-2 focus-visible:outline-console-accent ${
                      item.href === active ? "bg-console-accent/12 text-console-ink" : "text-console-muted active:bg-console-ink/6"
                    }`}
                  >
                    <ConsoleIcon name={item.icon} className="size-4" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge && <span className="rounded-full bg-console-danger/15 px-1.5 text-[10px] font-semibold text-console-danger">{item.badge}</span>}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
        {/* Outside the scrolling list so theme and log out never slide out of reach. */}
        <div className="flex shrink-0 gap-2 border-t border-console-line bg-console-panel p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={onToggleTheme} className={consoleButtonClass("secondary", "md", "flex-1")}>
            <ThemeGlyph aria-hidden="true" className="size-4" />
            {theme === "dark" ? "Dark" : "Light"}
          </button>
          <SignOutButton className={consoleButtonClass("secondary", "md", "flex-1")}>
            <LogOut aria-hidden="true" className="size-4" />
            Log out
          </SignOutButton>
        </div>
      </ConsoleDialog>
    </>
  );
}
