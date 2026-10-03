import { describe, expect, it } from "vitest";
import { clinicalNoteSchema, voidNoteSchema } from "./clinical-note";

describe("clinicalNoteSchema", () => {
  it("rejects an empty note", () => {
    expect(clinicalNoteSchema.safeParse({ subjective: "  ", plan: "" }).success).toBe(false);
  });
  it("accepts one section and trims it", () => {
    const parsed = clinicalNoteSchema.parse({ plan: "  Review in 2 weeks " });
    expect(parsed.plan).toBe("Review in 2 weeks");
    expect(parsed.appointmentId).toBeNull();
  });
  it("rejects over-long sections", () => {
    expect(clinicalNoteSchema.safeParse({ subjective: "x".repeat(4001) }).success).toBe(false);
  });
});

describe("voidNoteSchema", () => {
  const noteId = "7d3b2c0e-1a44-4a55-8f1e-0d9c6a1b2c3d";
  it("needs a real reason", () => {
    expect(voidNoteSchema.safeParse({ noteId, reason: "no" }).success).toBe(false);
    expect(voidNoteSchema.safeParse({ noteId, reason: "Wrong patient chart" }).success).toBe(true);
  });
});
