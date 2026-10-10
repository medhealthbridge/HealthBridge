import { describe, expect, it } from "vitest";
import { isPublicAuthEndpoint } from "./auth-routes";

describe("isPublicAuthEndpoint", () => {
  it("refuses direct sign-up, sign-in and account changes (Postman, curl, scripts)", () => {
    for (const [method, path] of [
      ["POST", "/sign-up/email"], ["POST", "/sign-in/email"], ["POST", "/sign-in/social"], ["POST", "/update-user"],
      ["POST", "/change-password"], ["POST", "/change-email"], ["POST", "/delete-user"], ["GET", "/list-sessions"],
      ["POST", "/revoke-sessions"], ["GET", "/get-session"], ["POST", "/request-password-reset"], ["POST", "/reset-password"],
      ["POST", "/one-time-token/verify"], ["POST", "/one-time-token/generate"], ["POST", "/send-verification-email"],
      ["GET", "/callback/github"], ["POST", "/callback/google"], ["POST", "/verify-email"], ["GET", "/reset-password/abc/extra"],
    ]) expect(isPublicAuthEndpoint(method, path), `${method} ${path}`).toBe(false);
  });
  it("keeps email links and social sign-in callbacks working", () => {
    for (const [method, path] of [
      ["GET", "/verify-email"], ["GET", "/reset-password/abc123"], ["GET", "/callback/google"], ["GET", "/callback/facebook"],
      ["POST", "/callback/apple"], ["GET", "/error"], ["get", "/verify-email/"],
    ]) expect(isPublicAuthEndpoint(method, path), `${method} ${path}`).toBe(true);
  });
});
