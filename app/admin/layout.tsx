import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/src/server/auth";
import { platformRoleOf } from "@/src/server/services/access";
import { COMPANY_ADMIN_ROUTE } from "@/src/lib/constants";
import { ConsoleShell } from "@/src/components/console/console-shell";
import { readConsoleTheme } from "@/src/components/console/read-console-theme";
import { brandFontVariables } from "@/src/lib/fonts";
import { initialsOf } from "@/src/lib/utils";
import {
  COMPANY_BRAND,
  COMPANY_NAV,
  COMPANY_NOTIFICATIONS,
  COMPANY_QUICK_ACTIONS,
  COMPANY_SEARCH_PLACEHOLDER,
} from "@/src/lib/mock-data/company-admin";

export const metadata: Metadata = {
  title: { template: "%s · DataBridgeSol admin", default: "DataBridgeSol admin" },
  robots: { index: false },
};

// Each page repeats this check: a layout isn't re-rendered on client
// navigation, so it can't be the only gate.
export default async function CompanyAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();
  // Pages only the founder may open aren't offered to the rest of the team.
  const isSuper = (await platformRoleOf(admin.id)) === "super_admin";
  const nav = COMPANY_NAV.map((group) => ({ ...group, items: group.items.filter((item) => isSuper || item.href !== `${COMPANY_ADMIN_ROUTE}/ai-settings`) }));

  return (
    <div className={`${brandFontVariables} flex flex-1 flex-col`}>
      <ConsoleShell
        initialTheme={await readConsoleTheme()}
        brand={COMPANY_BRAND}
        user={{ initials: initialsOf(admin.name), name: admin.name }}
        nav={nav}
        searchPlaceholder={COMPANY_SEARCH_PLACEHOLDER}
        quickActions={COMPANY_QUICK_ACTIONS}
        notifications={COMPANY_NOTIFICATIONS}
      >
        {children}
      </ConsoleShell>
    </div>
  );
}
