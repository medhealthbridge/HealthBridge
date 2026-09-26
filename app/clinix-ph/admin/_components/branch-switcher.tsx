"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { consoleButtonClass } from "@/src/components/console/console-button";
import { BRANCHES } from "@/src/lib/mock-data/clinix-admin";
import { useActiveBranch } from "./branch-context";

export function BranchSwitcher() {
  const { branch, setBranchKey } = useActiveBranch();
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <div className="mb-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Branch: ${branch.name}. Change branch`}
        onClick={() => setOpen(!open)}
        className={consoleButtonClass("secondary", "md", "w-full justify-between bg-console-canvas")}
      >
        <span className="min-w-0 truncate">{branch.name}</span>
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-console-subtle transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul id={listId} className="mt-1 rounded-xl border border-console-line bg-console-canvas p-1">
          {BRANCHES.map((option) => {
            const current = option.key === branch.key;
            return (
              <li key={option.key}>
                <button
                  type="button"
                  aria-current={current ? "true" : undefined}
                  onClick={() => {
                    setBranchKey(option.key);
                    setOpen(false);
                  }}
                  className={`flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-xs transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-console-accent ${
                    current ? "bg-console-accent/12 text-console-ink" : "text-console-muted hover:bg-console-ink/6 hover:text-console-ink"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-[18px] shrink-0 place-items-center rounded font-data text-[9px] ${current ? "bg-console-accent text-console-on-accent" : "bg-console-ink/12"}`}
                  >
                    {option.initial}
                  </span>
                  <span className="min-w-0 truncate">{option.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
