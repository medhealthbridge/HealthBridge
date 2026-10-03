import type { Metadata } from "next";
import { requireClinicRole } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { FieldsManager } from "@/src/components/patient-fields/fields-manager";
import { listFieldDefinitions } from "@/src/server/services/patient-fields";

export const metadata: Metadata = { title: "Patient fields" };

/** Practitioners see the clinic's fields and manage only their own add-ons. */
export default async function Page() {
  const { clinic } = await requireClinicRole("practitioner");
  const fields = await listFieldDefinitions(clinic.id);
  return (
    <>
      <PageHeader title="Patient fields" description="The details recorded for each patient. Add your own add-on fields for your work." />
      <FieldsManager actor={clinic} fields={fields} />
    </>
  );
}
