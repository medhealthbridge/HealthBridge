import type { ReactNode } from "react";
import type { Tone } from "@/src/types/console";
import { TONE_SOFT } from "./tone";

export function Pill({ tone = "neutral", className = "", children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${TONE_SOFT[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
