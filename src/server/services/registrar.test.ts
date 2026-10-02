import { describe, expect, it } from "vitest";
import { candidateDomains, normalizeDomain } from "./registrar";

describe("normalizeDomain", () => {
  it("strips scheme, path and www, and lower-cases", () => {
    expect(normalizeDomain("HTTPS://www.BrightSmile.com/about")).toBe("brightsmile.com");
  });
  it("rejects things that are not a registrable domain", () => {
    for (const bad of ["brightsmile", "bad_name.com", "-a.com", "a b.com", ""]) expect(normalizeDomain(bad)).toBeNull();
  });
});

describe("candidateDomains", () => {
  it("offers the common extensions for a bare name", () => {
    expect(candidateDomains("Bright Smile!")).toContain("brightsmile.com");
    expect(candidateDomains("brightsmile").length).toBeGreaterThan(1);
  });
  it("keeps a full domain as the only candidate", () => {
    expect(candidateDomains("brightsmile.org")).toEqual(["brightsmile.org"]);
  });
  it("offers nothing for a too-short name", () => {
    expect(candidateDomains("a")).toEqual([]);
  });
});
