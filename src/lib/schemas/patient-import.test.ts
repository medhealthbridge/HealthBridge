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

  const fields = [
    { key: "blood_type", label: "Blood type", type: "select" as const, options: ["A+", "O+"], required: false },
    { key: "medical_alerts", label: "Medical alerts", type: "multi_select" as const, options: ["Diabetes", "Pregnant"], required: false },
    { key: "last_dental_visit", label: "Last dental visit", type: "date" as const, options: [], required: true },
  ];
  it("fills the clinic's own fields from columns named like them", () => {
    const csv = `${header},Blood type,Medical alerts,Last dental visit\nMaria,Santos,F,,,,,,O+,Diabetes; Pregnant,2026-03-14\n`;
    const result = parsePatientImport(csv, fields);
    if (!result.ok) throw new Error(result.message);
    expect(result.customColumns).toEqual(["Blood type", "Medical alerts", "Last dental visit"]);
    expect("patient" in result.rows[0] && result.rows[0].patient.customFields).toEqual({ blood_type: "O+", medical_alerts: ["Diabetes", "Pregnant"], last_dental_visit: "2026-03-14" });
  });
  it("reports a bad answer by line, and a required column that is absent", () => {
    const bad = parsePatientImport(`${header},Blood type,Last dental visit\nMaria,Santos,F,,,,,,B-,2026-03-14\n`, fields);
    if (!bad.ok) throw new Error(bad.message);
    expect("errors" in bad.rows[0] && bad.rows[0].errors.join(" ")).toContain("Blood type");
    expect(parsePatientImport(`${header}\nMaria,Santos,F,,,,,\n`, fields)).toMatchObject({ ok: false });
  });
  it("lists columns it could not match instead of dropping them silently", () => {
    const result = parsePatientImport(`${header},Bloodtype,Last dental visit\nMaria,Santos,F,,,,,,O+,2026-03-14\n`, fields);
    if (!result.ok) throw new Error(result.message);
    expect(result.ignoredColumns).toEqual(["Bloodtype"]);
  });
});
