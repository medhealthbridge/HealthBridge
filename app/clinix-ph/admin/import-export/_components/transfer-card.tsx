import type { ReactNode } from "react";
import { Kicker, Panel } from "@/src/components/console/panel";

/** One import or export option: kicker, title, description and its action button. */
export function TransferCard({ kicker, title, desc, action }: { kicker: string; title: string; desc: string; action: ReactNode }) {
  return (
    <Panel className="flex flex-col items-start gap-2 p-4">
      <Kicker>{kicker}</Kicker>
      <h2 className="font-display text-[15px] font-extrabold tracking-tight">{title}</h2>
      <p className="flex-1 text-[13px] leading-normal text-console-muted">{desc}</p>
      {action}
    </Panel>
  );
}
