// Fills the company admin's Tenants page with demo accounts so it isn't empty
// in development or a demo. Never run against a database holding real clients
// you don't want mixed with demo rows; every demo row is recognisable by an
// owner email ending in @seed.invalid, which can't receive mail or sign in
// (no credential account is created).
//
//   node --env-file=.env.local scripts/seed-demo-tenants.mjs          # add
//   node --env-file=.env.local scripts/seed-demo-tenants.mjs --remove # remove
//
// Idempotent: existing demo rows are skipped.
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

// Seeding writes across tenants (and creates users), so it connects as the database owner:
// DATABASE_ADMIN_URL when set, otherwise DATABASE_URL (the app's own, restricted role cannot do this).
const ADMIN_URL = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;

const DAY = 24 * 60 * 60 * 1000;
const at = (days) => new Date(Date.now() + days * DAY);

const DEMO = [
  { slug: "demo-bright-smile", company: "Bright Smile Dental Group", tier: "tier_2", status: "active", clinics: [["Bright Smile — Makati", "dental"], ["Bright Smile — BGC", "dental"]], period: 90 },
  { slug: "demo-pawcare", company: "PawCare Veterinary Network", tier: "tier_1", status: "trialing", clinics: [["PawCare — Quezon City", "vet"]], period: 6 },
  { slug: "demo-clearview", company: "ClearView Eye Institute", tier: "tier_3", status: "active", clinics: [["ClearView — Ortigas", "eye"], ["ClearView — Cebu", "eye"], ["ClearView — Davao", "eye"]], period: 150 },
  { slug: "demo-metro-derma", company: "Metro Derma Skin Clinics", tier: "tier_1", status: "past_due", clinics: [["Metro Derma — Pasig", "derma"]], period: -12 },
  { slug: "demo-wellsprings", company: "Wellsprings Family Medicine", tier: "enterprise", status: "active", clinics: [["Wellsprings — Main", "general"], ["Wellsprings — North", "general"]], period: 210 },
  { slug: "demo-sunrise-dental", company: "Sunrise Dental Care", tier: "tier_1", status: "canceled", clinics: [["Sunrise Dental", "dental"]], period: -60 },
  { slug: "demo-vetlink", company: "VetLink Animal Hospitals", tier: "tier_4", status: "active", clinics: [["VetLink — Manila", "vet"], ["VetLink — Laguna", "vet"]], period: 75 },
  { slug: "demo-optiplus", company: "OptiPlus Vision Centers", tier: "tier_1", status: "trialing", clinics: [["OptiPlus — Alabang", "eye"]], period: 3 },
];
const SLOTS = { tier_1: 1, tier_2: 2, tier_3: 3, tier_4: 4, enterprise: 99 };
const email = (slug) => `${slug}@seed.invalid`;

if (!ADMIN_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const client = new pg.Client({ connectionString: ADMIN_URL });
await client.connect();
try {
  await client.query("begin");
  if (process.argv.includes("--remove")) {
    const ids = `(select id from "user" where email like '%@seed.invalid')`;
    const acc = `(select id from accounts where owner_user_id in ${ids})`;
    // Children first: nothing else references these demo rows.
    await client.query(`delete from domain_lookups where clinic_id in (select id from clinics where account_id in ${acc})`);
    await client.query(`delete from clinic_staff where clinic_id in (select id from clinics where account_id in ${acc})`);
    await client.query(`delete from clinics where account_id in ${acc}`);
    await client.query(`delete from subscriptions where account_id in ${acc}`);
    await client.query(`delete from accounts where owner_user_id in ${ids}`);
    const { rowCount } = await client.query(`delete from "user" where email like '%@seed.invalid'`);
    console.log(`Removed ${rowCount} demo owners and their tenants.`);
  } else {
    let added = 0;
    for (const demo of DEMO) {
      const exists = await client.query('select 1 from "user" where email = $1', [email(demo.slug)]);
      if (exists.rowCount) continue;
      const userId = randomBytes(16).toString("hex");
      const accountId = randomUUID();
      const trial = demo.status === "trialing";
      await client.query('insert into "user" (id, name, email, email_verified) values ($1,$2,$3,true)', [userId, `${demo.company} (demo)`, email(demo.slug)]);
      await client.query("insert into accounts (id, owner_user_id, company_name) values ($1,$2,$3)", [accountId, userId, demo.company]);
      await client.query(
        "insert into subscriptions (account_id, tier, billing_interval, status, clinic_slot_limit, trial_ends_at, current_period_ends_at) values ($1,$2,'monthly',$3,$4,$5,$6)",
        [accountId, demo.tier, demo.status, SLOTS[demo.tier], trial ? at(demo.period) : null, trial ? null : at(demo.period)],
      );
      for (const [index, [name, specialty]] of demo.clinics.entries()) {
        const clinicId = randomUUID();
        const subdomain = `${demo.slug}${index ? `-${index + 1}` : ""}`;
        // Row-level security wants each new row's own ids set before its insert.
        await client.query("select set_config('app.current_account_id', $1, true), set_config('app.current_clinic_id', $2, true)", [accountId, clinicId]);
        await client.query("insert into clinics (id, account_id, name, subdomain, specialty) values ($1,$2,$3,$4,$5)", [clinicId, accountId, name, subdomain, specialty]);
      }
      added++;
    }
    console.log(`Added ${added} demo tenants (${DEMO.length - added} already present).`);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
