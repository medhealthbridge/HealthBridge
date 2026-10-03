import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueUnlockToken, UNLOCK_SECONDS, unlockTokenValid } from "./step-up";

beforeEach(() => vi.stubEnv("BETTER_AUTH_SECRET", "a-long-test-secret-value-for-hkdf"));
afterEach(() => vi.unstubAllEnvs());

describe("unlock token", () => {
  const now = 1_800_000_000_000;

  it("is valid for the user it was issued to, until it expires", () => {
    const { token } = issueUnlockToken("user-1", now);
    expect(unlockTokenValid("user-1", token, now + 1000)).toBe(true);
    expect(unlockTokenValid("user-1", token, now + (UNLOCK_SECONDS + 5) * 1000)).toBe(false);
  });

  it("is useless to anyone else, or if altered", () => {
    const { token } = issueUnlockToken("user-1", now);
    expect(unlockTokenValid("user-2", token, now)).toBe(false);
    const [expires, mac] = token.split(".");
    expect(unlockTokenValid("user-1", `${Number(expires) + 600}.${mac}`, now)).toBe(false);
    expect(unlockTokenValid("user-1", undefined, now)).toBe(false);
    expect(unlockTokenValid("user-1", "garbage", now)).toBe(false);
  });
});
