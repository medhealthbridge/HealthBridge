import { describe, expect, it } from "vitest";
import { summarizeTenants, type TenantRow } from "./tenants";

const row = (over: Partial<TenantRow>): TenantRow => ({
  key: "k", name: "A", email: "a@x.ph", tier: "Tier 1", status: "Active", clinics: 1, clinicList: [], mrr: 0, renews: "-", renewsAt: null, joined: "-", ...over,
});

describe("summarizeTenants", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  it("counts statuses, sums revenue and finds trials ending within a week", () => {
    const summary = summarizeTenants(
      [
        row({ status: "Active", mrr: 1490 }),
        row({ status: "Active", mrr: 2690 }),
        row({ name: "Soon", status: "Trial", renews: "04 Oct 2026", renewsAt: new Date("2026-10-04T00:00:00Z") }),
        row({ name: "Later", status: "Trial", renewsAt: new Date("2026-11-01T00:00:00Z") }),
        row({ status: "Past due" }),
      ],
      now,
    );
    expect(summary.byStatus).toEqual({ Active: 2, Trial: 2, "Past due": 1, Cancelled: 0 });
    expect(summary.activeMrr).toBe(4180);
    expect(summary.trialsEndingSoon).toEqual([{ name: "Soon", endsOn: "04 Oct 2026" }]);
  });
});
