# Database security: run the app as a restricted role

## The problem this fixes

Every tenant table has row-level security (RLS) so one clinic can never read another's rows. But the
app connected as `neondb_owner`, which has the `BYPASSRLS` attribute, so Postgres skipped every
policy. Only the application's own `WHERE clinic_id = …` filters protected tenants.

## What was done (2026-10-04)

1. **Migration `0018_rls_nullif_guard`** (applied): 19 policies cast the session setting straight to `uuid`.
   On a pooled connection that had already run a tenant query, an unset setting reads as `''` and the cast
   raises an error the first time a policy is evaluated. Each policy now uses `nullif(…, '')::uuid`, so an
   empty setting matches no rows instead of failing. Same rules otherwise.
2. **Role `clinix_app`** (created, no password yet; `scripts/create-app-role.sql`): `NOBYPASSRLS`, no
   superuser, no create-db/role, `SELECT/INSERT/UPDATE/DELETE` on the tables, **no update/delete on `audit_logs`**.
3. **Tested** inside a rolled-back transaction as `clinix_app`: an unset and an empty setting return no rows
   without errors; a clinic reads exactly its own rows; another clinic's rows are invisible and writing to
   them is refused; membership lookup by user works; account-scoped and platform-admin reads work; the
   tables without policies (users, sessions, rate limits) work; deleting or editing audit rows is refused.

## Cutover (needs you; about 5 minutes)

The app is **still connecting as the owner** until you do this.

1. **Set a password** for `clinix_app` in the Neon console (Roles) or run
   `ALTER ROLE clinix_app PASSWORD '<long random>';` in the SQL editor.
2. **Build its connection string**: copy your current *pooled* string and change the user and password to
   `clinix_app`. Keep `?sslmode=require`.
3. **Vercel → Environment Variables**: set `DATABASE_URL` to that string. Do **not** put the owner string in
   Vercel. Keep it locally as `DATABASE_ADMIN_URL` (in `.env.local`) for migrations and seed scripts.
4. **Redeploy**, then check: log in, open Patients, add a patient, take a checkout, open the Activity log,
   and check the admin Tenants page (platform-admin reads).
5. **Rollback if anything fails**: set `DATABASE_URL` back to the owner string and redeploy. Nothing in the
   database needs undoing.

## Rules going forward

- New tables must enable and force RLS with a `nullif(current_setting(…), '')::uuid` policy (see AGENTS.md).
- Migrations and seed scripts connect as the owner (`DATABASE_ADMIN_URL`); the deployed app never does.
- Anything that must read across tenants uses the existing helpers (`withPlatformAdmin`, `withInviteToken`,
  `withOrder`, `withUser`), each backed by a narrow policy, never a plain `db` query on a tenant table.
