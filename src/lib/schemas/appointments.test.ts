import { describe, expect, it } from "vitest";
import { addDays, clinicDateString } from "@/src/server/services/clinic-app";
import { bookAppointmentSchema, dayParamSchema } from "./appointments";

const id = "11111111-1111-4111-8111-111111111111";

describe("bookAppointmentSchema", () => {
  it("accepts a patient, optional service/practitioner, and a local date and time", () => {
    const parsed = bookAppointmentSchema.parse({ patientId: id, serviceId: "", practitionerStaffId: "", date: "2026-10-05", time: "15:30" });
    expect(parsed).toMatchObject({ serviceId: null, practitionerStaffId: null });
  });
  it("rejects a missing patient, a malformed time, and ids that aren't ids", () => {
    expect(bookAppointmentSchema.safeParse({ patientId: "", date: "2026-10-05", time: "15:30" }).success).toBe(false);
    expect(bookAppointmentSchema.safeParse({ patientId: id, date: "2026-10-05", time: "3pm" }).success).toBe(false);
    expect(bookAppointmentSchema.safeParse({ patientId: id, serviceId: "x", date: "2026-10-05", time: "15:30" }).success).toBe(false);
  });
});

describe("calendar helpers", () => {
  it("steps whole days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("names the clinic's own day, not UTC's", () => {
    expect(clinicDateString("Asia/Manila", new Date("2026-10-01T20:00:00Z"))).toBe("2026-10-02");
  });
  it("only accepts real calendar days in the URL", () => {
    expect(dayParamSchema.safeParse("2026-10-05").success).toBe(true);
    expect(dayParamSchema.safeParse("2026-13-45").success).toBe(false);
    expect(dayParamSchema.safeParse("tomorrow").success).toBe(false);
  });
});
