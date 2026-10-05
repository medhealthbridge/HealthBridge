import { describe, expect, it } from "vitest";
import { recallTiming } from "./recalls";

describe("recallTiming", () => {
  it("separates overdue, soon and later", () => {
    expect(recallTiming("2026-10-01", "2026-10-05")).toBe("overdue");
    expect(recallTiming("2026-10-05", "2026-10-05")).toBe("soon");
    expect(recallTiming("2026-11-04", "2026-10-05")).toBe("soon");
    expect(recallTiming("2026-11-05", "2026-10-05")).toBe("later");
  });
});
