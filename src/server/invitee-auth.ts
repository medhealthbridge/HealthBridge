import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db/client";
import { user } from "./db/schema";

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
    await auth.api.signInEmail({ body: { email, password }, headers });
    await grant(existingUserId);
    return;
  }
  const created = await auth.api.signUpEmail({ body: { name, email, password }, headers });
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, created.user.id));
  await grant(created.user.id);
  await auth.api.signInEmail({ body: { email, password }, headers });
}
