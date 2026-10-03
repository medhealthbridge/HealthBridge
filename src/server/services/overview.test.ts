import { describe, expect, it } from "vitest";
import { changeLabel, sparkHeights } from "./overview";

describe("overview helpers", () => {
  it("scales bars to the biggest day and never collapses to zero", () => {
    expect(sparkHeights([0, 50, 100])).toEqual([10, 50, 100]);
    expect(sparkHeights([0, 0])).toEqual([10, 10]);
  });
  it("labels change against last week", () => {
    expect(changeLabel(112, 100)).toBe("+12%");
    expect(changeLabel(80, 100)).toBe("-20%");
    expect(changeLabel(0, 0)).toBe("—");
    expect(changeLabel(50, 0)).toBe("new");
  });
});
