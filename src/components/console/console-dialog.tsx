"use client";

import { useEffect, useRef, type ReactNode } from "react";

const PLACEMENT = {
  /** Full-height side sheet. */
  right:
    "fixed inset-y-0 right-0 left-auto m-0 h-dvh open:flex max-h-none w-full flex-col border-l border-console-line motion-safe:animate-console-slide-in md:w-[420px] md:max-w-[94vw]",
  /** Centered modal. */
  center: "m-auto w-[420px] max-w-[92vw] rounded-xl border border-console-line",
  /** Command palette position. */
  top: "mx-auto mt-[12vh] w-[540px] max-w-[94vw] overflow-hidden rounded-[14px] border border-console-line",
} as const;

type ConsoleDialogProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  placement?: keyof typeof PLACEMENT;
  className?: string;
  children: ReactNode;
};

/** Native modal <dialog>: focus trap, Esc to close and top-layer stacking come free. */
export function ConsoleDialog({ open, onClose, label, placement = "right", className = "", children }: ConsoleDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      // A click on the dialog element itself (not its content) is a backdrop click.
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className={`bg-console-panel p-0 text-console-ink shadow-2xl shadow-black/40 backdrop:bg-slate-950/50 ${PLACEMENT[placement]} ${className}`}
    >
      {open && children}
    </dialog>
  );
}
