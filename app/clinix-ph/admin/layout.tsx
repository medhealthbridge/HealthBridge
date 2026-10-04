import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireWorkspace } from "@/src/server/auth";
import { ConsoleShell } from "@/src/components/console/console-shell";
import { readConsoleTheme } from "@/src/components/console/read-console-theme";
import { clinicConsoleUrl, clinicSubdomainsEnabled, isCustomHost, tenantSlugFromHost } from "@/src/lib/clinic-host";
import { clinicIdForCustomDomain, customDomainOf } from "@/src/server/services/custom-domains";
import { CLINIC_DOMAIN_SUFFIX, CLINIX_ROUTES } from "@/src/lib/constants";
import {
  CLINIX_ADMIN_NAV,
  CLINIX_QUICK_ACTIONS,
  CLINIX_SEARCH_PLACEHOLDER,
} from "@/src/lib/mock-data/clinix-admin";
import { initialsOf } from "@/src/lib/utils";
import { aiGrantedFor } from "@/src/server/services/ai-access";
import { BranchProvider, type ConsoleBranch } from "./_components/branch-context";
import { BranchSwitcher } from "./_components/branch-switcher";
import { ClinicAppLink } from "./_components/clinic-app-link";
import { SampleDataNotice } from "./_components/sample-data-notice";

export const metadata: Metadata = {
  title: { template: "%s · Clinix PH", default: "Owner console · Clinix PH" },
  robots: { index: false },
};

const ALL_BRANCHES: ConsoleBranch = { key: "all", name: "All branches", initial: "HQ" };

// The demo nav carries invented counts ("3 low-stock items"). On a real clinic
// those would read as real alerts, so the badges are dropped until they are.
const ASSISTANT_HREF = `${CLINIX_ROUTES.admin}/assistant`;

const NAV = CLINIX_ADMIN_NAV.map((group) => ({
  ...group,
  items: group.items.map((item) => ({ href: item.href, label: item.label, shortLabel: item.shortLabel, icon: item.icon })),
}));

// Each page repeats this check: a layout isn't re-rendered on client
// navigation, so it can't be the only gate.
export default async function ClinixAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await requireWorkspace();
  const host = (await headers()).get("host");
  const slug = tenantSlugFromHost(host);

  // A clinic's subdomain is only for that clinic's owner. Rewriting `/` to the
  // console (proxy.ts) is routing, not authorization — this is the check.
  if (slug && !workspace.clinics.some((clinic) => clinic.subdomain === slug)) notFound();

  // The same check for a clinic's own domain, which isn't on the shared suffix.
  let customClinic = null;
  if (!slug && isCustomHost(host)) {
    const clinicId = host ? await clinicIdForCustomDomain(host) : null;
    customClinic = workspace.clinics.find((clinic) => clinic.id === clinicId) ?? null;
    if (!customClinic) notFound();
  }

  // Logged in on the product host with one clinic: go straight to it. Only on
  // the shared domain — a preview URL or localhost has no subdomain to go to.
  const onSharedDomain = Boolean(host?.split(":")[0].endsWith(CLINIC_DOMAIN_SUFFIX));
  if (!slug && clinicSubdomainsEnabled() && onSharedDomain && workspace.clinics.length === 1) {
    // A clinic with its own domain lands there, carrying the session across.
    const ownDomain = await customDomainOf(workspace.clinics[0].id);
    redirect(ownDomain ? CLINIX_ROUTES.openDomain : clinicConsoleUrl(workspace.clinics[0].subdomain));
  }

  // The assistant is offered only to an account the company admin has granted it to.
  const [assistantGranted, initialTheme] = await Promise.all([aiGrantedFor(workspace.clinics[0].accountId), readConsoleTheme()]);
  const nav = NAV.map((group) => ({ ...group, items: group.items.filter((item) => assistantGranted || item.href !== ASSISTANT_HREF) }));

  const branches: ConsoleBranch[] = workspace.clinics.map((clinic) => ({
    key: clinic.subdomain,
    name: clinic.name,
    initial: initialsOf(clinic.name),
  }));
  if (branches.length > 1) branches.push(ALL_BRANCHES);

  return (
    <BranchProvider branches={branches} initialKey={slug ?? customClinic?.subdomain ?? branches[0].key}>
      <ConsoleShell
        initialTheme={initialTheme}
        brand={{ initial: initialsOf(workspace.companyName).slice(0, 1), name: workspace.companyName, kicker: "Owner console" }}
        user={{ initials: initialsOf(user.name), name: user.name }}
        nav={nav}
        searchPlaceholder={CLINIX_SEARCH_PLACEHOLDER}
        quickActions={CLINIX_QUICK_ACTIONS}
        notifications={[]}
        sidebarSlot={<BranchSwitcher />}
        topbarSlot={<ClinicAppLink />}
      >
        <SampleDataNotice />
        {children}
      </ConsoleShell>
    </BranchProvider>
  );
}
