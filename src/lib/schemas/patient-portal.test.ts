import { describe, expect, it } from "vitest";
import { invitePatientSchema } from "./patient-portal";

const patientId = "7d3b2c0e-1a44-4a55-8f1e-0d9c6a1b2c3d";

describe("invitePatientSchema", () => {
  it("lowercases and trims the address", () => {
    expect(invitePatientSchema.parse({ patientId, email: "  Maria@Example.com " }).email).toBe("maria@example.com");
  });
  it("rejects a bad address or id", () => {
    expect(invitePatientSchema.safeParse({ patientId, email: "nope" }).success).toBe(false);
    expect(invitePatientSchema.safeParse({ patientId: "x", email: "a@b.co" }).success).toBe(false);
  });
});
