import { describe, expect, it } from "vitest";
import { stockStatus } from "./inventory";

describe("stockStatus", () => {
  const today = "2026-10-03";
  it("is out at zero", () => expect(stockStatus(0, 5, null, today)).toBe("out"));
  it("is low at or under the reorder level", () => expect(stockStatus(5, 5, null, today)).toBe("low"));
  it("flags stock expiring within 30 days", () => expect(stockStatus(20, 5, "2026-11-02", today)).toBe("expiring"));
  it("is ok when far from expiry", () => expect(stockStatus(20, 5, "2026-12-01", today)).toBe("ok"));
  it("low wins over expiring", () => expect(stockStatus(2, 5, "2026-10-10", today)).toBe("low"));
});
