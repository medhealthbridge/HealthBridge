"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { QuickAction } from "@/src/types/console";
import { ConsoleButton } from "./console-button";
import { useToast } from "./toast";

export function QuickActionsMenu({ actions }: { actions: QuickAction[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative shrink-0">
      <ConsoleButton variant="primary" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>
        <Plus aria-hidden="true" className="size-4" />
        <span className="max-sm:sr-only">Quick action</span>
      </ConsoleButton>
      {open && (
        <ul
          id={menuId}
          className="absolute top-full right-0 z-30 mt-1.5 min-w-52 rounded-xl border border-console-line bg-console-panel p-1.5 shadow-xl shadow-black/30"
        >
          {actions.map((action) => (
            <li key={action.label}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(action.href);
                  toast(action.toast);
                }}
                className="flex min-h-11 w-full cursor-pointer items-center rounded-lg px-3 text-left text-[13px] text-console-muted transition-colors duration-150 hover:bg-console-accent/10 hover:text-console-ink focus-visible:bg-console-accent/10 focus-visible:text-console-ink focus-visible:outline-none md:min-h-9"
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
