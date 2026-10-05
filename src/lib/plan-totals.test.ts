import { describe, expect, it } from "vitest";
import { nextPlanStatus, planSummary, type PlanItemLike } from "./plan-totals";

const item = (over: Partial<PlanItemLike>): PlanItemLike => ({ phase: 1, status: "planned", unitPriceCents: 100_00, quantity: 1, invoiceId: null, ...over });

describe("planSummary", () => {
  it("sums the estimate, finished and billed work, ignoring cancelled items", () => {
    const s = planSummary([item({}), item({ status: "done", quantity: 2, invoiceId: "inv" }), item({ status: "cancelled", unitPriceCents: 999_00 }), item({ phase: 2 })]);
    expect(s).toMatchObject({ estimateCents: 400_00, doneCents: 200_00, billedCents: 200_00, toBillCents: 200_00, activeCount: 3, doneCount: 1 });
    expect(s.byPhase).toEqual([{ phase: 1, totalCents: 300_00, done: 1, count: 2 }, { phase: 2, totalCents: 100_00, done: 0, count: 1 }]);
  });
});

describe("nextPlanStatus", () => {
  it("starts when the first item is done and completes when all are", () => {
    expect(nextPlanStatus("accepted", [item({ status: "done" }), item({})])).toBe("in_progress");
    expect(nextPlanStatus("in_progress", [item({ status: "done" }), item({ status: "done" })])).toBe("completed");
  });
  it("steps back when work is marked not done", () => {
    expect(nextPlanStatus("in_progress", [item({}), item({})])).toBe("accepted");
    expect(nextPlanStatus("completed", [item({ status: "done" }), item({})])).toBe("in_progress");
  });
  it("leaves a cancelled plan, and a draft with nothing done, alone", () => {
    expect(nextPlanStatus("cancelled", [item({ status: "done" })])).toBe("cancelled");
    expect(nextPlanStatus("draft", [item({})])).toBe("draft");
    expect(nextPlanStatus("proposed", [item({})])).toBe("proposed");
  });
});
