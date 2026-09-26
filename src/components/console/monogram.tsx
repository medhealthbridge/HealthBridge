import { initialsOf } from "@/src/lib/utils";

/** Initials tile for a tenant, patient or branch. */
export function Monogram({ name, round = false }: { name: string; round?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-6 shrink-0 place-items-center bg-console-ink/12 font-data text-[10px] text-console-muted ${round ? "rounded-full" : "rounded-md"}`}
    >
      {initialsOf(name)}
    </span>
  );
}
