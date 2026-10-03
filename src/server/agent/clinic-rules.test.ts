import { describe, expect, it, vi } from "vitest";
import { patientChangesSchema } from "@/src/lib/schemas/clinic-assistant";
import { answerClinicByRules } from "./clinic-rules";

describe("answerClinicByRules", () => {
  it("answers 'how does today look' and finds patients without a model", async () => {
    const run = vi.fn(async (tool: string) =>
      tool === "get_clinic_overview"
        ? { clinic: "Bright Smile", appointmentsToday: 3, byStatus: { confirmed: 2, checked_in: 1 }, patientRecords: 40 }
        : { matched: 1, patients: [{ mrn: "MRN-00007", name: "Maria Santos", sex: "F", age: 34, phone: "•••412" }] },
    );
    expect(await answerClinicByRules("How does today look?", run, "Asia/Manila")).toContain("3 appointments today (2 booked, 1 waiting)");
    expect(await answerClinicByRules("Find Santos", run, "Asia/Manila")).toContain("Maria Santos (MRN-00007)");
  });

  it("never answers a request to change data itself", async () => {
    const run = vi.fn();
    for (const q of ["Add a new patient", "archive MRN-00007", "update Maria's phone", "cancel tomorrow's 3pm", "book Joel at 3"]) {
      expect(await answerClinicByRules(q, run, "Asia/Manila")).toBeNull();
    }
    expect(run).not.toHaveBeenCalled();
  });
});

describe("patientChangesSchema", () => {
  it("accepts valid partial edits and null to clear", () => {
    expect(patientChangesSchema.safeParse({ phone: "0917 555 4412" }).success).toBe(true);
    expect(patientChangesSchema.safeParse({ philhealth: null }).success).toBe(true);
  });
  it("rejects empty edits, bad phones, unknown fields' effect and future birth dates", () => {
    expect(patientChangesSchema.safeParse({}).success).toBe(false);
    expect(patientChangesSchema.safeParse({ phone: "12345" }).success).toBe(false);
    expect(patientChangesSchema.safeParse({ dateOfBirth: "2999-01-01" }).success).toBe(false);
    expect(Object.keys(patientChangesSchema.parse({ phone: "0917 555 4412", clinicId: "x" }))).toEqual(["phone"]);
  });
});
