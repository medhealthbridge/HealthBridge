"use client";

import { APP_ROLES, type AppRole } from "@/src/types/clinix-app";
import { ROLE_LABELS } from "../_data";

/**
 * Prototype-only control. Real sessions get their role from
 * `clinic_staff.role`; this lets one signed-in account preview every side of
 * the app without four test accounts.
 */
export function RoleSwitcher({ role, onSelect }: { role: AppRole; onSelect: (role: AppRole) => void }) {
  return (
    <div className="flex w-full max-w-[390px] flex-col gap-1.5">
      <span className="text-[9.5px] font-semibold tracking-[0.14em] text-slate-500 uppercase">Prototype view</span>
      <div className="grid grid-cols-4">
        {APP_ROLES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === role}
            onClick={() => onSelect(option)}
            className={`min-h-11 cursor-pointer border border-slate-300 px-1 font-display text-[10.5px] font-extrabold tracking-wide uppercase transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${
              option === role ? "border-brand bg-brand text-white" : "bg-white text-slate-700 hover:border-brand"
            }`}
          >
            {option === "patient" ? "Patient" : ROLE_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
