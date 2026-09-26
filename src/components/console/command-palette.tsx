"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NavGroup } from "@/src/types/console";
import { ConsoleDialog } from "./console-dialog";
import { ConsoleIcon } from "./console-icon";

type CommandPaletteProps = { open: boolean; onClose: () => void; nav: NavGroup[] };

export function CommandPalette({ open, onClose, nav }: CommandPaletteProps) {
  return (
    <ConsoleDialog open={open} onClose={onClose} label="Command palette" placement="top">
      <PaletteBody nav={nav} onClose={onClose} />
    </ConsoleDialog>
  );
}

/** Mounted only while open, so the query resets on every open. */
function PaletteBody({ nav, onClose }: { nav: NavGroup[]; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const results = nav
    .flatMap((group) => group.items)
    .filter((item) => !needle || item.label.toLowerCase().includes(needle));

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (results[0]) go(results[0].href);
      }}
    >
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search or run a command…"
        aria-label="Search or run a command"
        className="w-full border-b border-console-line bg-transparent px-4 py-3.5 text-base text-console-ink placeholder:text-console-subtle focus-visible:outline-none"
      />
      <ul className="max-h-80 overflow-y-auto p-1.5">
        {results.map((item) => (
          <li key={item.href}>
            <button
              type="button"
              onClick={() => go(item.href)}
              className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3.5 text-left text-[13px] text-console-muted transition-colors duration-150 hover:bg-console-accent/10 hover:text-console-ink focus-visible:bg-console-accent/10 focus-visible:text-console-ink focus-visible:outline-none"
            >
              <ConsoleIcon name={item.icon} className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">Go to {item.label}</span>
              <span className="font-data text-[10px] text-console-subtle">Nav</span>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="px-3.5 py-3 text-[13px] text-console-subtle">No matches.</li>}
      </ul>
    </form>
  );
}
