// Creates the one DataBridgeSol super admin: a verified account with a password
// and a platform_admins row. Nothing to sign up for or verify.
//
//   SUPER_ADMIN_PASSWORD='…' node --env-file=.env.local scripts/seed-super-admin.mjs
//
// The password comes from the environment, never from the repo, and is hashed
// with better-auth's own scrypt hasher so it signs in like any other account.
// Idempotent: an existing account keeps its password (this never overwrites a
// credential), and a second, different admin is refused — there is exactly one.
import { randomBytes } from "node:crypto";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";

const EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "med.healthbridge@gmail.com").trim().toLowerCase();
const NAME = process.env.SUPER_ADMIN_NAME ?? "DataBridgeSol Admin";
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const newId = () => randomBytes(16).toString("hex");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("begin");
  // Serialises concurrent runs so two can't both pass the "only one" check.
  await client.query("select pg_advisory_xact_lock(hashtext('seed-super-admin'))");

  const { rows: admins } = await client.query("select user_id from platform_admins");
  const { rows: users } = await client.query('select id from "user" where lower(email) = $1', [EMAIL]);
  let userId = users[0]?.id;

  if (admins.length > 0 && !admins.some((admin) => admin.user_id === userId)) {
    console.error("A different super admin already exists. This seeder only ever creates one.");
    process.exit(1);
  }

  if (!userId) {
    if (!PASSWORD) {
      console.error("SUPER_ADMIN_PASSWORD is required to create the account.");
      process.exit(1);
    }
    userId = newId();
    await client.query(
      'insert into "user" (id, name, email, email_verified) values ($1, $2, $3, true)',
      [userId, NAME, EMAIL],
    );
    await client.query(
      "insert into account (id, user_id, provider_id, account_id, password) values ($1, $2, 'credential', $2, $3)",
      [newId(), userId, await hashPassword(PASSWORD)],
    );
    console.log(`Created ${EMAIL} (verified).`);
  } else {
    // Seeded accounts never need an email round-trip.
    await client.query('update "user" set email_verified = true where id = $1', [userId]);
  }

  if (admins.length === 0) {
    await client.query("insert into platform_admins (user_id) values ($1)", [userId]);
    console.log(`${EMAIL} is now the super admin.`);
  } else {
    console.log(`${EMAIL} is already the super admin.`);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
