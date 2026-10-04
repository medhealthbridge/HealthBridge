import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// Keep a few warm connections per instance: a new one costs a TLS handshake
// plus several round trips, which dominates a page that only runs a few queries.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8, keepAlive: true, idleTimeoutMillis: 60_000, connectionTimeoutMillis: 10_000 });

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
 * Runs `fn` with `app.current_user_id` set, for the user-scoped read policies
 * (e.g. `clinic_staff`'s `member_read`: "which clinics am I staff at?") that
 * have to work before any clinic is chosen. better-auth user ids aren't uuids,
 * so this goes through a parameterized `set_config` instead of `SET LOCAL`.
 * `userId` must come from the verified session, never from client input.
 */
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
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

/**
 * For the payment webhook, which knows only an order id (from a signed
 * payload) before any clinic is known. `domain_orders`' policy lets exactly
 * that one order through. Never call with an id taken from an unverified request.
 */
export async function withOrder<T>(orderId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  assertUuid(orderId, "orderId");
  return db.transaction(async (tx) => {
    await tx.execute(`set local app.current_order_id = '${orderId}'`);
    return fn(tx);
  });
}

/**
 * Read access across every tenant, for the company admin's own pages (tenant
 * list). The matching policies are SELECT-only. Call only after
 * `requirePlatformAdmin()` has passed in the same request.
 */
export async function withPlatformAdmin<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(`set local app.platform_admin = 'on'`);
    return fn(tx);
  });
}

/**
 * For redeeming an emailed staff invite: the visitor has only the token, before
 * any clinic is known. `staff_invites`' policy lets exactly the row with that
 * token's hash through. Pass the hash, never the raw token or an unverified id.
 */
export async function withInviteToken<T>(tokenHash: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_invite_hash', ${tokenHash}, true)`);
    return fn(tx);
  });
}
