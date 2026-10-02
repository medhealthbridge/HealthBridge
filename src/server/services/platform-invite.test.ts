import { describe, expect, it } from "vitest";
import { acceptInviteSchema, inviteAdminSchema } from "@/src/lib/schemas/platform-staff";
import { composePlatformInviteEmail } from "./email-templates";

describe("platform invite email", () => {
  it("escapes the inviter's name and carries the link in both bodies", () => {
    const url = "https://admin.databridgesol.space/invite?token=abc";
    const mail = composePlatformInviteEmail({ name: '<img src=x onerror="1">' }, "new@x.ph", url);
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("https://admin.databridgesol.space/invite?token=abc");
    expect(mail.text).toContain(url);
  });
});

describe("invite schemas", () => {
  it("normalises the invited email", () => {
    expect(inviteAdminSchema.parse({ email: "  New@X.PH " }).email).toBe("new@x.ph");
    expect(inviteAdminSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
  it("bounds the password like sign-up does", () => {
    const token = "t".repeat(43);
    expect(acceptInviteSchema.safeParse({ token, password: "short" }).success).toBe(false);
    expect(acceptInviteSchema.safeParse({ token, password: "long-enough-1" }).success).toBe(true);
    expect(acceptInviteSchema.safeParse({ token: "x", password: "long-enough-1" }).success).toBe(false);
  });
});
