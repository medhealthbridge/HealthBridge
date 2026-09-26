import type { ComponentProps, ReactNode } from "react";
import { PANEL } from "./panel";

/** Panel that scrolls its table sideways on narrow screens instead of the page. */
export function TableCard({ label, header, children }: { label: string; header?: ReactNode; children: ReactNode }) {
  return (
    <div className={`${PANEL} min-w-0`}>
      {header}
      <div className="overflow-x-auto">
        <table aria-label={label} className="w-full border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
}

type CellProps = { numeric?: boolean };

export function Th({ numeric, className = "", ...props }: ComponentProps<"th"> & CellProps) {
  return (
    <th
      scope="col"
      className={`border-b border-console-line px-2 py-2.5 text-[10px] font-semibold tracking-widest whitespace-nowrap text-console-subtle uppercase md:px-3 ${numeric ? "text-right" : "text-left"} ${className}`}
      {...props}
    />
  );
}

export function Td({ numeric, className = "", ...props }: ComponentProps<"td"> & CellProps) {
  return (
    <td
      className={`border-b border-console-line px-2 py-2.5 text-xs md:px-3 md:text-[13px] ${numeric ? "text-right font-data tabular-nums" : ""} ${className}`}
      {...props}
    />
  );
}

/** Body row that highlights on hover and reveals its <RowActions> on pointer devices. */
export function Tr({ className = "", ...props }: ComponentProps<"tr">) {
  return <tr className={`group transition-colors duration-150 hover:bg-console-accent/6 ${className}`} {...props} />;
}

/** Row buttons: always visible on touch; on mouse devices they appear on row hover or focus. */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end transition-opacity duration-150 pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100">
      {children}
    </div>
  );
}
