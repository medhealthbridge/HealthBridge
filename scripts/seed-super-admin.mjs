// Grants the one DataBridgeSol super admin. Run after that person has signed up
// and verified their email (an account can't be forged here, and a password
// never touches this script):
//
//   node --env-file=.env.local scripts/seed-super-admin.mjs
//
// Idempotent. Refuses to add a second admin: there is exactly one.
import pg from "pg";

const EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "med.healthbridge@gmail.com").trim().toLowerCase();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("begin");
  // Serialises concurrent runs so two can't both pass the "only one" check.
  await client.query("select pg_advisory_xact_lock(hashtext('seed-super-admin'))");

  const { rows: users } = await client.query(
    'select id, email_verified from "user" where lower(email) = $1',
    [EMAIL],
  );
  if (users.length === 0) {
    console.error(`No account for ${EMAIL}. Sign up at https://admin.databridgesol.space/clinix-ph/auth?mode=signup, verify the email, then run this again.`);
    process.exit(1);
  }
  if (!users[0].email_verified) {
    console.error(`${EMAIL} hasn't verified their email yet. Open the verification link first.`);
    process.exit(1);
  }

  const { rows: admins } = await client.query("select user_id from platform_admins");
  if (admins.some((admin) => admin.user_id === users[0].id)) {
    console.log(`${EMAIL} is already the super admin.`);
  } else if (admins.length > 0) {
    console.error("A different super admin already exists. This seeder only ever creates one.");
    process.exit(1);
  } else {
    await client.query("insert into platform_admins (user_id) values ($1)", [users[0].id]);
    console.log(`${EMAIL} is now the super admin.`);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
