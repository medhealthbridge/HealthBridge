import Link from "next/link";
import { Smartphone } from "lucide-react";
import { CLINIX_ROUTES } from "@/src/lib/constants";

/**
 * The console's one link back to the phone app. The console owns setup and
 * analysis; the floor work it points at here is not duplicated in these pages.
 */
export function ClinicAppLink() {
  return (
    <Link
      href={CLINIX_ROUTES.app}
      className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-console-line px-2.5 text-[13px] font-semibold text-console-ink transition-colors duration-150 hover:border-console-accent focus-visible:outline-2 focus-visible:outline-console-accent md:min-h-9"
    >
      <Smartphone aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Clinic app</span>
    </Link>
  );
}
