import { describe, expect, it } from "vitest";
import { checkoutSchema } from "./invoice";
import { receiptNumber } from "@/src/server/services/billing";

const base = { patientId: "7d3b2c0e-1a44-4a55-8f1e-0d9c6a1b2c3d", lines: [{ serviceId: "9a3b2c0e-1a44-4a55-8f1e-0d9c6a1b2c3e", quantity: 1 }], method: "cash" };

describe("checkoutSchema", () => {
  it("accepts a plain cash sale", () => expect(checkoutSchema.safeParse(base).success).toBe(true));
  it("needs a service line", () => expect(checkoutSchema.safeParse({ ...base, lines: [] }).success).toBe(false));
  it("needs an ID number for a senior/PWD discount", () => {
    expect(checkoutSchema.safeParse({ ...base, discountType: "senior_citizen" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, discountType: "pwd", discountIdNumber: "PWD-12345" }).success).toBe(true);
  });
  it("needs a reference for GCash, Maya and card but not cash", () => {
    expect(checkoutSchema.safeParse({ ...base, method: "gcash" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, method: "gcash", referenceNumber: "1234567" }).success).toBe(true);
  });
  it("rejects unknown payment methods", () => expect(checkoutSchema.safeParse({ ...base, method: "crypto" }).success).toBe(false));
});

describe("receiptNumber", () => {
  it("pads the clinic sequence", () => expect(receiptNumber(42)).toBe("OR-000042"));
});
