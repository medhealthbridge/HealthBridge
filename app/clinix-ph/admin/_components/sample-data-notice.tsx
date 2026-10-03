"use client";

import { usePathname } from "next/navigation";
import { CLINIX_ROUTES } from "@/src/lib/constants";

// Sections that read the clinic's own records. A section leaves the notice
// only when it does — this is the list of what is genuinely live.
const LIVE_SECTIONS = ["staff", "settings", "subscription", "assistant", "services", "patients", "appointments"].map((section) => `${CLINIX_ROUTES.admin}/${section}`);

/**
 * The rest of the console still renders example records. Under a real clinic's
 * name that could be mistaken for its own patients, so say so on every page
 * that isn't wired up yet.
 */
export function SampleDataNotice() {
  const pathname = usePathname();
  // A section's own sub-pages (e.g. a patient's chart) are live too.
  if (LIVE_SECTIONS.some((section) => pathname === section || pathname.startsWith(`${section}/`))) return null;

  return (
    <p
      role="note"
      className="rounded-lg border border-console-warn/40 bg-console-warn/10 px-3 py-2 text-xs leading-normal text-console-ink"
    >
      <strong className="font-semibold">Example data.</strong> This section shows sample records so you can see how it will
      look. Your own clinic&rsquo;s records will appear here as this section goes live.
    </p>
  );
}
