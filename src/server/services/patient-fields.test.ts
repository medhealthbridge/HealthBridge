import { describe, expect, it } from "vitest";
import { canManageField, visibleTo } from "./patient-fields";
import type { FieldDefinition } from "@/src/lib/patient-fields";

const field = (over: Partial<FieldDefinition>): FieldDefinition => ({
  id: "f", key: "k", label: "L", type: "text", options: [], required: false, medical: false, section: "S", sortOrder: 1, scope: "standard", createdByStaffId: "owner", createdByName: null, archived: false, ...over,
});

describe("patient field permissions", () => {
  it("lets the owner manage every field", () => {
    expect(canManageField({ role: "owner", staffId: "x" }, field({ scope: "addon", createdByStaffId: "doc" }))).toBe(true);
  });
  it("lets a practitioner manage only their own add-ons", () => {
    expect(canManageField({ role: "practitioner", staffId: "doc" }, field({ scope: "addon", createdByStaffId: "doc" }))).toBe(true);
    expect(canManageField({ role: "practitioner", staffId: "doc" }, field({ scope: "addon", createdByStaffId: "other" }))).toBe(false);
    expect(canManageField({ role: "practitioner", staffId: "doc" }, field({ scope: "standard", createdByStaffId: "doc" }))).toBe(false);
  });
  it("never lets the front desk manage fields", () => {
    expect(canManageField({ role: "assistant", staffId: "a" }, field({ scope: "addon", createdByStaffId: "a" }))).toBe(false);
  });
  it("hides medical fields from the front desk only", () => {
    const list = [field({ key: "a" }), field({ key: "b", medical: true })];
    expect(visibleTo("assistant", list).map((f) => f.key)).toEqual(["a"]);
    expect(visibleTo("practitioner", list)).toHaveLength(2);
  });
});
