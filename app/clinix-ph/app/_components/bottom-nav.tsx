"use client";

import { TAB_DEFS, type AppTab } from "../_data";
import { TabIcon } from "./tab-icon";

type BottomNavProps = { tabs: readonly AppTab[]; active: AppTab; onSelect: (tab: AppTab) => void };

export function BottomNav({ tabs, active, onSelect }: BottomNavProps) {
  return (
    <nav
      aria-label="App sections"
      className="shrink-0 border-t border-slate-200 bg-slate-50 px-2.5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      <ul className="flex gap-1 rounded-[18px] bg-white p-1.5">
        {tabs.map((tab) => {
          const def = TAB_DEFS[tab];
          const isActive = tab === active;

          return (
            <li key={tab} className="flex min-w-0 flex-1">
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(tab)}
                className={`flex min-h-11 w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 py-1.5 text-[10px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${
                  isActive ? "bg-brand/10 text-brand" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <TabIcon name={def.icon} />
                <span className="truncate">{def.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
