import type { NavGroup } from "@/src/types/console";
import { CLINIX_ROUTES } from "@/src/lib/constants";

export const STAFF_ROLES = ["owner", "assistant", "practitioner"] as const;
export type AppRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  assistant: "Front desk",
  practitioner: "Practitioner",
};

export function isAppRole(value: string): value is AppRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}

/** Each role signs in to its own route: /clinix-ph/app/owner, /assistant, /practitioner. */
export function roleHome(role: AppRole) {
  return `${CLINIX_ROUTES.app}/${role}`;
}

/** Floor work per role. Setup and analysis stay in the console (owners get a cross-link, not a copy). */
export function appNav(role: AppRole): NavGroup[] {
  const home = roleHome(role);
  if (role === "practitioner") {
    return [
      {
        items: [
          { href: home, label: "My schedule", shortLabel: "Today", icon: "overview" },
          { href: `${home}/appointments`, label: "My calendar", shortLabel: "Calendar", icon: "appointments" },
          { href: `${home}/patients`, label: "Patients", icon: "patients" },
          { href: `${home}/inventory`, label: "Inventory", icon: "inventory" },
          { href: `${home}/patient-fields`, label: "Patient fields", shortLabel: "Fields", icon: "settings" },
        ],
      },
    ];
  }
  const floor: NavGroup = {
    items: [
      { href: home, label: "Today", icon: "overview" },
      { href: `${home}/queue`, label: "Queue", icon: "queue" },
      { href: `${home}/appointments`, label: "Appointments", shortLabel: "Calendar", icon: "appointments" },
      { href: `${home}/patients`, label: "Patients", icon: "patients" },
      { href: `${home}/billing`, label: "Billing", icon: "billing" },
      { href: `${home}/inventory`, label: "Inventory", icon: "inventory" },
      { href: `${home}/claims`, label: "Claims", icon: "claims" },
    ],
  };
  if (role !== "owner") return [floor];
  return [
    floor,
    {
      label: "Manage clinic",
      items: [
        { href: `${CLINIX_ROUTES.admin}/services`, label: "Services & pricing", icon: "services" },
        { href: `${CLINIX_ROUTES.admin}/staff`, label: "Staff & roles", icon: "staff" },
        { href: `${CLINIX_ROUTES.admin}/settings`, label: "Clinic settings", icon: "settings" },
      ],
    },
  ];
}
