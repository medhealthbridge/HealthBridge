// Creates the DataBridgeSol super admin: a verified account with a password
// and the one `super_admin` row. No sign-up, nothing to verify.
//
//   node --env-file=.env.local scripts/seed-super-admin.mjs
//   node --env-file=.env.local scripts/seed-super-admin.mjs --reset-password
//
// Prints a generated password once (set SUPER_ADMIN_PASSWORD to choose your
// own). Without --reset-password an existing account's password is never
// touched. Refuses to create a second super admin.
import { randomBytes, randomInt } from "node:crypto";
import pg from "pg";

// Seeding writes across tenants (and creates users), so it connects as the database owner:
// DATABASE_ADMIN_URL when set, otherwise DATABASE_URL (the app's own, restricted role cannot do this).
const ADMIN_URL = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
import { hashPassword } from "better-auth/crypto";

const EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "med.healthbridge@gmail.com").trim().toLowerCase();
const NAME = process.env.SUPER_ADMIN_NAME ?? "DataBridgeSol Admin";
const RESET = process.argv.includes("--reset-password");

// 20 chars from a set without look-alikes, always with a letter, digit and symbol.
function generatePassword() {
  const sets = ["abcdefghjkmnpqrstuvwxyz", "ABCDEFGHJKLMNPQRSTUVWXYZ", "23456789", "!@#$%^&*-_=+"];
  const chars = sets.flatMap((set) => [set[randomInt(set.length)]]);
  const all = sets.join("");
  while (chars.length < 20) chars.push(all[randomInt(all.length)]);
  return chars.sort(() => randomInt(3) - 1).join("");
}

if (!ADMIN_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const newId = () => randomBytes(16).toString("hex");
const client = new pg.Client({ connectionString: ADMIN_URL });
await client.connect();
try {
  await client.query("begin");
  // Serialises concurrent runs so two can't both pass the "only one" check.
  await client.query("select pg_advisory_xact_lock(hashtext('seed-super-admin'))");

  const { rows: supers } = await client.query("select user_id from platform_admins where role = 'super_admin'");
  const { rows: users } = await client.query('select id from "user" where lower(email) = $1', [EMAIL]);
  let userId = users[0]?.id;
  if (supers.length > 0 && !supers.some((row) => row.user_id === userId)) {
    console.error("A different super admin already exists. This seeder only ever creates one.");
    process.exit(1);
  }

  let password;
  if (!userId) {
    password = process.env.SUPER_ADMIN_PASSWORD ?? generatePassword();
    userId = newId();
    await client.query('insert into "user" (id, name, email, email_verified) values ($1,$2,$3,true)', [userId, NAME, EMAIL]);
    await client.query(
      "insert into account (id, user_id, provider_id, account_id, password) values ($1,$2,'credential',$2,$3)",
      [newId(), userId, await hashPassword(password)],
    );
  } else {
    await client.query('update "user" set email_verified = true where id = $1', [userId]);
    if (RESET) {
      password = process.env.SUPER_ADMIN_PASSWORD ?? generatePassword();
      const hash = await hashPassword(password);
      const { rowCount } = await client.query("update account set password = $2 where user_id = $1 and provider_id = 'credential'", [userId, hash]);
      if (!rowCount) {
        await client.query("insert into account (id, user_id, provider_id, account_id, password) values ($1,$2,'credential',$2,$3)", [newId(), userId, hash]);
      }
    }
  }

  await client.query(
    "insert into platform_admins (user_id, role, is_active) values ($1,'super_admin',true) on conflict (user_id) do update set role = 'super_admin', is_active = true",
    [userId],
  );
  await client.query("commit");
  console.log(`${EMAIL} is the super admin.`);
  if (password) console.log(`Password (shown once): ${password}`);
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
