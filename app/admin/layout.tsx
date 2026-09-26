import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/src/server/auth";
import { ConsoleShell } from "@/src/components/console/console-shell";
import { readConsoleTheme } from "@/src/components/console/read-console-theme";
import { brandFontVariables } from "@/src/lib/fonts";
import {
  COMPANY_BRAND,
  COMPANY_NAV,
  COMPANY_NOTIFICATIONS,
  COMPANY_QUICK_ACTIONS,
  COMPANY_SEARCH_PLACEHOLDER,
  COMPANY_USER,
} from "@/src/lib/mock-data/company-admin";

export const metadata: Metadata = {
  title: { template: "%s · DataBridgeSol admin", default: "DataBridgeSol admin" },
  robots: { index: false },
};

// Each page repeats this check: a layout isn't re-rendered on client
// navigation, so it can't be the only gate.
export default async function CompanyAdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className={`${brandFontVariables} flex flex-1 flex-col`}>
      <ConsoleShell
        initialTheme={await readConsoleTheme()}
        brand={COMPANY_BRAND}
        user={COMPANY_USER}
        nav={COMPANY_NAV}
        searchPlaceholder={COMPANY_SEARCH_PLACEHOLDER}
        quickActions={COMPANY_QUICK_ACTIONS}
        notifications={COMPANY_NOTIFICATIONS}
      >
        {children}
      </ConsoleShell>
    </div>
  );
}
