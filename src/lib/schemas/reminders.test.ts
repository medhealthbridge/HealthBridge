import { describe, expect, it } from "vitest";
import { patientEmailSchema } from "./reminders";

const patientId = "7d3b2c0e-1a44-4a55-8f1e-0d9c6a1b2c3d";

describe("patientEmailSchema", () => {
  it("normalises an address", () => expect(patientEmailSchema.parse({ patientId, email: " Maria@Example.COM " }).email).toBe("maria@example.com"));
  it("treats empty as clearing", () => expect(patientEmailSchema.parse({ patientId, email: "" }).email).toBeNull());
  it("rejects a bad address", () => expect(patientEmailSchema.safeParse({ patientId, email: "nope" }).success).toBe(false));
});
