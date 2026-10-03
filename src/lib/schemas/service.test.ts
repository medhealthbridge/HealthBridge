import { describe, expect, it } from "vitest";
import { serviceInputSchema } from "./service";

describe("serviceInputSchema", () => {
  it("turns typed pesos into whole centavos and blanks into nulls", () => {
    const parsed = serviceInputSchema.parse({ name: "Oral Prophylaxis", priceCentavos: "1,500.50", durationMinutes: "", category: "", code: "", vatExempt: "on" });
    expect(parsed).toEqual({ name: "Oral Prophylaxis", priceCentavos: 150050, durationMinutes: null, category: null, code: null, vatExempt: true });
    expect(serviceInputSchema.parse({ name: "Consult", priceCentavos: 800 }).priceCentavos).toBe(80000);
  });
  it("rejects negative or absurd prices, short names and silly durations", () => {
    expect(serviceInputSchema.safeParse({ name: "X", priceCentavos: "100" }).success).toBe(false);
    expect(serviceInputSchema.safeParse({ name: "Cleaning", priceCentavos: "-1" }).success).toBe(false);
    expect(serviceInputSchema.safeParse({ name: "Cleaning", priceCentavos: "abc" }).success).toBe(false);
    expect(serviceInputSchema.safeParse({ name: "Cleaning", priceCentavos: "2000000" }).success).toBe(false);
    expect(serviceInputSchema.safeParse({ name: "Cleaning", priceCentavos: "500", durationMinutes: "2" }).success).toBe(false);
  });
});
