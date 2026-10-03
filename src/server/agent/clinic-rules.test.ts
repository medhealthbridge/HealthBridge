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

describe("price questions", () => {
  const list = [
    { name: "Oral Prophylaxis", pricePesos: 1500, minutes: 45, vatExempt: false },
    { name: "Dental Consultation", pricePesos: 800, minutes: 20, vatExempt: true },
  ];
  it("quotes from the real price list without a model", async () => {
    const run = vi.fn(async () => list);
    expect(await answerClinicByRules("How much is oral prophylaxis?", run, "Asia/Manila")).toContain("₱1,500.00");
    expect(await answerClinicByRules("price list", run, "Asia/Manila")).toContain("Dental Consultation");
    expect(run).toHaveBeenCalledWith("list_services", {});
  });
  it("leaves a price change to the model, which can only propose it", async () => {
    const run = vi.fn();
    expect(await answerClinicByRules("change the price of cleaning to 900", run, "Asia/Manila")).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });
});
