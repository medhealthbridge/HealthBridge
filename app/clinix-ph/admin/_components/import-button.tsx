"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { ConsoleButton, type ConsoleButtonVariant } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { useToast } from "@/src/components/console/toast";
import { IMPORT_KINDS, type ImportKind } from "@/src/lib/mock-data/clinix-admin";

type ImportButtonProps = { kind: ImportKind; label?: string; variant?: ConsoleButtonVariant; className?: string };

/** Opens the file-import dialog for one kind of record. */
export function ImportButton({ kind, label = "Import", variant, className }: ImportButtonProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const copy = IMPORT_KINDS[kind];

  return (
    <>
      <ConsoleButton variant={variant} className={className} onClick={() => setOpen(true)}>
        {label}
      </ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label={copy.title} placement="center" className="flex-col gap-3.5 p-5 open:flex">
        <div>
          <h2 className="font-display text-base font-extrabold tracking-tight">{copy.title}</h2>
          <p className="text-xs text-console-muted">{copy.desc}</p>
        </div>
        <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-console-line p-6 text-center transition-colors duration-150 hover:border-console-accent/50 focus-within:border-console-accent">
          <Upload aria-hidden="true" className="size-5 text-console-muted" />
          <span className="text-[13px] text-console-muted">Drag a file here, or click to browse</span>
          <span className="font-data text-[11px] text-console-subtle">.csv, .xlsx up to 10MB</span>
          <input type="file" accept=".csv,.xlsx" className="sr-only" />
        </label>
        <div className="flex justify-end gap-2">
          <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
          <ConsoleButton
            variant="primary"
            onClick={() => {
              setOpen(false);
              toast("Import started — you’ll get a summary by email");
            }}
          >
            Start import
          </ConsoleButton>
        </div>
      </ConsoleDialog>
    </>
  );
}
