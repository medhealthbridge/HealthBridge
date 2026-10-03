import { describe, expect, it } from "vitest";
import { clinicLocalToUtc, dayBounds, NEXT_STATUS } from "./clinic-app";

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

describe("clinicLocalToUtc", () => {
  it("turns the time typed at the clinic into the real instant", () => {
    expect(clinicLocalToUtc("2026-10-05T15:00", "Asia/Manila").toISOString()).toBe("2026-10-05T07:00:00.000Z");
    expect(clinicLocalToUtc("2026-10-05T00:30", "Asia/Manila").toISOString()).toBe("2026-10-04T16:30:00.000Z");
  });
  it("handles a zone with daylight saving", () => {
    expect(clinicLocalToUtc("2026-07-01T09:00", "America/New_York").toISOString()).toBe("2026-07-01T13:00:00.000Z");
    expect(clinicLocalToUtc("2026-01-15T09:00", "America/New_York").toISOString()).toBe("2026-01-15T14:00:00.000Z");
  });
  it("rejects anything but YYYY-MM-DDTHH:mm", () => {
    expect(() => clinicLocalToUtc("tomorrow 3pm", "Asia/Manila")).toThrow();
  });
});
