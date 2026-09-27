import { TONE_CLASSES } from "../_data";
import type { QueueTone } from "@/src/types/clinix-app";

/** The small status chip used on queue rows, records and staff status. */
export function Pill({ tone, children }: { tone: QueueTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
