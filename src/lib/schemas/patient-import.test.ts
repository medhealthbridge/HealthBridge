import { describe, expect, it } from "vitest";
import { parsePatientImport } from "./patient-import";

const header = "first_name,last_name,sex,birth_date,mobile,philhealth_pin,osca_id,pwd_id";

describe("parsePatientImport", () => {
  it("accepts good rows and reports bad ones by line", () => {
    const result = parsePatientImport(`${header}\nMaria,Santos,f,1990-05-01,0917 555 4412,,,\nJuan,,M,,,,,\n`);
    if (!result.ok) throw new Error(result.message);
    expect(result.rows).toHaveLength(2);
    expect("patient" in result.rows[0] && result.rows[0].patient.sex).toBe("F");
    expect(result.rows[1]).toMatchObject({ line: 3 });
    expect("errors" in result.rows[1]).toBe(true);
  });
  it("needs the required columns", () => {
    expect(parsePatientImport("name,age\nA,1")).toMatchObject({ ok: false });
  });
  it("caps the row count", () => {
    const many = Array.from({ length: 501 }, () => "A,B,F,,,,,").join("\n");
    expect(parsePatientImport(`${header}\n${many}`)).toMatchObject({ ok: false });
  });
});
