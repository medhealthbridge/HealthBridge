"use client";

import { ArrowRight } from "lucide-react";
import { QUEUES } from "@/src/lib/mock-data/clinix-app";
import type { BranchKey } from "@/src/types/clinix-app";
import { SectionHeading } from "../section-heading";
import { QueueRow } from "./queue-row";

type QueueScreenProps = { branch: BranchKey; onCallIn: (name: string) => void; onCharge: () => void };

/** Owner / assistant: the full waiting list, with the two actions the front desk actually takes. */
export function QueueScreen({ branch, onCallIn, onCharge }: QueueScreenProps) {
  const queue = QUEUES[branch];

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading title={queue.title} aside={`${queue.items.length} waiting`} />
      <ul className="flex flex-col gap-3">
        {queue.items.map((entry) => (
          <QueueRow
            key={entry.no}
            entry={entry}
            actions={
              <div className="mt-1 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onCallIn(entry.name)}
                  className="min-h-11 cursor-pointer rounded-lg border border-slate-300 px-2.5 text-[12px] font-semibold text-slate-900 transition-colors duration-150 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Call in
                </button>
                <button
                  type="button"
                  onClick={onCharge}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1 px-1 text-[12px] font-semibold text-brand transition-colors duration-150 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Charge
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            }
          />
        ))}
      </ul>
    </div>
  );
}
