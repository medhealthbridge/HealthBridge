"use client";

import { ChevronDown } from "lucide-react";

type PhoneTopbarProps = { name: string; url: string; shortLabel: string; onOpenSwitcher: () => void };

/** Status line plus the clinic (subdomain) the app is currently pointed at. */
export function PhoneTopbar({ name, url, shortLabel, onOpenSwitcher }: PhoneTopbarProps) {
  return (
    <header className="shrink-0 border-b-2 border-slate-200 bg-slate-50">
      <div className="flex justify-between px-4 pt-2 pb-0.5 text-[10px] tracking-wide text-slate-500">
        <span>9:41</span>
        <span>{shortLabel} · LTE</span>
      </div>
      <button
        type="button"
        onClick={onOpenSwitcher}
        className="flex w-full cursor-pointer items-center gap-2.5 px-4 pt-1.5 pb-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
      >
        <span className="grid size-6.5 shrink-0 place-items-center rounded-md bg-brand font-display text-[13px] font-extrabold text-white">
          C
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-[15px] leading-tight font-extrabold text-slate-900">{name}</span>
          <span className="truncate text-[10.5px] text-slate-500">{url}</span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[10px] font-semibold tracking-wider text-brand uppercase">
          Switch
          <ChevronDown aria-hidden="true" className="size-3.5" />
        </span>
      </button>
    </header>
  );
}
