"use client";

import { SERVICES } from "@/src/lib/mock-data/clinix-app";
import { formatPeso } from "@/src/lib/utils";
import type { BranchKey, Service } from "@/src/types/clinix-app";
import { BottomSheet, SheetHeader } from "./bottom-sheet";

type PosAddServiceSheetProps = {
  open: boolean;
  branch: BranchKey;
  onAdd: (service: Service) => void;
  onClose: () => void;
};

/** Picks from the clinic's price list. The list itself is edited in the console. */
export function PosAddServiceSheet({ open, branch, onAdd, onClose }: PosAddServiceSheetProps) {
  return (
    <BottomSheet open={open} title="Add service" onClose={onClose}>
      <SheetHeader title="Add service" onClose={onClose} />
      <ul className="flex flex-col gap-2">
        {SERVICES[branch].map((service) => (
          <li key={service.name}>
            <button
              type="button"
              onClick={() => onAdd(service)}
              className="flex min-h-11 w-full cursor-pointer items-baseline gap-2.5 rounded-xl bg-white p-3 text-left transition-colors duration-150 hover:bg-brand/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[13.5px] font-extrabold text-slate-900">{service.name}</span>
                <span className="block truncate text-[10.5px] text-slate-500">{service.meta}</span>
              </span>
              <span className="shrink-0 font-data tabular-nums text-slate-900">{formatPeso(service.price)}</span>
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
