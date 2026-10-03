import { describe, expect, it } from "vitest";
import { claimAgeDays, summarizeClaims } from "./claims";

describe("claims", () => {
  it("ages from the filing date", () => {
    const now = Date.parse("2026-10-03T00:00:00Z");
    expect(claimAgeDays(new Date("2026-08-04T00:00:00Z"), now)).toBe(60);
    expect(claimAgeDays(null, now)).toBe(0);
  });
  it("counts only open claims as receivable", () => {
    const s = summarizeClaims([
      { status: "filed", claimAmountCents: 100_00, ageDays: 5 },
      { status: "approved", claimAmountCents: 200_00, ageDays: 70 },
      { status: "denied", claimAmountCents: 650_00, ageDays: 80 },
      { status: "paid", claimAmountCents: 900_00, ageDays: 90 },
      { status: "withdrawn", claimAmountCents: 50_00, ageDays: 10 },
    ]);
    expect(s).toEqual({ outstandingCents: 300_00, openCount: 2, deniedCount: 1, overSixtyCents: 200_00 });
  });
});
