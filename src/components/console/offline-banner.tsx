"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

const subscribe = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

/** Tells the person at once when the connection drops, so they don't fill in a form that can't be saved. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <p role="status" className="sticky top-0 z-40 flex items-center gap-2 rounded-lg border border-console-warn/50 bg-console-warn/15 px-3 py-2 text-[13px] font-semibold text-console-ink backdrop-blur">
      <WifiOff aria-hidden="true" className="size-4 shrink-0" />
      You&rsquo;re offline. Nothing can be saved until you reconnect.
    </p>
  );
}
