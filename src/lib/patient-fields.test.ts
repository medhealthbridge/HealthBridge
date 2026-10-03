import { describe, expect, it } from "vitest";
import { displayFieldValue, fieldDefinitionInputSchema, fieldKey, incompatibleValues, normalizeFieldValue, suggestionsFor } from "./patient-fields";

const select = { type: "select" as const, options: ["A+", "O+"], label: "Blood type" };

describe("patient fields", () => {
  it("makes stable keys from labels", () => {
    expect(fieldKey("Blood type")).toBe("blood_type");
    expect(fieldKey("Weight (kg)")).toBe("weight_kg");
    expect(fieldKey("!!!")).toBe("field");
  });
  it("validates values by type", () => {
    expect(normalizeFieldValue({ type: "number", options: [], label: "W" }, "1,250.5")).toEqual({ value: 1250.5 });
    expect(normalizeFieldValue({ type: "number", options: [], label: "W" }, "abc")).toHaveProperty("error");
    expect(normalizeFieldValue({ type: "date", options: [], label: "D" }, "2026-13-01")).toHaveProperty("error");
    expect(normalizeFieldValue({ type: "yes_no", options: [], label: "Y" }, "on")).toEqual({ value: true });
    expect(normalizeFieldValue(select, "B-")).toHaveProperty("error");
    expect(normalizeFieldValue({ ...select, type: "multi_select" }, ["A+", "A+"])).toEqual({ value: ["A+"] });
    expect(normalizeFieldValue(select, "")).toEqual({ value: null });
  });
  it("counts values that would not survive a type change", () => {
    expect(incompatibleValues(["12", "abc", null], { type: "number", options: [], label: "X" })).toBe(1);
    expect(incompatibleValues([12, true], { type: "text", options: [], label: "X" })).toBe(0);
  });
  it("needs two choices for pick-one fields", () => {
    expect(fieldDefinitionInputSchema.safeParse({ label: "Size", type: "select", options: ["S"] }).success).toBe(false);
    expect(fieldDefinitionInputSchema.safeParse({ label: "Size", type: "select", options: ["S", "M"] }).success).toBe(true);
  });
  it("shows values plainly", () => {
    expect(displayFieldValue("yes_no", false)).toBe("No");
    expect(displayFieldValue("multi_select", ["Latex", "Penicillin"])).toBe("Latex, Penicillin");
  });
  it("suggests by clinic type, falling back to general", () => {
    expect(suggestionsFor("dental").some((s) => s.label === "Medical alerts")).toBe(true);
    expect(suggestionsFor("unknown").some((s) => s.label === "Blood type")).toBe(true);
  });
});
