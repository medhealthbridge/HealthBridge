"use client";

import { Check, LogOut } from "lucide-react";
import { SignOutButton } from "@/src/components/sign-out-button";
import { BRANCHES, CLINIX_APP_ACCOUNT, HQ_PORTAL_NAME, HQ_PORTAL_URL } from "@/src/lib/mock-data/clinix-app";
import type { PortalKey } from "@/src/types/clinix-app";
import { Kicker } from "./kicker";
import { Pill } from "./pill";

type ClinicSwitcherSheetProps = {
  open: boolean;
  active: PortalKey;
  /** Only the owner has an HQ portal to switch into. */
  includeHq: boolean;
  onPick: (key: PortalKey) => void;
  onClose: () => void;
};

export function ClinicSwitcherSheet({ open, active, includeHq, onPick, onClose }: ClinicSwitcherSheetProps) {
  if (!open) return null;

  const options: { key: PortalKey; name: string; url: string; specialty: string }[] = [
    ...(includeHq ? [{ key: "hq" as const, name: HQ_PORTAL_NAME, url: HQ_PORTAL_URL, specialty: "HQ" }] : []),
    ...BRANCHES.map((branch) => ({ key: branch.key, name: branch.name, url: branch.url, specialty: branch.specialty })),
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Switch clinic" className="absolute inset-0 z-40 bg-slate-900/45">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-pointer" />
      <div className="relative rounded-b-2xl bg-slate-50 p-4 shadow-xl">
        <Kicker className="mb-2.5 block">Account · {CLINIX_APP_ACCOUNT}</Kicker>
        <ul>
          {options.map((option) => (
            <li key={option.key}>
              <button
                type="button"
                onClick={() => onPick(option.key)}
                className="flex w-full cursor-pointer items-center gap-2.5 border-t border-slate-200 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-display text-sm font-extrabold text-slate-900">{option.name}</span>
                  <span className="truncate text-[10.5px] text-slate-500">{option.url}</span>
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-2">
                  <Pill tone="neutral">{option.specialty}</Pill>
                  <span className="grid w-4 place-items-center">
                    {option.key === active ? <Check aria-label="Current" className="size-3.5 text-brand" /> : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <SignOutButton className="flex min-h-11 w-full cursor-pointer items-center gap-2 border-t border-slate-200 pt-2.5 text-left text-[13px] font-semibold text-slate-700 transition-colors duration-150 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand">
          <LogOut aria-hidden="true" className="size-4 text-brand" />
          Log out
        </SignOutButton>
      </div>
    </div>
  );
}
