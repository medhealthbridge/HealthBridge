import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireActiveClinic } from "@/src/server/auth";
import { ConsoleShell } from "@/src/components/console/console-shell";
import { readConsoleTheme } from "@/src/components/console/read-console-theme";
import { appNav, isAppRole, roleHome, ROLE_LABELS } from "@/src/lib/clinic-app-nav";
import { clinicAppUrl, clinicSubdomainsEnabled } from "@/src/lib/clinic-host";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { initialsOf } from "@/src/lib/utils";
import { ClinicSwitcher } from "./_components/clinic-switcher";
import { ConsoleLink } from "./_components/console-link";

export const metadata: Metadata = {
  title: { template: "%s · Clinix PH", default: "Clinic app · Clinix PH" },
  robots: { index: false },
};

export default async function ClinicAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!isAppRole(role)) notFound();

  const { user, clinic, clinics } = await requireActiveClinic();
  // Each role has its own route; a URL for a role you don't hold here goes to your own.
  if (clinic.role !== role) redirect(roleHome(clinic.role));

  return (
    <ConsoleShell
      initialTheme={await readConsoleTheme()}
      brand={{ initial: initialsOf(clinic.name).slice(0, 1), name: clinic.name, kicker: `${ROLE_LABELS[role]} app` }}
      user={{ initials: initialsOf(user.name), name: user.name }}
      nav={appNav(role)}
      searchPlaceholder="Search patients"
      quickActions={[]}
      notifications={[]}
      sidebarSlot={
        clinics.length > 1 && clinicSubdomainsEnabled() ? (
          <ClinicSwitcher
            current={clinic.subdomain}
            options={clinics.map((option) => ({
              key: option.subdomain,
              name: option.name,
              href: `${clinicAppUrl(option.subdomain)}${roleHome(option.role)}`,
            }))}
          />
        ) : undefined
      }
      topbarSlot={role === "owner" ? <ConsoleLink href={CLINIX_ROUTES.admin} /> : undefined}
    >
      {children}
    </ConsoleShell>
  );
}
