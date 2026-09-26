import type { Metadata } from "next";
import { requireUser } from "@/src/server/auth";
import { ConsoleShell } from "@/src/components/console/console-shell";
import { readConsoleTheme } from "@/src/components/console/read-console-theme";
import {
  CLINIX_ADMIN_BRAND,
  CLINIX_ADMIN_NAV,
  CLINIX_ADMIN_USER,
  CLINIX_NOTIFICATIONS,
  CLINIX_QUICK_ACTIONS,
  CLINIX_SEARCH_PLACEHOLDER,
} from "@/src/lib/mock-data/clinix-admin";
import { BranchProvider } from "./_components/branch-context";
import { BranchSwitcher } from "./_components/branch-switcher";

export const metadata: Metadata = {
  title: { template: "%s · Clinix PH", default: "Owner console · Clinix PH" },
  robots: { index: false },
};

export default async function ClinixAdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <BranchProvider>
      <ConsoleShell
        initialTheme={await readConsoleTheme()}
        brand={CLINIX_ADMIN_BRAND}
        user={CLINIX_ADMIN_USER}
        nav={CLINIX_ADMIN_NAV}
        searchPlaceholder={CLINIX_SEARCH_PLACEHOLDER}
        quickActions={CLINIX_QUICK_ACTIONS}
        notifications={CLINIX_NOTIFICATIONS}
        sidebarSlot={<BranchSwitcher />}
      >
        {children}
      </ConsoleShell>
    </BranchProvider>
  );
}
