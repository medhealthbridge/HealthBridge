import type { ComponentProps, ReactNode } from "react";

export const PANEL = "rounded-xl border border-console-line bg-console-panel";

export function Panel({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`${PANEL} ${className}`} {...props} />;
}

export function Kicker({ className = "text-console-subtle", children }: { className?: string; children: ReactNode }) {
  return <span className={`text-[11px] font-medium tracking-widest uppercase ${className}`}>{children}</span>;
}

/** Title row across the top of a panel, divided from its content. */
export function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-console-line px-3.5 py-3">
      <Kicker>{title}</Kicker>
      {children}
    </div>
  );
}
