import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * AES-256-GCM with a key derived (HKDF-SHA256) from BETTER_AUTH_SECRET, so
 * pasted credentials need no extra environment variable. The cost: rotating
 * BETTER_AUTH_SECRET makes stored values undecryptable, and they must be pasted
 * again. A database leak alone reveals nothing; the app secret is needed too.
 */
function key() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set.");
  return Buffer.from(hkdfSync("sha256", secret, "databridgesol-secret-box", "platform-secrets-v1", 32));
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(":");
}

export function decryptSecret(stored: string) {
  const [version, iv, tag, body] = stored.split(":");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Unrecognised secret format.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}
