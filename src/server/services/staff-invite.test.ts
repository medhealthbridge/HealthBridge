import { afterEach, describe, expect, it, vi } from "vitest";
import { clinicLinkOrigin } from "@/src/lib/clinic-host";
import { changeRoleSchema, inviteStaffSchema, joinSchema } from "@/src/lib/schemas/clinic-staff";
import { composeStaffInviteEmail } from "./email-templates";

afterEach(() => vi.unstubAllEnvs());

describe("staff invite email", () => {
  it("names the clinic and role, escapes the inviter, and carries the link", () => {
    const url = "https://bright.databridgesol.space/clinix-ph/join?token=abc";
    const mail = composeStaffInviteEmail("Bright Smile", '<b onmouseover="x">Dr. Reyes</b>', "assistant", url);
    expect(mail.subject).toContain("Bright Smile");
    expect(mail.html).toContain("front-desk assistant");
    expect(mail.html).not.toContain("<b onmouseover");
    expect(mail.text).toContain(url);
  });
});

describe("clinicLinkOrigin", () => {
  it("points at the clinic's own host when subdomains are on, else this server", () => {
    vi.stubEnv("CLINIC_SUBDOMAINS", "on");
    expect(clinicLinkOrigin("bright")).toBe("https://bright.databridgesol.space");
    vi.stubEnv("CLINIC_SUBDOMAINS", "");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    expect(clinicLinkOrigin("bright")).toBe("http://localhost:3000");
  });
});

describe("staff schemas", () => {
  it("accepts only the two invitable roles and normalises the email", () => {
    expect(inviteStaffSchema.parse({ email: "  Jane@X.PH ", role: "assistant" }).email).toBe("jane@x.ph");
    expect(inviteStaffSchema.safeParse({ email: "a@x.ph", role: "owner" }).success).toBe(false);
    expect(changeRoleSchema.safeParse({ staffId: "not-a-uuid", role: "practitioner" }).success).toBe(false);
  });
  it("bounds the join password like sign-up", () => {
    const token = "t".repeat(43);
    expect(joinSchema.safeParse({ token, password: "short" }).success).toBe(false);
    expect(joinSchema.safeParse({ token, password: "long-enough-1" }).success).toBe(true);
  });
});
