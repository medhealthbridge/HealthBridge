import { describe, expect, it, vi } from "vitest";
import { answerByRules } from "./rules";

const summary = { total: 8, byStatus: { Active: 4, Trial: 2, "Past due": 1, Cancelled: 1 }, activeMrr: 12500, trialsEndingSoon: [{ name: "PawCare", endsOn: "05 Oct 2026" }] };

describe("answerByRules", () => {
  it("answers the daily questions without a model", async () => {
    const run = vi.fn(async () => summary);
    expect(await answerByRules("How is the business doing?", run)).toContain("₱12,500");
    expect(await answerByRules("which trials end this week", run)).toContain("PawCare");
    expect(run).toHaveBeenCalledWith("get_platform_summary");
  });

  it("looks a tenant up by the name after 'tell me about'", async () => {
    const run = vi.fn(async () => ({ found: true, tenant: { name: "Bright Smile", ownerEmail: "o@x.ph", tier: "Tier 2", status: "Active", clinicCount: 1, clinics: [{ name: "Main", subdomain: "main" }], monthlyRevenuePesos: 2690, renewsOrTrialEnds: "14 Jan 2027", joined: "01 Sep 2026" } }));
    expect(await answerByRules("Tell me about Bright Smile", run)).toContain("Bright Smile — Tier 2");
    expect(run).toHaveBeenCalledWith("get_tenant", { name: "Bright Smile" });
  });

  it("hands anything that asks for a change, or isn't recognised, to the model", async () => {
    const run = vi.fn();
    for (const q of ["Lock Bright Smile", "invite jane@x.ph to the team", "upgrade PawCare to tier 3", "what should we charge for a fourth clinic?", "x".repeat(200)]) {
      expect(await answerByRules(q, run)).toBeNull();
    }
    expect(run).not.toHaveBeenCalled();
  });

  it("says so when nothing needs attention", async () => {
    expect(await answerByRules("any domain orders needing review?", async () => [])).toBe("No domain orders need review.");
  });
});
