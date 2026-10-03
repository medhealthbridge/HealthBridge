import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { db } from "@/src/server/db/client";
import { account } from "@/src/server/db/schema";
import { consumeRateLimit } from "./rate-limit";

/** How long a successful password check unlocks edits. Deletes ignore it and always ask. */
export const UNLOCK_SECONDS = 10 * 60;

function key() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set.");
  return Buffer.from(hkdfSync("sha256", secret, "databridgesol-step-up", "agent-unlock-v1", 32));
}

const sign = (userId: string, expires: number) => createHmac("sha256", key()).update(`${userId}.${expires}`).digest("base64url");

/** A short-lived proof that this user just re-entered their password; carried in an httpOnly cookie. */
export function issueUnlockToken(userId: string, now = Date.now()) {
  const expires = Math.floor(now / 1000) + UNLOCK_SECONDS;
  return { token: `${expires}.${sign(userId, expires)}`, maxAge: UNLOCK_SECONDS };
}

export function unlockTokenValid(userId: string, token: string | undefined, now = Date.now()) {
  const [expiresRaw, mac] = (token ?? "").split(".");
  const expires = Number(expiresRaw);
  if (!mac || !Number.isInteger(expires) || expires < Math.floor(now / 1000)) return false;
  const expected = Buffer.from(sign(userId, expires));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export type PasswordCheck = "ok" | "wrong" | "locked";

/** Checks the signed-in user's own password. Five wrong tries in 15 minutes locks further attempts. */
export async function checkOwnPassword(userId: string, password: string): Promise<PasswordCheck> {
  const limit = await consumeRateLimit("agent-step-up", userId, { max: 5, windowSeconds: 15 * 60 });
  if (!limit.allowed) return "locked";
  const [row] = await db
    .select({ hash: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);
  // A social-only account has no password to check, so it can't pass step-up.
  if (!row?.hash) return "wrong";
  return (await verifyPassword({ hash: row.hash, password })) ? "ok" : "wrong";
}
