"use client";

import { BottomSheet } from "./bottom-sheet";

type ArchivePatientDialogProps = { open: boolean; onConfirm: () => void; onCancel: () => void };

export function ArchivePatientDialog({ open, onConfirm, onCancel }: ArchivePatientDialogProps) {
  return (
    <BottomSheet open={open} title="Archive patient?" onClose={onCancel} placement="center">
      <h2 className="font-display text-lg font-extrabold text-brand-700">Archive patient?</h2>
      <p className="text-[12.5px] leading-relaxed text-slate-700">
        Medical and billing records are retained for the statutory period. The patient is hidden from the active list but
        not deleted.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-900 transition-colors duration-150 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-11 flex-1 cursor-pointer rounded-lg bg-brand px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Archive
        </button>
      </div>
    </BottomSheet>
  );
}
