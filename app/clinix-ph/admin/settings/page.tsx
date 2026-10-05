import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveClinicOwner, requireWorkspace } from "@/src/server/auth";
import { consoleButtonClass } from "@/src/components/console/console-button";
import { PageHeader } from "@/src/components/console/page-header";
import { FieldsManager } from "@/src/components/patient-fields/fields-manager";
import { getClinicDomainOrder } from "@/src/server/services/domain-orders";
import { clinicSpecialty, listFieldDefinitions } from "@/src/server/services/patient-fields";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { FIELD_TYPE_LABELS, fieldKey, suggestionsFor } from "@/src/lib/patient-fields";
import { DiscountsManager } from "@/src/components/discounts/discounts-manager";
import { listDiscountTypes } from "@/src/server/services/discount-types";
import { DomainStatusCard } from "./_components/domain-status-card";
import { ClinicProfileCard } from "./_components/clinic-profile-card";

export const metadata: Metadata = { title: "Settings" };

const TABS = [
  { key: "profile", label: "Clinic profile" },
  { key: "patient-fields", label: "Patient fields" },
  { key: "discounts", label: "Discounts" },
] as const;

const SPECIALTY_LABELS: Record<string, string> = { dental: "dental", eye: "eye", vet: "veterinary", derma: "dermatology", general: "general" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const requested = (await searchParams).tab;
  const tab = requested === "patient-fields" || requested === "discounts" ? requested : "profile";
  const base = `${CLINIX_ROUTES.admin}/settings`;

  const tabs = (
    <nav aria-label="Settings sections" className="flex flex-wrap gap-1.5">
      {TABS.map((item) => (
        <Link key={item.key} href={item.key === "profile" ? base : `${base}?tab=${item.key}`} aria-current={tab === item.key ? "page" : undefined} className={consoleButtonClass(tab === item.key ? "primary" : "secondary", "sm")}>
          {item.label}
        </Link>
      ))}
    </nav>
  );

  if (tab === "patient-fields") {
    const { clinic, clinics } = await requireActiveClinicOwner();
    const [fields, specialty] = await Promise.all([listFieldDefinitions(clinic.id), clinicSpecialty(clinic.id)]);
    const taken = new Set(fields.map((field) => field.key));
    const suggestions = suggestionsFor(specialty)
      .filter((suggestion) => !taken.has(fieldKey(suggestion.label)))
      .map((suggestion) => ({ label: suggestion.label, detail: `${FIELD_TYPE_LABELS[suggestion.type]} · ${suggestion.section}`, medical: suggestion.medical }));
    const branches = clinics.filter((other) => other.role === "owner" && other.id !== clinic.id).map((other) => ({ id: other.id, name: other.name }));
    return (
      <>
        <PageHeader title="Settings" description={`What you record about each patient at ${clinic.name}.`} />
        {tabs}
        <FieldsManager actor={clinic} fields={fields} suggestions={suggestions} branches={branches} specialtyLabel={SPECIALTY_LABELS[specialty]} />
      </>
    );
  }

  if (tab === "discounts") {
    const { clinic } = await requireActiveClinicOwner();
    return (
      <>
        <PageHeader title="Settings" description={`Discounts you can give at ${clinic.name}.`} />
        {tabs}
        <DiscountsManager rows={await listDiscountTypes(clinic.id)} />
      </>
    );
  }

  const { workspace } = await requireWorkspace();
  return (
    <>
      <PageHeader title="Settings" description="Clinic profile, as set up during onboarding." />
      {tabs}
      {await Promise.all(
        workspace.clinics.map(async (clinic) => (
          <div key={clinic.id} className="flex flex-col gap-4">
            <ClinicProfileCard clinic={clinic} />
            <DomainStatusCard order={await getClinicDomainOrder(clinic.id)} />
          </div>
        )),
      )}
    </>
  );
}
