import type { ActionItem } from "@/src/types/console";
import { Kicker, Panel } from "./panel";
import { Pill } from "./pill";
import { ToastButton } from "./toast";

/** Warning-framed list of items that each need one follow-up action. */
export function ActionListCard({ title, items }: { title: string; items: ActionItem[] }) {
  return (
    <Panel className="flex flex-col gap-2.5 border-console-warn/40 p-3.5">
      <div className="flex items-center justify-between">
        <Kicker className="text-console-warn">{title}</Kicker>
        <Pill tone="warn">{items.length}</Pill>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.title} className="flex items-center gap-2.5 border-t border-console-line pt-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{item.title}</p>
              <p className="font-data text-[11px] text-console-subtle">{item.detail}</p>
            </div>
            <ToastButton size="sm" message={item.toast} aria-label={`${item.actionLabel} ${item.title}`}>
              {item.actionLabel}
            </ToastButton>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
