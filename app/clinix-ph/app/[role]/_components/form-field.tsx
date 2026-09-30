import type { ReactNode } from "react";

/** Label, control and its error, wired together for screen readers. */
export function FormField({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-[11px] text-console-subtle">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[11px] text-console-danger">
          {error}
        </p>
      )}
    </div>
  );
}
