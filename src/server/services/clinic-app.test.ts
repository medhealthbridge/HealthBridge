import { describe, expect, it } from "vitest";
import { dayBounds, NEXT_STATUS } from "./clinic-app";

describe("dayBounds", () => {
  it("covers the clinic's local day, not UTC's", () => {
    // 2026-10-01 20:00 UTC is already 2 Oct 04:00 in Manila (UTC+8).
    const { start, end } = dayBounds("Asia/Manila", new Date("2026-10-01T20:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-01T16:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe("appointment workflow", () => {
  it("only moves forward, and finished states are terminal", () => {
    expect(NEXT_STATUS.confirmed).toContain("checked_in");
    expect(NEXT_STATUS.checked_in).not.toContain("completed");
    for (const done of ["completed", "cancelled", "no_show"] as const) expect(NEXT_STATUS[done]).toEqual([]);
  });
});
