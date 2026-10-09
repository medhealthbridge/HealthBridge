import { describe, expect, it } from "vitest";
import { chartEntrySchema, deriveToothStates, guessChartCode, describeTooth, kindOf, normalizeSurfaces, PERMANENT_TEETH, PRIMARY_TEETH, isTooth, rootCount, toothName, universalLabel, universalNumber, type ChartEntry } from "./dental-chart";

const entry = (over: Partial<ChartEntry>): ChartEntry => ({ id: Math.random().toString(), tooth: 16, surfaces: null, kind: "condition", code: "caries", occurredOn: "2026-01-01", ...over });

describe("tooth numbering", () => {
  it("has 32 distinct permanent teeth", () => expect(new Set(PERMANENT_TEETH).size).toBe(32));
  it("converts FDI to Universal", () => {
    expect([18, 11, 21, 28, 38, 31, 41, 48].map(universalNumber)).toEqual([1, 8, 9, 16, 17, 24, 25, 32]);
    expect(new Set(PERMANENT_TEETH.map(universalNumber)).size).toBe(32);
  });
  it("names teeth and counts roots", () => {
    expect(toothName(16)).toBe("Upper right first molar");
    expect(toothName(38)).toBe("Lower left third molar (wisdom)");
    expect(kindOf(13)).toBe("canine");
    expect([rootCount(16), rootCount(46), rootCount(14), rootCount(25), rootCount(11)]).toEqual([3, 2, 2, 1, 1]);
  });
  it("cleans surface input", () => expect(normalizeSurfaces("dmx o m")).toBe("MDO"));
});

describe("deriveToothStates", () => {
  it("a filling clears decay on the surfaces it covers, not elsewhere", () => {
    const states = deriveToothStates([entry({ code: "caries", surfaces: "MO" }), entry({ code: "filling", kind: "procedure", surfaces: "O", occurredOn: "2026-02-01" })]);
    const tooth = states.get(16)!;
    expect(tooth.caries).toBe("M");
    expect(tooth.filling).toBe("O");
    expect(tooth.headline).toBe("caries");
  });
  it("an extraction leaves the tooth missing and clears its other findings; an implant fills the gap", () => {
    let states = deriveToothStates([entry({ code: "caries", surfaces: "O" }), entry({ code: "rct", kind: "procedure" }), entry({ code: "extraction", kind: "procedure", occurredOn: "2026-03-01" })]);
    expect(states.get(16)).toMatchObject({ missing: true, rct: false, caries: "", headline: "missing" });
    states = deriveToothStates([entry({ code: "extraction", kind: "procedure" }), entry({ code: "implant", kind: "procedure", occurredOn: "2026-06-01" })]);
    expect(states.get(16)).toMatchObject({ missing: false, implant: true, headline: "implant" });
  });
  it("ignores voided entries and uses the date order, not insertion order", () => {
    const later = entry({ code: "crown", kind: "procedure", occurredOn: "2026-05-01" });
    const earlier = entry({ code: "caries", occurredOn: "2026-01-01" });
    expect(deriveToothStates([later, earlier]).get(16)!.caries).toBe("");
    expect(deriveToothStates([entry({ code: "fracture", voided: true })]).get(16)).toBeUndefined();
  });
  it("describes a tooth in words", () => {
    const states = deriveToothStates([entry({ code: "filling", kind: "procedure", surfaces: "MOD" }), entry({ code: "rct", kind: "procedure" })]);
    expect(describeTooth(states.get(16))).toBe("root canal, filling MDO");
    expect(describeTooth(undefined)).toBe("No findings");
  });
});

describe("chartEntrySchema", () => {
  it("accepts a real tooth and known code, normalising surfaces", () => {
    expect(chartEntrySchema.parse({ tooth: "16", code: "filling", surfaces: "odm" })).toMatchObject({ tooth: 16, surfaces: "MDO" });
  });
  it("rejects a made-up tooth or code", () => {
    expect(chartEntrySchema.safeParse({ tooth: 19, code: "filling" }).success).toBe(false);
    expect(chartEntrySchema.safeParse({ tooth: 16, code: "magic" }).success).toBe(false);
  });
});

describe("guessChartCode", () => {
  it("maps common service names to what to chart", () => {
    expect(guessChartCode("Composite Filling")).toBe("filling");
    expect(guessChartCode("Root Canal Therapy")).toBe("rct");
    expect(guessChartCode("Tooth Extraction")).toBe("extraction");
    expect(guessChartCode("Porcelain Crown")).toBe("crown");
    expect(guessChartCode("Oral Prophylaxis (Cleaning)")).toBeNull();
  });
});

describe("baby teeth", () => {
  it("accepts FDI 51-85 and nothing in between", () => {
    expect(PRIMARY_TEETH.every(isTooth)).toBe(true);
    expect([50, 56, 66, 76, 86, 19, 9].some(isTooth)).toBe(false);
  });
  it("names and letters them", () => {
    expect(toothName(55)).toBe("Upper right baby second molar");
    expect(toothName(71)).toBe("Lower left baby central incisor");
    expect([55, 51, 61, 65, 75, 71, 81, 85].map(universalLabel)).toEqual(["A", "E", "F", "J", "K", "O", "P", "T"]);
    expect(new Set(PRIMARY_TEETH.map(universalLabel)).size).toBe(20);
  });
  it("gives baby molars molar roots", () => {
    expect([kindOf(54), rootCount(54), rootCount(84), kindOf(53)]).toEqual(["molar", 3, 2, "canine"]);
  });
});
