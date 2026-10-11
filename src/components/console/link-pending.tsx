"use client";

import { useLinkStatus } from "next/link";

/**
 * A small pulsing dot inside a nav link while its page is on the way, so a tap always shows it registered.
 * Shows only after a short delay, so cached pages (which open instantly) never flicker it.
 */
export function LinkPending({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`size-1.5 shrink-0 rounded-full bg-console-accent transition-opacity duration-150 ${pending ? "opacity-100 delay-150 motion-safe:animate-pulse" : "opacity-0"} ${className}`}
    />
  );
}
