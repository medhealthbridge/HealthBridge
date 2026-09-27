"use client";

import { useState } from "react";
import { ODONTOGRAM_PATIENT, ODONTOGRAM_TEETH } from "@/src/lib/mock-data/clinix-app";
import { Kicker } from "../kicker";

const TOOTH_CLASSES = {
  work: "border-brand bg-brand text-white",
  restored: "border-slate-700 bg-slate-700 text-white",
  sound: "border-slate-200 bg-transparent text-slate-700",
} as const;

/** Dental-only floor widget: which teeth need work, at a glance. */
export function OdontogramPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="min-h-11 w-full cursor-pointer rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {open ? "Hide odontogram" : "Odontogram quick-view →"}
      </button>

      {open ? (
        <div className="rounded-xl bg-white p-3">
          <Kicker className="mb-2 block">Chart · {ODONTOGRAM_PATIENT} · FDI upper arch</Kicker>
          <ul className="grid grid-cols-8 gap-1">
            {ODONTOGRAM_TEETH.map((tooth) => (
              <li
                key={tooth.no}
                className={`grid aspect-square place-items-center rounded border font-data text-[9.5px] ${TOOTH_CLASSES[tooth.state]}`}
              >
                {tooth.no}
              </li>
            ))}
          </ul>
          <div className="mt-2.5 flex gap-3 text-[10px] text-slate-500">
            <span>■ Restored</span>
            <span className="text-brand">■ Needs work</span>
            <span>□ Sound</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
