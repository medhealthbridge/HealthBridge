import { describe, expect, it } from "vitest";
import { addMonths, buildInstallments, installmentStatuses, nextInstallmentDue } from "./installments";

describe("installments", () => {
  it("clamps month-end dates", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });
  it("splits a balance into parts that add up exactly", () => {
    const parts = buildInstallments(100_000, 3, "2026-11-05");
    expect(parts.map((part) => part.amountCents)).toEqual([33_333, 33_333, 33_334]);
    expect(parts.map((part) => part.dueOn)).toEqual(["2026-11-05", "2026-12-05", "2027-01-05"]);
    expect(buildInstallments(0, 3, "2026-11-05")).toEqual([]);
  });
  it("covers the oldest installments first, after the down payment", () => {
    // total 100,000; down payment 40,000; 3 installments of 20,000.
    const parts = buildInstallments(60_000, 3, "2026-11-05");
    const statuses = installmentStatuses(parts, 100_000, 40_000 + 30_000, "2026-11-20");
    expect(statuses.map((item) => [item.paidCents, item.state])).toEqual([[20_000, "paid"], [10_000, "partial"], [0, "upcoming"]]);
    expect(nextInstallmentDue(statuses)).toEqual({ dueOn: "2026-12-05", amountCents: 10_000, overdue: false });
  });
  it("flags an unpaid installment past its date", () => {
    const parts = buildInstallments(20_000, 2, "2026-11-05");
    const statuses = installmentStatuses(parts, 20_000, 0, "2026-11-20");
    expect(statuses[0].state).toBe("overdue");
    expect(nextInstallmentDue(statuses)?.overdue).toBe(true);
  });
});
