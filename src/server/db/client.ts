import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// node-postgres can't parameterize SET LOCAL, so the id is interpolated —
// this guard is what keeps that safe. It runs on every call, not just at
// the boundary, since `withTenant`/`withAccount` are the only thing standing
// between a caller and a raw SQL string.
function assertUuid(id: string, label: string) {
  if (!UUID_RE.test(id)) {
    throw new Error(`${label} must be a uuid, got: ${id}`);
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Runs `fn` inside a transaction with `app.current_clinic_id` set for the
 * duration of that transaction, so every tenant table's RLS policy
 * (`clinic_id = current_setting('app.current_clinic_id', true)::uuid`)
 * scopes rows to this clinic. This is the *only* place that should call
 * `SET LOCAL` — services never do it inline per-query (db-schema-architect
 * skill). `clinicId` must already be authorized for the current session by
 * `src/server/auth.ts` before calling this.
 */
export async function withTenant<T>(clinicId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  assertUuid(clinicId, "clinicId");
  return db.transaction(async (tx) => {
    await tx.execute(`set local app.current_clinic_id = '${clinicId}'`);
    return fn(tx);
  });
}

/**
 * Same idea as `withTenant`, for the handful of account-scoped tables that
 * span multiple clinics under one billing account (subscriptions,
 * domain_lookups, inventory_transfers) — see their RLS policies, which read
 * `app.current_account_id` instead of `app.current_clinic_id`.
 */
export async function withAccount<T>(accountId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  assertUuid(accountId, "accountId");
  return db.transaction(async (tx) => {
    await tx.execute(`set local app.current_account_id = '${accountId}'`);
    return fn(tx);
  });
}

/**
 * Both settings in one transaction, for creating a new account together
 * with its first clinic (onboarding): the account-scoped rows and the
 * clinic-scoped rows must commit or roll back as a unit, and the migration's
 * RLS note requires each new row's own id to be set before its insert.
 */
export async function withAccountAndClinic<T>(
  accountId: string,
  clinicId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  assertUuid(accountId, "accountId");
  assertUuid(clinicId, "clinicId");
  return db.transaction(async (tx) => {
    await tx.execute(`set local app.current_account_id = '${accountId}'`);
    await tx.execute(`set local app.current_clinic_id = '${clinicId}'`);
    return fn(tx);
  });
}
