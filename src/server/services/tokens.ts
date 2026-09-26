import { createHash, randomBytes } from "node:crypto";

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * A 256-bit single-use token (invite links, etc.). Email `token`, store only
 * `tokenHash`; to redeem, look the row up by `sha256Hex(submittedToken)`.
 */
export function newSecretToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256Hex(token) };
}
