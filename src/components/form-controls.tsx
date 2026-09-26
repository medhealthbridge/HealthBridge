import { useId, type ComponentProps, type ReactNode } from "react";

const CONTROL =
  "min-h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-500 hover:border-slate-400 focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand aria-invalid:border-red-600 sm:text-sm";

type FieldShellProps = {
  label: string;
  hideLabel?: boolean;
  error?: string;
  suffix?: ReactNode;
  children: (ids: { id: string; describedBy?: string }) => ReactNode;
};

function FieldShell({ label, hideLabel, error, suffix, children }: FieldShellProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-xs font-medium text-slate-700"}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        {children({ id, describedBy: error ? errorId : undefined })}
        {suffix}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = ComponentProps<"input"> &
  Omit<FieldShellProps, "children"> & { name: string };

export function TextField({ label, hideLabel, error, suffix, className = "", ...props }: TextFieldProps) {
  return (
    <FieldShell label={label} hideLabel={hideLabel} error={error} suffix={suffix}>
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${CONTROL} ${className}`}
          {...props}
        />
      )}
    </FieldShell>
  );
}

type SelectFieldProps = ComponentProps<"select"> &
  Omit<FieldShellProps, "children" | "suffix"> & {
    name: string;
    options: readonly { value: string; label: string }[];
  };

export function SelectField({ label, hideLabel, error, options, className = "", ...props }: SelectFieldProps) {
  return (
    <FieldShell label={label} hideLabel={hideLabel} error={error}>
      {({ id, describedBy }) => (
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${CONTROL} cursor-pointer ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
