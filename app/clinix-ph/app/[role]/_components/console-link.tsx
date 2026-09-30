import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

/** The app's one link to the owner console, where setup and analysis live. */
export function ConsoleLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-console-line px-2.5 text-[13px] font-semibold text-console-ink transition-colors duration-150 hover:border-console-accent focus-visible:outline-2 focus-visible:outline-console-accent md:min-h-9"
    >
      <LayoutDashboard aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Owner console</span>
    </Link>
  );
}
