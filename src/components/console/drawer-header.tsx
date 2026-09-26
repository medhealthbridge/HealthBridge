import { X } from "lucide-react";
import { ConsoleButton } from "./console-button";

export function DrawerHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex shrink-0 items-start gap-3 border-b border-console-line p-4">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-base font-extrabold tracking-tight">{title}</h2>
        {subtitle && <p className="font-data text-[11px] text-console-subtle">{subtitle}</p>}
      </div>
      <ConsoleButton size="sm" onClick={onClose} aria-label="Close" className="w-11 md:w-8">
        <X aria-hidden="true" className="size-4" />
      </ConsoleButton>
    </div>
  );
}
