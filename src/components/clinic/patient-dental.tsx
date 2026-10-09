import { listChartEntries } from "@/src/server/services/dental-chart";
import { listServices } from "@/src/server/services/price-list";
import { listPlans } from "@/src/server/services/treatment-plans";
import type { StaffClinic } from "@/src/server/services/clinic-app";
import { ToothChartPanel } from "./tooth-chart";
import { TreatmentPlansPanel } from "./treatment-plans-panel";

/**
 * The dental part of a patient's chart. Doctors (owner, practitioner) see and write the tooth chart and plans;
 * the front desk sees plans (to record that the patient agreed and to bill them) but not the clinical chart.
 */
export async function PatientDental({ clinic, patientId, archived, billingHref, age = null }: { clinic: Pick<StaffClinic, "id" | "role">; patientId: string; archived: boolean; billingHref: string; /** Picks adult, mixed or baby teeth to show first. */ age?: number | null }) {
  const doctor = clinic.role !== "assistant";
  const [plans, services, entries] = await Promise.all([
    listPlans(clinic.id, patientId),
    clinic.role === "assistant" ? Promise.resolve([]) : listServices(clinic.id),
    doctor ? listChartEntries(clinic.id, patientId) : Promise.resolve(null),
  ]);
  const planItems = plans.flatMap((plan) => plan.items.filter((item) => item.tooth).map((item) => ({ id: item.id, tooth: item.tooth as number, description: item.description, status: item.status, planTitle: plan.title })));
  return (
    <>
      {entries && <ToothChartPanel patientId={patientId} entries={entries} planItems={planItems} canWrite={doctor && !archived} age={age} />}
      <TreatmentPlansPanel
        patientId={patientId}
        plans={plans}
        services={services.map((s) => ({ id: s.id, name: s.name, priceCentavos: s.priceCentavos }))}
        canEdit={doctor && !archived}
        canAgree={!archived}
        canCustom={clinic.role === "owner"}
        billingHref={clinic.role === "practitioner" ? "" : billingHref}
      />
    </>
  );
}
