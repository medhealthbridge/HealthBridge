# SCHEMA: DataBridgeSol / Clinix PH

Target data model, access rules, contracts, jobs and migrations. Column-level detail for BUILT tables is `docs/baseline/schema.md` (cite BSC-x.y); this file does not copy it. It gives the entity index, conventions, every change to the model, the target permission matrix (section 5), contracts, jobs and the migration plan. Where this file and the baseline disagree, this file is the target and the baseline is the as-built state to be migrated. Column names below are the real names in code unless marked NEW.

## 1. Conventions

- Primary keys `uuid` default `gen_random_uuid()`; better-auth tables keep `text` ids (owned by better-auth).
- Money: integer centavos in columns ending `_cents` (as built: `amount_cents`, `total_cents`), including new tables. No floats, no `numeric` for money.
- Time: `timestamptz`, stored UTC; `created_at` and `updated_at` on every mutable table; day logic uses clinic timezone (X-08).
- Status values: `text` plus a `const` tuple plus `$type<>()` plus a `CHECK` constraint in SQL (FR-118). No new pgEnum.
- Deletion: no hard deletes of clinical or financial rows by the app (NFR-15). Existing tables archive with `deleted_at` (patients, services, inventory_items and others, as built); new tables use `archived_at`. Void = `voided_at`, `voided_by`, `void_reason` (as built per table). Accounts and clinics are never deleted or archived by the app (Masterlock, FR-138).
- Tenant keys: `clinic_id` on clinic data; `account_id` on account data. Composite foreign keys `(clinic_id, parent_id)` keep children in the parent's clinic (exists).
- RLS: every new table gets `ENABLE` and `FORCE ROW LEVEL SECURITY` plus a `tenant_isolation` policy in the same migration, using `nullif(current_setting('app.x', true), '')::uuid`. Global tables without RLS are listed in section 4 with a reason. The isolation suite is generated from the rows with RLS = Y in section 2 (never from a hard-coded count).
- Audit: clinical and financial writes insert `audit_logs` in the same transaction; platform writes insert `platform_audit_logs`; subscription lifecycle inserts `subscription_events`. Append-only (trigger plus `REVOKE UPDATE, DELETE` from `clinix_app`): `audit_logs`, `subscription_events`, `platform_audit_logs`.
- Access to the database only through the `with*` helpers in `src/server/db/client.ts`.

## 2. Entity index

Tenant: C = `clinic_id`, A = `account_id`, G = global. RLS: Y = enabled and forced, N = none (reason in section 4). Rule: how rows leave the active set.

| ID | Table | Domain | Tenant | RLS | Rule | State |
|---|---|---|---|---|---|---|
| E-01 | user | auth | G | N | none | built |
| E-02 | session | auth | G | N | expires | built |
| E-03 | account (auth link) | auth | G | N | none | built |
| E-04 | verification | auth | G | N | expires | built |
| E-05 | accounts | platform | A | Y | never deleted | built |
| E-06 | clinics | platform | A, C | Y | never archived by app | built, add columns |
| E-07 | subscriptions | platform | A | Y | never deleted | built, alter |
| E-08 | domain_lookups | platform | C | Y (public read) | delete on expiry | built |
| E-09 | domain_orders | platform | C | Y | `expired` status | built |
| E-10 | clinic_staff | staff | C | Y | `deactivated_at` | built |
| E-11 | staff_invites | staff | C | Y | `revoked`/`used` | built |
| E-12 | platform_admins | platform | G | N | deactivate | built |
| E-13 | platform_invites | platform | G | N | revoke | built |
| E-14 | patients | clinical | C | Y | `deleted_at` | built, alter |
| E-15 | patient_attachments | clinical | C | Y | unused | built, unused (FR-119) |
| E-16 | clinical_notes | clinical | C | Y | void | built |
| E-17 | recalls | clinical | C | Y | status | built, constrain |
| E-18 | patient_invites | portal | C | Y | `revoked`/`used` | built |
| E-19 | patient_field_definitions | clinic | C | Y | archive | built |
| E-20 | appointments | scheduling | C | Y | status `cancelled` | built |
| E-21 | reminder_log | messages | C | Y | append | built |
| E-22 | services | billing | C | Y | `deleted_at` | built |
| E-23 | invoices | billing | C | Y | void | built, constrain |
| E-24 | invoice_line_items | billing | C | Y | with invoice | built |
| E-25 | payments | billing | C | Y | never edited | built, constrain |
| E-26 | hmo_claims | billing | C | Y | `withdrawn` | built |
| E-27 | invoice_installments | billing | C | Y | with invoice | built |
| E-28 | discount_types | billing | C | Y | archive | built |
| E-29 | inventory_items | inventory | C | Y | `deleted_at` | built |
| E-30 | inventory_batches | inventory | C | Y | quantity to 0 | built |
| E-31 | inventory_transfers | inventory | A | Y | unused | built, unused (FR-136, FR-119) |
| E-32 | treatment_plans | dental | C | Y | `cancelled` | built |
| E-33 | treatment_plan_items | dental | C | Y | `cancelled` | built |
| E-34 | dental_chart_entries | dental | C | Y | void, append-only | built |
| E-35 | audit_logs | audit | C | Y | append-only | built, harden |
| E-36 | agent_actions | AI | C nullable | N | status | built, add RLS (OQ-11) |
| E-37 | agent_usage | AI | G (add `clinic_id`, `account_id`) | N | append | built, alter |
| E-38 | platform_secrets | AI | G | N | replace | built |
| E-39 | platform_settings | AI | G | N | upsert | built |
| E-40 | rate_limits | infra | G | N | expires | built |
| E-41 | subscription_invoices | billing | A | Y | status only | NEW |
| E-42 | subscription_events | billing | A | Y | append-only | NEW |
| E-43 | platform_audit_logs | audit | G | N | append-only | NEW |
| E-44 | guardians | clinical | C | Y | `archived_at` | NEW |
| E-45 | privacy_requests | compliance | C | Y | status | NEW |
| E-46 | email_log | messages | A nullable | Y | append | NEW |
| E-47 | idempotency_keys | infra | G | N | expires 48 h | NEW |
| E-48 | patient_guardians | clinical | C | Y | with patient/guardian | NEW |
| E-49 | clinic_ai_usage | AI | C | Y | counter row per month | NEW |

## 3. Changes to the model

### 3.1 New tables

**E-41 subscription_invoices**: `id`, `account_id` FK accounts, `subscription_id` FK, `invoice_number` text (`SI-YYYY-000001`) unique per account, `kind` (`first`, `renewal`, `upgrade`, `domain`), `tier` text, `billing_interval` (`monthly`, `annual`), `amount_cents` int > 0, `status` (`open`, `paid`, `void`, `expired`, `failed`), `period_start`, `period_end` timestamptz, `due_at`, `provider` text default `paymongo`, `provider_checkout_id` (unique where not null), `provider_link_id` (payment link id, unique where not null), `provider_payment_id` (unique where not null), `paid_at`, `created_at`, `updated_at`. Unique `(subscription_id, period_start, kind) WHERE status IN ('open','paid')` (one live renewal per period; an expired or void one can be replaced). Index `(account_id, status)`. Rule: status moves only `open` > `paid|void|expired|failed`; guarded update `WHERE status = 'open'` (X-03). `open` invoices of kind `first`, `upgrade` and `domain` older than 24 h without payment become `expired` (J-04). A `renewal` invoice stays `open` until its period is replaced or the account is locked 3 days after the due date, then it becomes `failed`.

**E-42 subscription_events**: `id`, `account_id`, `type` (`trial_started`, `trial_extended`, `invoice_created`, `payment_received`, `payment_failed`, `renewal_reminder_sent`, `past_due`, `locked`, `unlocked`, `tier_changed`, `canceled`, `resubscribed`, `webhook_received`, `webhook_ignored`), `actor_type` (`system`, `owner`, `platform`), `actor_id` text, `data` jsonb (no personal data), `provider_event_id` text (unique where not null: webhook dedupe), `dedupe_key` text (unique where not null; job events use `account:type:YYYY-MM-DD`), `created_at`. Append-only.

**E-43 platform_audit_logs**: `id`, `actor_user_id` text, `actor_role` text, `action` text, `target_type`, `target_id` text, `account_id` uuid nullable, `reason` text nullable, `data` jsonb, `created_at`. Append-only. Read by platform users only (code gate plus grants).

**E-44 guardians**: `id`, `clinic_id`, `full_name`, `mobile`, `email`, `address`, `consent_at` timestamptz not null, `portal_user_id` text nullable, `archived_at`, timestamps. One guardian can have many animals (E-48). Unique `(clinic_id, portal_user_id)` where not null.

**E-48 patient_guardians**: `clinic_id`, `patient_id`, `guardian_id`, `is_primary` bool, `relationship` text default `guardian`, `created_at`. Primary key `(patient_id, guardian_id)`; composite FKs on `(clinic_id, patient_id)` and `(clinic_id, guardian_id)`. Rule (service): an animal patient has exactly one primary guardian; a guardian with linked non-archived animals cannot be archived (FR-034).

**E-45 privacy_requests**: `id`, `clinic_id`, `patient_id`, `type` (`access`, `correction`, `erasure`), `status` (`open`, `done`, `declined`), `received_at`, `due_at` (received + 30 days), `resolved_at`, `resolved_by`, `note`, timestamps.

**E-46 email_log**: `id`, `account_id` uuid nullable (null for sign-up, verification and reset emails sent before an account exists), `clinic_id` nullable, `kind` (auth, invite, lifecycle, platform_alert), `template` text (EM id), `to_hash` text (sha256 of lowercase address; no raw address), `status` (`sent`, `failed`), `error_code` text, `provider_message_id`, `created_at`. Patient reminders stay in `reminder_log`.

**E-47 idempotency_keys**: `key` text primary key, `scope` text, `result` jsonb nullable, `created_at`, `expires_at`. Used by checkout, payment and booking actions (FR-117d).

**E-49 clinic_ai_usage**: `clinic_id`, `month` char(7) (Manila `YYYY-MM`), `answers` int, `tokens_in` int, `tokens_out` int, primary key `(clinic_id, month)`. The cap is enforced with `UPDATE ... SET answers = answers + 1 WHERE answers < cap RETURNING` (FR-092). `agent_usage` stays the per-answer append log.

### 3.2 Altered tables (real names; "exists" means already in code)

| Table | Change | Why |
|---|---|---|
| E-07 subscriptions | exists: `billing_interval` ('monthly','annual'), `current_period_ends_at`, `trial_ends_at`, `clinic_slot_limit`, `tier`, `status`. Add `current_period_start`, `lock_reason`, `locked_at`, `cancel_at_period_end` bool, `ai_monthly_cap` int nullable. Rename unused `stripe_customer_id`/`stripe_subscription_id` to `provider_customer_id`/`provider_subscription_id`. `clinic_slot_limit` is the enforced limit; it is set from `PLAN_LIMITS` whenever the tier changes (R-01 may override for Enterprise); `PLAN_LIMITS` is the source for prices and defaults; changing a tier updates `clinic_slot_limit` in the same transaction. CHECK `status` in the five values; `tier` in tier_1..tier_4, enterprise; `lock_reason` null unless status = `masterlocked` | FR-004..FR-007, FR-012, FR-013, FR-014, FR-092 |
| E-06 clinics | add `tin` text nullable, `business_hours` jsonb nullable; CHECK `specialty IN ('dental','vet','eye','derma')`. No vertical column (specialty is the vertical, D-27). Label for `derma` in the UI is "Skin" | FR-033, FR-037, FR-056 |
| E-14 patients | exists: `patient_kind` ('human' default), `species_breed`, `guardian_or_owner_name`, `display_name`. Add `species`, `breed`, `weight_g` int nullable, `sex` if absent; CHECK `patient_kind IN ('human','animal')`. MG-04 splits `species_breed` into `species`/`breed` and moves `guardian_or_owner_name` into E-44/E-48 rows; old columns are then read-only and removed in a later release. Replace the global unique index on `portal_user_id` with unique `(clinic_id, portal_user_id)` where not null (so one login can be linked in several clinics, X-18) | FR-034, FR-080b |
| E-17 recalls | CHECK `recall_type IN ('dental_recall','follow_up','vaccine_due','post_procedure_checkin')` (as built plus `follow_up`); `status IN ('pending','notified','completed','cancelled')` | FR-043b, FR-118 |
| E-23 invoices | exists: `invoice_number` unique per clinic. CHECK `status IN ('draft','open','paid','void')`, `total_cents >= 0` | FR-055, FR-118 |
| E-25 payments | exists: `amount_cents`, `receipt_number`. CHECK `amount_cents > 0`, `method IN ('cash','gcash','maya','card')`; unique `(clinic_id, receipt_number)` where not null | FR-055, FR-118 |
| E-37 agent_usage | add `clinic_id` uuid nullable, `account_id` uuid nullable, `month` char(7); index `(clinic_id, month)` | FR-092, FR-025 |
| E-35 audit_logs | trigger `audit_logs_no_update_delete` raises on UPDATE or DELETE | FR-118 |
| E-26 hmo_claims | CHECK `status IN` the claim statuses (includes `withdrawn`) | FR-118 |
| E-39 platform_settings | new key `paymongo_degraded_until` (timestamptz as text) | X-04, J-04 |

### 3.3 Enumerations and the subscription state machine

Roles: `staff_role` (`owner`, `assistant`, `practitioner`); `PLATFORM_ROLES` (`super_admin`, `staff`). Subscription status: `trialing, active, past_due, masterlocked, canceled`. Lock reason (only while `masterlocked`): `trial_expired, payment_failed, admin`. Tier: `tier_1..tier_4`, `enterprise` (assigned by R-01). Billing interval: `monthly, annual`. Receipt (invoice) status: `draft, open, paid, void`. Subscription invoice status: `open, paid, void, expired, failed`. Appointment: `requested, confirmed, checked_in, in_progress, completed, cancelled, no_show`. Claim: `filed, pending, approved, denied, resubmitted, paid, withdrawn`. Payment method: `cash, gcash, maya, card`. Specialty: `dental, vet, eye, derma`. Recall type: `dental_recall, follow_up, vaccine_due, post_procedure_checkin`. Privacy request type: `access, correction, erasure`. Dental surfaces: `M, D, B, L, O` (code is canonical; fix the schema comment, FR-119). Domain order: `pending_payment, paid, purchasing, active, needs_review, expired`.

State machine (one source; PRD and APP_FLOW cite it):

| From | To | Trigger | Actor |
|---|---|---|---|
| (new account) | `trialing` | account created, trial 15 days | system |
| `trialing` | `active` | first invoice paid | webhook |
| `trialing` | `masterlocked` (`trial_expired`) | `trial_ends_at` passed, no paid invoice | J-03 |
| `active` | `past_due` | renewal due date passed unpaid | J-04 |
| `active` | `canceled` | `cancel_at_period_end` and period end reached | J-04 |
| `past_due` | `active` | invoice paid | webhook |
| `past_due` | `masterlocked` (`payment_failed`) | 3 days after due date unpaid | J-04 |
| `past_due` | `canceled` | `cancel_at_period_end` and period end reached | J-04 |
| `active` | `past_due` | Mode B only: PayMongo reports a failed auto-charge | webhook |
| `past_due` | `masterlocked` (`payment_failed`) | Mode B only: PayMongo reports the subscription `unpaid` | webhook |
| `masterlocked` | `active` | invoice paid and `lock_reason` is `trial_expired` or `payment_failed` | webhook |
| any except `canceled` | `masterlocked` (`admin`) | R-01 locks the account | R-01 |
| any | previous computed state | R-01 unlocks an `admin` lock: state is recomputed from dates (`trialing` if trial still running and unpaid, `active` if paid through a future date, else `masterlocked` with the matching reason) | R-01 |
| `canceled` | `active` | invoice paid (resubscribe) | webhook |

No other transition is allowed; the service refuses it with a typed error and a test (T-073) enumerates all pairs. A paid trial never returns to `trialing`. Locked and `canceled` accounts keep all data.

## 4. Row-level security (target)

Baseline (29 forced, 11 none) in BSC-3. Target changes:

| Table | Policy | Note |
|---|---|---|
| E-41, E-42 | `tenant_isolation` ALL: `account_id = ACCOUNT`; `platform_admin_read` SELECT when `app.platform_admin = 'on'`; `provider_ref_lookup` SELECT/UPDATE on E-41 where `provider_checkout_id` or `provider_link_id` equals `nullif(current_setting('app.current_provider_ref', true), '')` | the webhook knows only the provider reference; helper `withSubscriptionInvoice(providerRef)` sets that GUC after the signature check |
| E-44, E-45, E-48, E-49 | `tenant_isolation` ALL on `clinic_id = CLINIC`, explicit USING and WITH CHECK; E-44 also `guardian_self_read` SELECT where `portal_user_id = app.current_user_id` | |
| E-46 | `tenant_isolation` on `account_id` for tenant rows; `system_insert` INSERT-only for rows with `account_id is null`; platform read | auth emails before an account exists |
| E-36 agent_actions | add `tenant_isolation`: `clinic_id = CLINIC` or (`clinic_id is null` and `app.platform_admin = 'on'`) | OQ-11 decides if done in this release; otherwise a documented exception |
| E-43, E-47, E-12, E-13, E-38, E-39, E-40, E-01..E-04 | none | Global or auth-library tables. Reached only after `requirePlatformAdmin()`/`requireSuperAdmin()` or by the auth library. E-38 grants limited to what the code needs |
| E-35, E-42, E-43 | `REVOKE UPDATE, DELETE` from `clinix_app` plus trigger | append-only |
| `patient_self_read` | replace with a view `patient_portal_v` (created with `security_invoker = true`, so RLS on `patients` still applies; deny test in T-023) exposing only portal-safe columns, readable where `patients.portal_user_id = current user` or the user is the `portal_user_id` of a linked guardian (E-44/E-48); portal service reads the view | closes BSC-3 flag 4; guardian read (FR-034, FR-080b) |
| `clinic_staff.member_read` | exclude `pin_hash` via a view or column grants | BSC-3 flag 5 |

Cutover (FR-112): production `DATABASE_URL` uses `clinix_app`; `DATABASE_ADMIN_URL` only in migration/seed commands; verification query `select current_user, rolbypassrls from pg_roles where rolname = current_user` recorded in `docs/ops/live-check.md`. Until recorded, no document claims data was checked under RLS.

## 5. Authorization: target permission matrix

Source of truth for generated tests (IMPLEMENTATION_PLAN T-020..T-029). Columns: O = R-03 owner, A = R-04 assistant, P = R-05 practitioner, PT = R-06 patient/guardian, SA = R-01, PS = R-02 platform staff. C create, R read, U update, D archive/void/cancel (no hard deletes). `own` = own records only. `-` = denied. Cells marked `*` differ from the code today or are new; they are listed with their reason in section 5.1. Generated tests for unmarked cells follow built behaviour; tests for `*` cells follow this table.

| Resource | O | A | P | PT | SA | PS |
|---|---|---|---|---|---|---|
| P-01 Services and prices | CRUD, restore | R | R (picker) | - | - | - |
| P-02 Patients (demographics) | CRU, D, import, export | CRU, D | R all clinic patients (PD-11) | R own (reduced) | - | - |
| P-03 Patient custom fields | CRU all | CRU non-medical | CRU all (audited, PD-03) | R own non-medical | - | - |
| P-04 Guardians (vet)* | CRU, D | CRU, D | R | R own | - | - |
| P-05 Appointments | CRUD | CRUD | R own; U status own; C walk-in (PD-02) | R own | - | - |
| P-06 Clinical notes | CRU own, void own, R all (PD-01, OQ-01) | - | CRU own, void own, R all | - | - | - |
| P-07 Dental chart | C, R, void | - | C, R, void | - | - | - |
| P-08 Treatment plans | CRUD | R; status proposed/accepted | CRUD without price override (PD-12) | - | - | - |
| P-09 Recalls | CRUD, email | CRUD, email | CRUD, no email | - | - | - |
| P-10 Receipts and payments | C, R, pay, void | C, R, pay | - | R own (number, date, total, status) | - | - |
| P-11 Discount types | CRUD | R (apply saved) | - | - | - | - |
| P-12 Claims | CRU, withdraw | CRU, no withdraw | - | - | - | - |
| P-13 Inventory | CRUD, receive, write-off | R, use | R, use | - | - | - |
| P-14 Staff and invites | invite practitioner/assistant, role, deactivate (not owner, not self) | - | - | - | - | - |
| P-15 Clinic profile and settings* | RU | - | - | - | - | - |
| P-16 Reminders (toggle, send) | RU | - | - | - | - | - |
| P-17 Import and export | import, export | - | - | - | - | - |
| P-18 Activity log | R | - | - | - | - | - |
| P-19 Privacy requests* | CRU | CRU | - | - | - | - |
| P-20 Portal invite | C | C | - | - | - | - |
| P-21 Own portal data | - | - | - | R own | - | - |
| P-22 Subscription (own account)* | R, pay, change tier, cancel, add clinic, domain | - | - | - | - | - |
| P-23 Clinic AI assistant | use if granted and patient-data switch on | - | - | - | - | - |
| P-24 Tenants (platform)* | - | - | - | - | create, lock, unlock, tier, extend trial through the UI | R only |
| P-25 Subscription invoices (platform)* | - | - | - | - | R | R |
| P-26 Platform audit log* | - | - | - | - | R | R |
| P-27 Platform team | - | - | - | - | invite, deactivate | R |
| P-28 AI keys, patient-data switch, AI grants | - | - | - | - | CRUD | - |
| P-29 Platform AI assistant | - | - | - | - | ask, propose, confirm | ask only |
| P-30 Domain orders (platform)* | - | - | - | - | R, retry, mark refunded | R |

Cross-rules: (1) a locked account allows only the lock-exempt routes of FR-014 (S-34, S-71, A-01, A-13, sign-out, legal pages). (2) A role never reads another clinic or account (NFR-01). (3) Deactivated users have no access on the next request (X-17). (4) Decisions PD-01..PD-12 explain every `*` or open cell. (5) Reads are enforced in the page or service in addition to the action; a missing check on a read is a defect.

### 5.1 Cells that differ from the code today

| Cell | Code today | Target | Reason |
|---|---|---|---|
| P-04 all | no guardians | new | FR-034 |
| P-15 O | no action edits clinic name, address, phone, timezone, hours | RU | FR-037 |
| P-16 A | assistant can send now through actions, but the reminders page is owner-only so there is no reachable screen | `-` (owner only) | matrix follows reachable behaviour; Later if front desk needs it |
| P-19 O, A | none | CRU, assistant through the clinic app route | FR-104 (S-38 has a console and an app route) |
| P-22 O | read-only page plus one-time domain payment | pay, change tier, cancel, add clinic | FR-004..FR-007 |
| P-24 SA | lock and tier only through the AI confirm path | UI controls; R-02 read only | FR-008, PD-04 |
| P-24 PS | can create tenants | read only | PD-04 |
| P-25, P-26 | mock screens | real, read for both | FR-023, FR-024 |
| P-30 | order list only | retry, mark refunded | FR-009 |
| P-06 O | void own allowed | kept (now written in the cell) | PD-01 |
| P-08 P | practitioner may cancel plans and items | kept (now written in the cell) | PD-12 |
| P-02 P | reads all clinic patients | kept | PD-11 (INTAKE said "own records only") |

## 6. Contracts

Mutations are Server Actions (`src/server/actions/*`), each: authorize (role + tenant, `src/server/auth.ts`) > rate-limit bucket > Zod parse > service > revalidate > typed result `{ ok: true, data } | { ok: false, error: { code, message, fields? } }`. The 74 built actions are listed in `docs/baseline/actions.md` section 3; their contracts do not change except those below.

| ID | Action | Input (Zod) | Result | Errors |
|---|---|---|---|---|
| A-01 | `startCheckoutAction` (lock-exempt; allowed when status is `trialing`, `past_due`, `masterlocked` with reason `trial_expired` or `payment_failed`, or `canceled`) | `tier`, `billingInterval`, `idempotencyKey` uuid | `{ checkoutUrl }` | `FORBIDDEN`, `TIER_TOO_SMALL` (clinics > allowed), `PROVIDER_DOWN`, `VALIDATION` |
| A-02 | `changeTierAction` | `tier`, `billingInterval` | `{ effectiveAt, invoiceId? }` | same plus `NOT_ALLOWED_DOWNGRADE` |
| A-03 | `addClinicAction` | `name`, `specialty`, `subdomain`, `timezone` | `{ clinicId }` | `LIMIT_REACHED`, `SUBDOMAIN_TAKEN`, `RESERVED` |
| A-04 | `adminLockTenantAction` / `adminUnlockTenantAction` | `accountId`, `reason` 5-300 | ok | `FORBIDDEN` (not SA) |
| A-05 | `adminChangeTierAction` | `accountId`, `tier`, `reason` | ok | |
| A-06 | `adminExtendTrialAction` | `accountId`, `days` 1-30, `reason` | ok | |
| A-07 | `updateClinicProfileAction` | name, address, phone, hours, timezone (IANA), tin | ok | `VALIDATION` |
| A-08 | `createGuardianAction` / `updateGuardianAction` / `archiveGuardianAction` / `linkGuardianAction` | fields, `patientId`, `guardianId` | ok | `LAST_PRIMARY`, `HAS_ANIMALS` |
| A-09 | `logPrivacyRequestAction` / `resolvePrivacyRequestAction` | patientId, type / id, note | ok | |
| A-10 | `writeOffExpiredStockAction` | `batchId`, `reason` | ok | `NOT_EXPIRED` |
| A-11 | `retryDomainOrderAction` / `markDomainOrderRefundedAction` | `orderId` | ok | SA only |
| A-12 | `confirmPasswordAction` (step-up) | `password` | sets short-lived unlock | `WRONG_PASSWORD` rate-limited |
| A-13 | `cancelSubscriptionAction` / `resubscribeAction` (lock-exempt) | `idempotencyKey` | ok / `{ checkoutUrl }` | `FORBIDDEN` |
| A-14 | `runJobAction` (R-01, audited) | `job` in J-01..J-06 | counts only | `FORBIDDEN` |

Route handlers:

| Route | Contract |
|---|---|
| POST `/api/webhooks/[provider]` (single PayMongo endpoint, replaces nothing) | The dynamic route stays; no static `/api/webhooks/paymongo` route is added (it would shadow it). For `paymongo`: verify `Paymongo-Signature` (HMAC, 5-minute tolerance) on the raw body before parsing; read `metadata.kind` (`domain_order` or `subscription_invoice`) and the id; re-read the payment from the PayMongo API and compare amount and reference to the stored row; guarded status update; `subscription_events.provider_event_id` unique for dedupe. Event types subscribed (names verified at setup, FR-115): `checkout_session.payment.paid`, `payment.paid`, `payment.failed`, `link.payment.paid`. Response: 200 for duplicates and ignored events, 400 for a bad signature, 500 for transient failures so the provider retries (fulfilment of the payment record happens before the response; slow follow-up work may use `after()`). 300 requests/min per IP. Xendit keeps its own provider branch for domain orders only. |
| GET `/api/cron/daily` (replaces `/api/cron/reminders`; old path kept as an alias for one release; `vercel.json` updated) | Bearer `CRON_SECRET`; runs J-01..J-06; returns JSON counts only. |
| GET `/api/health` | No auth; returns `{ ok, db: bool }` only (no versions, no env). |
| GET `/api/clinic/export?kind=` | Owner only; streams all rows (FR-101); 20/hour. |

## 7. Jobs and webhooks

| ID | Job | Schedule (Manila) | Behaviour | Idempotency |
|---|---|---|---|---|
| J-01 | Appointment reminders | 09:00 daily | next-day appointments, reminders enabled; skip locked accounts | unique index on `reminder_log` |
| J-02 | Recalls due | 09:00 daily | pending recalls due within 7 days or overdue, max 100 per clinic (as built) | same |
| J-03 | Trial lifecycle | 09:00 daily | emails EM-09 (3 days), EM-10 (1 day), EM-11 (ended); at trial end without payment set `masterlocked`, `lock_reason = trial_expired` | `dedupe_key` on `subscription_events` |
| J-04 | Renewal and invoices | 09:00 daily | create renewal invoice 5 days before period end and email EM-13 with link; at due date set `past_due` (EM-14); 3 days later `masterlocked` (`payment_failed`, EM-15); handle `cancel_at_period_end`; expire `open` first/upgrade/domain invoices older than 24 h and fail unpaid renewal invoices when the account locks; do nothing to status while `paymongo_degraded_until` is in the future or a paid invoice is in flight | unique `(subscription_id, period_start, kind)` |
| J-05 | Domain orders | 09:00 daily | expire `pending_payment` > 24 h; `paid`/`purchasing` > 30 min to `needs_review` | status guard |
| J-06 | Housekeeping | 09:00 daily | delete expired `rate_limits`, `idempotency_keys`, `verification` | safe to repeat |

Vercel cron allows the schedule `0 1 * * *` UTC (exists). Runtime must finish within the function limit (NFR-11); if J-04 grows, split into a second cron entry.

## 8. Migration plan

Migrations are named MG-nn (module IDs M-nn live in the PRD). Each is its own drizzle migration, SQL read before commit, RLS appended in the same file, applied through the Neon MCP plus a `drizzle.__drizzle_migrations` row per AGENTS.md.

| # | Migration | Contents | Owner task | Reversible by |
|---|---|---|---|---|
| MG-01 | subscription model | alter E-07; create E-41, E-42 (with its append-only trigger), E-47; backfill existing rows (see rule below); RLS, grants, `withSubscriptionInvoice` GUC policy | K-102 | drop new columns/tables |
| MG-02 | platform audit | E-43, grants, append-only trigger on E-43 | K-203 | drop |
| MG-03 | clinic profile and constraints for billing | E-06 columns, specialty CHECK, unique `payments (clinic_id, receipt_number)`; duplicate report first | K-109 | drop |
| MG-04 | vet and portal link | E-44, E-48, E-14 columns, data move of `species_breed` and `guardian_or_owner_name`, replace unique index on `portal_user_id`, `patient_portal_v` view and policies | K-303 | drop and recreate old index |
| MG-05 | privacy and email | E-45, E-46 | K-109 | drop |
| MG-06 | AI cap | E-49, E-37 columns, backfill `month` from `created_at` in Manila | K-206 | drop |
| MG-07 | constraints | CHECKs of section 3.2 (validated against data first), append-only trigger on `audit_logs` | K-405 | drop constraint |
| MG-08 | RLS hardening | `clinic_staff` view or grants, E-36 policy (per OQ-11) | K-405 | recreate old policy |

Backfill rule for MG-01: accounts created through the paid domain flow (status `active` with `current_period_ends_at` in the future) keep that period; accounts in `trialing` keep `trial_ends_at`; accounts with neither get `trial_ends_at = created_at + 15 days`. No account is locked by the migration itself; J-03 evaluates the next morning.

Rule: a migration that fails validation against real data stops and reports the offending rows; it never deletes or edits clinical/financial data silently.

## 9. Seed data (dev and test only)

Seeders never write credentials to the repo; passwords come from environment variables (AGENTS.md).

| Item | Content |
|---|---|
| Tenant A | account tier_2 active, clinic A1 dental, clinic A2 vet; users: owner, assistant, practitioner (each role one user), portal patient |
| Tenant B | account tier_1 trialing, clinic B1 eye; owner, assistant |
| Tenant C | account tier_1 `masterlocked` (`trial_expired`), clinic C1 derma; owner |
| Platform | one `super_admin`, one `staff` |
| Records | per clinic: 12 patients (A2: animals with guardians, one guardian with two animals), 20 appointments across statuses, 6 services, 8 invoices (paid, open, void, senior, PWD, saved discount, installment), 3 claims, 6 inventory items with an expired batch, notes, dental entries for A1 |
| Money vectors | invoices matching IMPLEMENTATION_PLAN T-050..T-056 exactly |

## 10. Change log

| Date | Change |
|---|---|
| 2026-10-10 | First version: 47 entities, target permission matrix, contracts, jobs, migrations |
| 2026-10-10 | Doc-review fixes: state machine, real column names, `open` receipt status, recall types, guardian model E-44/E-48, E-49, portal index, one PayMongo endpoint, 5.1 differences, MG-nn names |
