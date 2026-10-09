import { describe, expect, it } from "vitest";
import { deriveToothStates, type ChartEntry } from "./dental-chart";
import { draftSoapNote } from "./dental-soap";

const e = (tooth: number, code: string, kind: ChartEntry["kind"], surfaces: string | null = null): ChartEntry => ({ id: `${tooth}${code}`, tooth, code, kind, surfaces, occurredOn: "2026-10-01" });

describe("draftSoapNote", () => {
  // The worked example from the reference chart: RCT indicated #11, caries #16 and #43, crown #36, bridge #24, filling #46.
  const states = deriveToothStates([
    e(11, "periapical", "condition"), e(16, "caries", "condition", "O"), e(43, "caries", "condition", "B"),
    e(36, "crown", "procedure"), e(24, "bridge", "procedure"), e(46, "filling", "procedure", "O"),
  ]);

  it("lists findings and existing work in the objective", () => {
    const note = draftSoapNote(states);
    expect(note.objective).toContain("Periapical lesion on #11.");
    expect(note.objective).toContain("Caries on #16 (O), #43 (B).");
    expect(note.objective).toContain("Crown: #36.");
    expect(note.objective).toContain("Filling: #46.");
  });
  it("counts findings and quadrants", () => {
    // 3 findings (#11, #16, #43) in quadrants 1 and 4.
    expect(draftSoapNote(states).assessment).toBe("3 findings across 2 quadrants. Teeth involved: #11, #16, #43.");
  });
  it("suggests next steps when nothing is planned", () => {
    expect(draftSoapNote(states).plan).toBe("Evaluate for root canal treatment #11 and restore (filling) #16, #43.");
  });
  it("uses the treatment plan when there is one", () => {
    expect(draftSoapNote(states, [{ tooth: 11, description: "Root canal" }, { tooth: null, description: "Cleaning" }]).plan).toBe("Root canal #11 and Cleaning.");
  });
  it("handles an empty chart", () => {
    const note = draftSoapNote(new Map());
    expect([note.objective, note.assessment, note.plan]).toEqual(["No findings charted.", "No active findings charted.", "Routine recall."]);
  });
});
