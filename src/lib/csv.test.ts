import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(toCsv(["a", "b"], [["x, y", 'say "hi"']])).toBe('﻿a,b\r\n"x, y","say ""hi"""\r\n');
  });
  it("neutralises spreadsheet formulas in text but not numbers", () => {
    const out = toCsv(["a"], [["=HYPERLINK(\"x\")"], [-5], ["+63917"]]);
    expect(out).toContain("'=HYPERLINK");
    expect(out).toContain("\r\n-5\r\n");
    expect(out).toContain("'+63917");
  });
  it("round-trips through the parser", () => {
    const rows = [["Maria, Jr.", 'she said "ok"', "line1\nline2"]];
    expect(parseCsv(toCsv(["a", "b", "c"], rows)).slice(1)).toEqual(rows);
  });
  it("skips blank lines and handles CRLF", () => {
    expect(parseCsv("a,b\r\n1,2\r\n\r\n3,4")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });
});
