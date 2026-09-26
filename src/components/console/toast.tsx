"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ConsoleButton } from "./console-button";

const TOAST_MS = 2400;

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const popover = useRef<HTMLDivElement>(null);

  const show = useCallback((next: string) => {
    clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(""), TOAST_MS);
  }, []);

  // A manual popover sits in the top layer, so toasts stay visible above open dialogs.
  // Re-showing moves it above whichever dialog opened most recently.
  useEffect(() => {
    const el = popover.current;
    if (!el) return;
    if (el.matches(":popover-open")) el.hidePopover();
    if (message) el.showPopover();
  }, [message]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        ref={popover}
        popover="manual"
        role="status"
        aria-live="polite"
        className="inset-auto bottom-6 left-1/2 m-0 max-w-[92vw] -translate-x-1/2 rounded-[10px] border border-console-accent/45 bg-console-panel px-4 py-2.5 text-[13px] text-console-ink shadow-xl shadow-black/30"
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}

type ToastButtonProps = Omit<ComponentProps<typeof ConsoleButton>, "onClick"> & { message: string };

/** A button whose only job (for now) is to confirm an action with a toast. */
export function ToastButton({ message, ...props }: ToastButtonProps) {
  const toast = useToast();
  return <ConsoleButton onClick={() => toast(message)} {...props} />;
}
