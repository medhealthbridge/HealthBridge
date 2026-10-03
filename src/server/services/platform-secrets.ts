import { eq } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { platformSecrets, type SecretKey } from "@/src/server/db/schema";
import { decryptSecret, encryptSecret } from "./secret-box";

const ENV_FALLBACK: Record<SecretKey, string> = { gemini_api_key: "GEMINI_API_KEY", anthropic_api_key: "ANTHROPIC_API_KEY" };

/** The credential, preferring one pasted into the admin over an environment variable. Null when neither is set or it can't be decrypted. */
export async function getSecret(name: SecretKey): Promise<string | null> {
  const [row] = await db.select({ value: platformSecrets.valueEncrypted }).from(platformSecrets).where(eq(platformSecrets.key, name)).limit(1);
  if (row) {
    try {
      return decryptSecret(row.value);
    } catch {
      console.error(`[secrets] ${name} could not be decrypted; paste it again in AI settings.`);
    }
  }
  return process.env[ENV_FALLBACK[name]] || null;
}

export async function saveSecret(name: SecretKey, value: string, userId: string) {
  const row = { valueEncrypted: encryptSecret(value), last4: value.slice(-4), updatedByUserId: userId, updatedAt: new Date() };
  await db.insert(platformSecrets).values({ key: name, ...row }).onConflictDoUpdate({ target: platformSecrets.key, set: row });
}

export async function removeSecret(name: SecretKey) {
  await db.delete(platformSecrets).where(eq(platformSecrets.key, name));
}

export type SecretStatus = { source: "admin" | "env" | "none"; last4: string | null; updatedAt: Date | null };

/** What the settings page may show: where the key comes from and its last four characters, never the key. */
export async function secretStatuses(): Promise<Record<SecretKey, SecretStatus>> {
  const rows = await db.select({ key: platformSecrets.key, last4: platformSecrets.last4, updatedAt: platformSecrets.updatedAt }).from(platformSecrets);
  const status = (name: SecretKey): SecretStatus => {
    const row = rows.find((candidate) => candidate.key === name);
    if (row) return { source: "admin", last4: row.last4, updatedAt: row.updatedAt };
    return { source: process.env[ENV_FALLBACK[name]] ? "env" : "none", last4: null, updatedAt: null };
  };
  return { gemini_api_key: status("gemini_api_key"), anthropic_api_key: status("anthropic_api_key") };
}
