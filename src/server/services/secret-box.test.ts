import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret } from "./secret-box";

beforeEach(() => vi.stubEnv("BETTER_AUTH_SECRET", "a-long-test-secret-value-for-hkdf"));
afterEach(() => vi.unstubAllEnvs());

describe("secret box", () => {
  it("round-trips and never stores the plaintext", () => {
    const stored = encryptSecret("AIzaSy-example-key-123456");
    expect(stored.startsWith("v1:")).toBe(true);
    expect(stored).not.toContain("AIzaSy");
    expect(decryptSecret(stored)).toBe("AIzaSy-example-key-123456");
  });

  it("uses a fresh nonce each time", () => {
    expect(encryptSecret("same-value-same-value")).not.toBe(encryptSecret("same-value-same-value"));
  });

  it("refuses tampered data and the wrong app secret", () => {
    const stored = encryptSecret("a-secret-value-1234567");
    const parts = stored.split(":");
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("AA") ? "BB" : "AA");
    expect(() => decryptSecret(parts.join(":"))).toThrow();
    vi.stubEnv("BETTER_AUTH_SECRET", "a-different-secret-entirely-xxxxxx");
    expect(() => decryptSecret(stored)).toThrow();
  });
});
