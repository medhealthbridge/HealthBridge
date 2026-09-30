import { Kicker, Panel } from "@/src/components/console/panel";
import { CLINIC_DOMAIN_SUFFIX } from "@/src/lib/constants";
import type { WorkspaceClinic } from "@/src/server/services/workspace";
import { FONT_PAIRING_LABELS, SPECIALTY_LABELS, labelOf } from "@/src/lib/clinic-labels";

function Swatch({ color }: { color: string | null }) {
  if (!color) return <span className="text-console-subtle">Not set</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="size-4 rounded border border-console-line" style={{ backgroundColor: color }} />
      <span className="font-data">{color}</span>
    </span>
  );
}

/** One clinic's profile exactly as onboarding saved it. */
export function ClinicProfileCard({ clinic }: { clinic: WorkspaceClinic }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Address", value: `${clinic.subdomain}${CLINIC_DOMAIN_SUFFIX}` },
    { label: "Vertical", value: labelOf(SPECIALTY_LABELS, clinic.specialty) },
    { label: "City", value: clinic.address ?? "Not set" },
    { label: "Time zone", value: clinic.timezone },
    { label: "Primary colour", value: <Swatch color={clinic.brandingPrimaryColor} /> },
    { label: "Accent colour", value: <Swatch color={clinic.brandingAccentColor} /> },
    { label: "Font pairing", value: clinic.brandingFont ? labelOf(FONT_PAIRING_LABELS, clinic.brandingFont) : "Not set" },
  ];

  return (
    <Panel className="flex max-w-2xl flex-col gap-3 p-4">
      <div className="flex flex-col gap-0.5">
        <Kicker>Clinic profile</Kicker>
        <span className="font-display text-lg font-extrabold">{clinic.name}</span>
      </div>
      <dl className="flex flex-col gap-2 border-t border-console-line pt-3 text-xs">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-console-subtle">{row.label}</dt>
            <dd className="text-right text-[13px]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
