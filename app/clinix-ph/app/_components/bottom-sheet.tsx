"use client";

import { useEffect } from "react";

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** "center" is for short confirmations; sheets slide up from the bottom edge. */
  placement?: "bottom" | "center";
};

/** Modal surface inside the phone frame — dimmed backdrop, Escape to dismiss. */
export function BottomSheet({ open, title, onClose, children, placement = "bottom" }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`absolute inset-0 z-50 flex bg-slate-900/50 ${placement === "center" ? "items-center p-6" : "items-end"}`}
    >
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-pointer" />
      <div
        className={`relative flex max-h-[92%] w-full flex-col gap-2.5 overflow-y-auto bg-slate-50 p-4 shadow-xl ${
          placement === "center" ? "rounded-2xl" : "rounded-t-2xl"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="font-display text-[19px] font-extrabold text-slate-900">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="ml-auto min-h-11 cursor-pointer px-1 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Close
      </button>
    </div>
  );
}
