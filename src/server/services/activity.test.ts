import { describe, expect, it } from "vitest";
import { describeActivity } from "./activity";

describe("describeActivity", () => {
  it("describes a receipt void with its reason", () => {
    const d = describeActivity("invoice", "delete", { after: { number: "OR-000003", reason: "wrong patient" } });
    expect(d.tone).toBe("danger");
    expect(d.meta).toBe("Archived or voided receipt · OR-000003 · reason: wrong patient");
  });
  it("describes stock use", () => {
    expect(describeActivity("inventory_item", "update", { used: 3, reason: "extraction" }).meta).toBe("Stock used inventory item · used 3 (extraction)");
  });
  it("tags record views", () => {
    expect(describeActivity("patient", "view", null).action).toBe("record_viewed");
  });
  it("falls back for unknown entities", () => {
    expect(describeActivity("new_thing", "create", null).meta).toBe("Added new thing");
  });
});
