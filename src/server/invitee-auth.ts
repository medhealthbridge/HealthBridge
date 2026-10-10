import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db/client";
import { account, session, user } from "./db/schema";

/**
 * An unverified account belongs to nobody yet: anyone can type any email into sign-up. When the real owner of the
 * address shows up (a new sign-up, or an emailed invite they accepted), their password replaces whatever was set
 * before, and any session on the account ends. Without this, someone could register a dentist's email first, wait
 * for the dentist to verify it, and sign in with the password they chose (pre-registration hijack).
 */
export async function replaceUnverifiedPassword(userId: string, password: string, name?: string) {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const updated = await db
    .update(account)
    .set({ password: hash, updatedAt: new Date() })
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .returning({ id: account.id });
  if (updated.length === 0) {
    await db.insert(account).values({ id: randomUUID(), userId, providerId: "credential", accountId: userId, password: hash });
  }
  await db.delete(session).where(eq(session.userId, userId));
  if (name && name.trim().length >= 2) await db.update(user).set({ name: name.trim() }).where(eq(user.id, userId));
}

/** The account registered under `email`, if any, and whether its owner has proven the address. */
export async function findAccountByEmail(email: string) {
  const [row] = await db.select({ id: user.id, emailVerified: user.emailVerified }).from(user).where(eq(user.email, email.trim().toLowerCase())).limit(1);
  return row ?? null;
}

type Identity = {
  email: string;
  name: string;
  password: string;
  /** The user already registered under `email`, if any. */
  existingUserId?: string;
  headers: Headers;
  /** Runs once the person is known, before they are signed in (gives them their role). */
  grant: (userId: string) => Promise<void>;
};

/**
 * The shared tail of every emailed invitation (company team, clinic staff): an
 * existing account proves itself with its own password; a new one is created
 * with the chosen password. Holding the emailed link verifies the address.
 * Throws better-auth's APIError on a wrong password or a failed sign-up.
 */
export async function acceptWithAccount({ email, name, password, existingUserId, headers, grant }: Identity) {
  if (existingUserId) {
    const [existing] = await db.select({ emailVerified: user.emailVerified }).from(user).where(eq(user.id, existingUserId)).limit(1);
    if (existing && !existing.emailVerified) {
      // Someone registered this address but never proved it. The invite link just did, so the invitee's own
      // password replaces theirs.
      await replaceUnverifiedPassword(existingUserId, password, name);
      await db.update(user).set({ emailVerified: true }).where(eq(user.id, existingUserId));
      await grant(existingUserId);
      await auth.api.signInEmail({ body: { email, password }, headers });
      return;
    }
    await auth.api.signInEmail({ body: { email, password }, headers });
    await grant(existingUserId);
    return;
  }
  const created = await auth.api.signUpEmail({ body: { name, email, password }, headers });
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, created.user.id));
  await grant(created.user.id);
  await auth.api.signInEmail({ body: { email, password }, headers });
}
