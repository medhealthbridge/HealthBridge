# IMPLEMENTATION_PLAN: DataBridgeSol / Clinix PH

The build order, the tests and the definition of done. Features: `docs/PRD.md`. Screens: `docs/APP_FLOW.md`. Data and permissions: `docs/SCHEMA.md`. Stack and rules: `docs/TRD.md`. Look: `docs/DESIGN_BRIEF.md`. Locked decisions and open questions: `BLUEPRINT.md`.

## 1. How to use this plan

- The system is partly built. Wave 0 puts safety nets under what exists; later waves add the missing parts. Built behaviour (PRD section 4A and `docs/baseline/*`) is the test standard: a test that disagrees with built behaviour is raised as a finding for the owner to rule on, not silently changed.
- Work one task at a time. A task is done only when its proof passes and the done rule (section 7) holds.
- Task IDs `K-<wave><nn>`. Test IDs `T-nnn` (section 3). A task cites the tests that prove it.
- After every wave, run the `quality` agent in Wave check mode. Before launch, run Release gate mode.
- Size: S under half a day, M about one day, L two to three days. Sizes are estimates for ordering, not promises.

## 2. Waves and tasks

Columns: FR = PRD features; Dep = tasks that must be done first; Proof = tests (section 3) that must pass.

### Wave 0: Safety nets and honesty (before any new feature)

| ID | Task | FR | Dep | Proof | Size |
|---|---|---|---|---|---|
| K-001 | CI workflow on pull request: install, `tsc`, `eslint app src`, `npm test`, `npm run build`, `npm audit --omit=dev`; required check on main | NFR-06, NFR-12 | none | T-002 | S |
| K-002 | DB-backed test harness: disposable Neon branch per run, migrations applied, restricted `clinix_app` role, `withTenant` helpers, seed from SCHEMA section 9; script `npm run test:db` | NFR-01, NFR-12 | K-001 | T-001 | L |
| K-003 | `.env.example` lists every variable in TRD section 4; startup check script that fails on missing required values in production | NFR-06 | none | T-003 | S |
| K-004 | Generated isolation suite: every RLS table x read/list/update/delete across tenants and clinics | NFR-01 | K-002 | T-030..T-035 | L |
| K-005 | Generated permission suite from SCHEMA section 5 (one test per cell; cells marked `*` follow the target, others follow built behaviour; owner reviews section 5.1 first) | NFR-12 | K-002 | T-020..T-029 | L |
| K-006 | Money vector tests against `invoice-totals.ts`; receipt number and payment cap tests | NFR-09, FR-050 | K-001 | T-050..T-059 | M |
| K-007 | Service-write coverage script (lists every write service and its test; fails on gaps) | NFR-12 | K-002 | T-004 | S |
| K-008 | Error and not-found screens: `error.tsx`, `global-error.tsx`, `not-found.tsx`, 403 view, `StatePanel` (C-01, C-11) | FR-116 | none | T-093, T-096 | M |
| K-009 | Remove fictional screens and chrome: owner Modules/Feedback, platform Modules/Support/Feedback, "Notify me" stubs, invented counts; delete unused mock exports | FR-026, FR-119 | none | T-093 | M |
| K-010 | `GET /api/health` and `docs/ops/live-check.md` skeleton | FR-114, FR-115 | none | T-423 | S |
| K-011 | Dead code and unused items: `posTotals()`, unused tables noted, unused dependencies, stale comments (surface list, status lists) | FR-119, PD-10 | K-006 | T-002 | S |

Wave 0 exit: CI green; isolation and permission suites run (failures are findings, fixed in K-0xx follow-ups or logged); no fictional screen reachable.

### Wave 1: Subscription core (trial, lock, first payment)

| ID | Task | FR | Dep | Proof | Size |
|---|---|---|---|---|---|
| K-101 | `src/lib/plans.ts` PLAN_LIMITS (tiers, prices, interval, clinic slots, AI cap); landing pricing reads it | FR-012 | none | T-060 | S |
| K-102 | Migration MG-01: subscription model, `subscription_invoices`, `subscription_events`, `idempotency_keys`, RLS, grants, `withSubscriptionInvoice`; Drizzle schema | FR-004, FR-013 | K-002 | T-410, T-411 | M |
| K-103 | Trial lifecycle service + job J-03 (dates, EM-09..EM-11, expiry to `masterlocked`) | FR-013, FR-073 | K-102, K-108, K-110 | T-061, T-112 | M |
| K-104 | Masterlock enforcement in one function (`requireActiveClinic`, portal, AI routes, actions) with the lock-exempt gate `requireWorkspace({ allowLocked: true })` for S-34, S-71, A-01, sign-out; S-70 | FR-014 | K-102 | T-062, T-027, T-075, T-211 | L |
| K-105 | PayMongo client (create checkout/payment link, retrieve payment, verify signature) with provider fake for tests | FR-004 | K-101, K-102 | T-064 | M |
| K-106 | `startCheckoutAction`, PayMongo branch of `/api/webhooks/[provider]` with metadata dispatch (no static route), guarded fulfilment, idempotency keys, S-71 | FR-004 | K-101, K-104, K-105 | T-063, T-064, T-065, T-074, T-203, T-209 | L |
| K-107 | S-34 Subscription page real: plan card, invoice table, trial banner (C-03, C-04, C-07) | FR-006 | K-106 | T-093, T-094, T-098 | M |
| K-108 | Owner lifecycle emails EM-08..EM-16 through `sendEmail` with `email_log` | FR-073, FR-072 | K-102, K-109 | T-205, T-112 | M |
| K-109 | Migrations MG-03 (clinic columns, specialty CHECK, unique receipt number on payments) and MG-05 (`privacy_requests`, `email_log`) | FR-037, FR-072, FR-055 | K-102 | T-410, T-411 | M |
| K-110 | Cron route `/api/cron/daily` running J-01..J-06, `vercel.json` updated, old path kept as alias, `runJobAction` (A-14, R-01, audited) | FR-070, FR-071, FR-114 | K-102 | T-207, T-403 | M |
| K-111 | Domain orders stop carrying plan money: remove `PLAN_FIRST_MONTH_CENTAVOS`, `fulfillPaidOrder` never changes the subscription, domain checkout bound to the host clinic; hide the onboarding domain offer unless the owner decides otherwise (D-26) | FR-009, FR-004 | K-106 | T-214, T-074 | M |

Wave 1 exit: a new owner can sign up, use 15 days, be locked, pay (test mode), and be unlocked; locked tenants are refused everywhere (T-062).

### Wave 2: Renewals, tiers, admin control, AI cap

| ID | Task | FR | Dep | Proof | Size |
|---|---|---|---|---|---|
| K-201 | Renewal Mode A: job J-04 (invoice, payment link EM-13, `past_due`, lock after 3 days, invoice expiry, outage flag), cancel at period end | FR-005 | K-106, K-108, K-110 | T-066, T-067, T-204, T-209 | L |
| K-202 | Tier change with proration, cancel and resubscribe, add clinic (A-02, A-03, A-13, S-72); slot limit from `PLAN_LIMITS` into `clinic_slot_limit` | FR-006, FR-007 | K-107, K-109 | T-068, T-069, T-070, T-071, T-072 | M |
| K-203 | `platform_audit_logs` (MG-02) and audit writes for every platform action | FR-024 | K-102 | T-026, T-309 | M |
| K-204 | Admin tenant controls (lock, unlock, tier, extend trial, create tenant R-01 only) with `ConfirmReasonDialog` (C-05) | FR-008, FR-021 | K-203, K-104 | T-026 | M |
| K-205 | Platform Overview, Billing, Audit screens real (S-60, S-63, S-68) | FR-022, FR-023, FR-024 | K-203 | T-093 | L |
| K-206 | AI monthly cap with counter row (MG-06, E-49), meter, per-clinic usage for admin | FR-092, FR-025 | K-101, K-102 | T-025, T-117 | M |
| K-207 | Domain order hardening and S-83 (needs-review handling, expiry in J-05) | FR-009 | K-203 | T-214 | M |
| K-208 | Renewal Mode B (auto-charge cards/Maya) behind a flag, only if OQ-02 answered yes | FR-005 | K-201 | T-066 | L |

### Wave 3: Clinic profile, verticals, billing integrity

| ID | Task | FR | Dep | Proof | Size |
|---|---|---|---|---|---|
| K-301 | Clinic profile edit (S-36) with timezone and TIN; clinic-local date use | FR-037 | K-109 | T-107, T-208 | M |
| K-302 | Specialty-driven labels and tools (dental tools hidden elsewhere), suggested custom fields per specialty (S-82) | FR-033 | K-301 | T-101 | M |
| K-303 | Vet: MG-04 (guardians, `patient_guardians`, animal columns, data move, portal index change), guardian block (C-08), vet recall types, guardian portal policy and view | FR-034, FR-043b | K-302 | T-020, T-103, T-035 | L |
| K-304 | Receipt number concurrency test, unique receipt number on payments (MG-03) and receipt print layout | FR-055, FR-056 | K-006, K-109 | T-057, T-097 | M |
| K-305 | Write-off expired stock UI | FR-061 | none | T-109 | S |
| K-306 | Portal fixes: portal-safe view, per-clinic sections, redirect rules | FR-080b | K-004, K-303 | T-023, T-035, T-111 | M |
| K-307 | Owner Overview from real data with as-of time | FR-105 | none | T-093, T-119 | S |

### Wave 4: Trust, privacy, security

| ID | Task | FR | Dep | Proof | Size |
|---|---|---|---|---|---|
| K-401 | Legal pages S-75..S-77, footer links, signup consent checkbox (text reviewed by counsel, OQ-03) | FR-110 | OQ-03 | T-095 | M |
| K-402 | Privacy requests (S-38 console and app routes) and patient-chart tab | FR-104 | K-109 | T-115 | M |
| K-403 | Record-view audit on chart open, receipt open | FR-103 | none | T-309 | S |
| K-404 | Uncapped exports (stream) and import atomicity notes | FR-101, FR-100 | none | T-306, T-215 | M |
| K-405 | Constraints and audit immutability (MG-07), RLS hardening (MG-08) | FR-118 | K-004 | T-309, T-410, T-411 | L |
| K-406 | Security hardening list a-m (PRD FR-117): rate limits, step-up, redirect safety, headers test, log scrub, session settings, cookie scope, host-bound domain checkout, audit of onboarding | FR-117 | K-005 | T-013..T-016, T-301..T-308 | L |
| K-407 | RLS enforced in production: switch `DATABASE_URL` to `clinix_app`, record verification | FR-112 | K-004, K-405 | T-412 | S |
| K-408 | DPO named, NPC decision recorded in `docs/ops/compliance.md` | FR-111 | OQ-09 | review | S |

### Wave 5: Consistency and accessibility

| ID | Task | FR | Dep | Proof | Size |
|---|---|---|---|---|---|
| K-501 | Radius tokens; light pages move to console tokens; contrast fixes | NFR-10 | none | T-090 | M |
| K-502 | Five states on every screen (skeletons for light pages, `StatePanel`) | FR-116 | K-008 | T-093 | L |
| K-503 | Offline banner on all shells and light pages; form input preserved | FR-124, FR-016 | none | T-080..T-082, T-201 | M |
| K-504 | Accessibility pass: focus, labels, dialogs, skip link, target size | NFR-10 | K-501 | T-091, T-092 | L |
| K-505 | Performance pass on Today, Patients, Checkout | NFR-02, NFR-03 | none | T-401, T-402 | M |

### Wave 6: Launch readiness

| ID | Task | FR | Dep | Proof | Size |
|---|---|---|---|---|---|
| K-601 | Monitoring and alerts (error tracking, uptime, cron failure, webhook failure) | FR-114 | K-010 | T-421 | M |
| K-602 | Backups: confirm Neon PITR window, restore drill, runbook | FR-113 | none | T-420 | S |
| K-603 | Live verification checklist executed in production (PayMongo live payment small amount, Resend domain, subdomain, cron, RLS role) and recorded | FR-115 | K-106, K-201, K-407, K-601, K-602 | T-422 | M |
| K-604 | Quality Release gate mode full pass; fix all High/Critical | all | everything | all tests | L |
| K-605 | Pilot onboarding runbook for 1-3 clinics, support contact, data import | M-12 | K-604 | review | S |

## 3. Test plan

Levels: U unit, S service/DB-backed (K-002), E e2e Playwright, M manual or Quality agent. "Gen" means generated from a table so a new row creates a new test.

### 3.1 Harness and gates
| ID | Test | Level |
|---|---|---|
| T-001 | DB harness: migrations apply on empty branch; `clinix_app` has no BYPASSRLS; helpers set GUCs | S |
| T-002 | CI runs tsc, eslint, tests, build, audit and fails on any | CI |
| T-003 | `.env.example` contains every variable of TRD section 4; production startup check fails on missing | U |
| T-004 | Every write service function has a DB-backed test (script) | CI |

### 3.2 Auth
| ID | Test | Level |
|---|---|---|
| T-010 | Signup creates no session until email verified; verification link logs in | S/E |
| T-011 | Wrong password and unknown email give the same message; unverified gives resend notice | S |
| T-012 | Reset: token single-use, expires, same generic message for unknown email | S |
| T-013 | Cookies httpOnly, secure, sameSite; no token in storage | E |
| T-014 | Auth endpoints rate-limited | S |
| T-015 | Social button only when both id and secret set | U |
| T-016 | Platform login signs out non-platform users with generic error | S |

### 3.3 Permissions and isolation (Gen)
| ID | Test | Source |
|---|---|---|
| T-020 | Clinic resources P-01..P-09 allow/deny per role, action and page | SCHEMA 5 |
| T-021 | Billing P-10..P-12 | SCHEMA 5 |
| T-022 | Inventory, staff, settings, reminders, import/export, activity, privacy P-13..P-20 | SCHEMA 5 |
| T-023 | Portal P-21 own data only, reduced columns; a portal user cannot read another patient through `patient_portal_v` | SCHEMA 5 |
| T-024 | Subscription P-22: only owner; others 403 | SCHEMA 5 |
| T-025 | AI P-23 and P-29 gating and caps | SCHEMA 5 |
| T-026 | Platform P-24..P-28, P-30: R-02 cannot change anything; every change writes `platform_audit_logs` | SCHEMA 5 |
| T-027 | Locked account: only S-70, S-34 read/pay, sign-out, legal reachable; actions and APIs refused | PRD FR-014 |
| T-028 | Deactivated staff refused on next request | X-17 |
| T-029 | Page-level reads enforce the matrix (not only actions) | SCHEMA 5 rule 5 |
| T-030 | By-id read of another tenant's row returns nothing for every RLS table in SCHEMA section 2 (as `clinix_app`) | NFR-01 |
| T-031 | List queries never include other tenants | NFR-01 |
| T-032 | Update and delete of another tenant's row affects 0 rows | NFR-01 |
| T-033 | Staff of clinic A on clinic B host gets 404 | X-12 |
| T-034 | Account-scoped session sees only its clinics | NFR-01 |
| T-035 | Portal user linked in two clinics sees each in its own section | X-18 |

### 3.4 Workflows (T-1nn = W-nn; each includes its unhappy paths in APP_FLOW section 3)
T-101 W-01 signup to first clinic · T-102 W-02 invite staff · T-103 W-03 create patient · T-104 W-04 book/check in/serve · T-105 W-05 notes · T-106 W-06 dental and plans · T-107 W-07 checkout (profile fields used) · T-108 W-08 claims · T-109 W-09 inventory · T-110 W-10 recalls and reminders · T-111 W-11 portal · T-112 W-12 trial/pay/renew/lock · T-113 W-13 add clinic · T-114 W-14 platform control · T-115 W-15 export and privacy · T-116 W-16 AI assistant · T-117 W-16 cap and usage · T-118 W-17 password reset · T-119 Overview numbers equal seeded sums in clinic time. Levels E, with S coverage for rules.

### 3.5 Money (vectors; amounts in centavos; derived from the rules in `docs/baseline/actions.md` section 6; if `invoice-totals.ts` disagrees, stop and raise it)
| ID | Case | Input | Expected |
|---|---|---|---|
| T-050 | No discount | line 100000 x1, VATable | subtotal 100000, vat 10714, discount 0, total 100000 |
| T-051 | Senior/PWD VATable | line 100000 x1 | discount 17857, vatExempt 10714, vat 0, total 71429 |
| T-052 | Senior/PWD VAT-exempt line | line 100000 x1 flagged | discount 20000, vatExempt 0, total 80000 |
| T-053 | Percent with remainder spread | lines 33333 and 66667, 10 percent | discount 10000, vat 9643, total 90000 (per-line spread 3334 + 6666 asserted on the stored line rows) |
| T-054 | Fixed over subtotal | line 100000, fixed 150000 | discount 100000, total 0 |
| T-055 | Statutory mixed quantities | 12345 x3 VATable + 5000 x2 exempt | subtotal 47035, discount 8613, vatExempt 3968, total 34454 |
| T-056 | `buildInstallments` unit test with a fixed clock (checkout itself refuses past due dates) | total 100000, 3 installments, first due 2026-01-31 | 33333 / 33333 / 33334 due 2026-01-31, 2026-02-28, 2026-03-31 |
| T-057 | Receipt numbers | two concurrent checkouts in one clinic | consecutive unique numbers, none skipped (`OR-000001`, `OR-000002`) |
| T-058 | Payments | pay more than balance refused; pay on void refused; paid when sum equals total; void keeps payments | as rules |
| T-059 | Property | for random lines/discounts: total = subtotal minus discount, never negative, spread sums to discount | U |

### 3.6 Subscription
| ID | Test |
|---|---|
| T-060 | New account: `trialing`, `trial_ends_at` = created + 15 days, tier from `PLAN_LIMITS` |
| T-061 | Job locks expired unpaid trials with `lock_reason = trial_expired`, writes event; second run changes nothing |
| T-062 | Locked tenant refused on every entry point: pages, each action, API routes, AI, portal |
| T-063 | Checkout creates one `open` invoice with amount from `PLAN_LIMITS`; browser-sent amount ignored |
| T-064 | Webhook: bad signature 400; valid duplicate no change; unknown event 200 ignored; out-of-order handled; amount mismatch rejected; provider re-read used |
| T-065 | Payment sets `paid`, `active`, period end, clears lock, writes event, sends email |
| T-066 | Renewal invoice created 5 days before end; payment extends from current period end |
| T-067 | Unpaid at due date: `past_due` with full access; 3 days later: `masterlocked` |
| T-068 | Downgrade refused when clinics exceed new tier; upgrade takes effect per FR-006 |
| T-069 | Add clinic refused at limit with upgrade prompt |
| T-070 | Upgrade difference: old 149000, new 269000 centavos, 15 of 30 days left, difference 60000 |
| T-071 | Upgrade rounding: 120000 x 10 / 31 days = 38710 (round half up) |
| T-072 | Cancel sets `cancel_at_period_end`; at period end status `canceled`, S-70 shows Plan canceled; paying resubscribes to `active` |
| T-073 | State machine: every (from, to) pair outside the SCHEMA 3.3 table is refused; every listed pair works |
| T-074 | One PayMongo endpoint: a domain-order payment and a subscription-invoice payment each reach the right handler; a payment-link event is handled; neither changes the other's state |
| T-075 | Locked owner can open S-34 and S-71, start checkout and sign out; every other route is refused |

### 3.7 Failure modes (T-2nn = X-nn)
Index: T-201..T-214 = X-01..X-14; T-215 = X-19; T-216 = X-20; T-217 = X-22; X-15..X-18 and X-21 are covered by T-1nn, T-028, T-035, T-080.
T-201 X-01 offline form keeps input · T-202 X-02 double submit one receipt · T-203 X-03 webhook duplicate/out of order · T-204 X-04 PayMongo outage no lock caused · T-205 X-05 Resend failure logged and shown · T-206 X-06 AI provider outage falls through · T-207 X-07 cron failure alerts and rerun safe · T-208 X-08 Manila midnight boundaries · T-209 X-09 payment during trial expiry wins · T-210 X-10 concurrent status change · T-211 X-11 lock mid-session · T-212 X-12 wrong host · T-213 X-13 owner recovery runbook exercised · T-214 X-14 domain paid registrar fails · T-215 X-19 import failure mid-way · T-216 X-20 void after payment banner · T-217 X-22 password re-entry for destructive actions · remaining X-15, X-16, X-17, X-18, X-21 covered by T-1xx, T-028, T-035.

### 3.8 Offline, UI, accessibility
| ID | Test |
|---|---|
| T-080 | Offline page served for failed navigation; versioned SW update works (X-16) |
| T-081 | No authenticated HTML or patient data in SW cache |
| T-082 | Banner shown on shells and light pages when offline |
| T-090 | Contrast of every token pair in light and dark >= 4.5:1 text, 3:1 UI |
| T-091 | axe: zero serious/critical on every screen in S-registry |
| T-092 | Keyboard-only walk through W-01, W-07, W-12 |
| T-093 | Every screen has all five states (table driven from S-registry) |
| T-094 | 360/375/390/768/1024/1440: no horizontal scroll, targets >= 44 px on mobile |
| T-095 | Legal links on every footer and signup; pages render without login |
| T-096 | Error pages show no stack, no data; reference id present |
| T-097 | Receipt print layout contains clinic, OR number, lines, VAT, discount, payments |
| T-098 | Strings in S-70, S-71, S-34 messages match APP_FLOW text |

### 3.9 Security, data, performance, operations
| ID | Test |
|---|---|
| T-301 | Headers in `next.config.ts` present; CSP without `unsafe-eval` in production |
| T-302 | No secret or server-only variable in client bundles |
| T-303 | Webhook endpoints rate-limited |
| T-304 | Host and Origin ignored for authorization and redirect URLs; open-redirect fixtures fail |
| T-305 | Log and error-event scrub removes personal data |
| T-306 | Import limits (500 rows, 1 MB) and CSV formula-injection fixtures neutralised in exports |
| T-307 | XSS and SQL injection fixtures in every free-text field stored and rendered inert |
| T-308 | Step-up password required for destructive AI actions; wrong password rate-limited |
| T-310 | No service issues DELETE on clinical or financial tables (static scan) and `clinix_app` lacks DELETE privilege there | S |
| T-309 | Audit rows exist for every clinical/financial/platform write; update/delete of `audit_logs` fails |
| T-401 | Web vitals targets on Today, Patients, Checkout |
| T-402 | Server p95 targets under 20 concurrent users |
| T-403 | Daily job finishes in 300 s for 50 seeded clinics |
| T-410 | Each migration applies on a copy of production-like data and rolls back |
| T-411 | CHECK constraints validate against existing data without deleting any row |
| T-412 | Production role is `clinix_app` and not BYPASSRLS (query output recorded) |
| T-420 | Restore drill: branch from point in time, row counts match |
| T-421 | Alerts fire for forced error, forced cron failure, forced webhook failure within 15 minutes |
| T-422 | Live-check list in `docs/ops/live-check.md` fully executed and signed |
| T-423 | `/api/health` answers without auth with only `ok` and `db`, no version or environment data |

## 4. Environments and data

Local with Neon dev branch; CI with disposable branch per run; preview with its own branch and test keys; production with live keys only after K-603. No production data is copied to non-production. Test emails go to a sink address.

## 5. Quality agent schedule

| When | Mode |
|---|---|
| After each wave | Wave check on that wave's FRs and screens |
| After K-005 and K-004 | Regression on permission and isolation findings |
| End of Wave 5 | Screen audit on the whole S-registry |
| K-604 | Release gate (full pass) |
| Weekly after launch | Regression, scheduled once the blueprint and code exist (owner decides) |

## 6. Launch checklist (gate to pilot)

1. Launch gate items in INTAKE: tenant isolation proven (T-030..T-035 green on `clinix_app`), billing proven end to end (T-060..T-075), legal pages live (T-095), backups tested (T-420), live verification signed (T-422), error tracking and uptime alerts firing (T-421), renewal link payment verified live (live-check #5).
2. No open High or Critical Quality finding.
3. All Must FRs in the coverage matrix are `done` with passing proof.
4. Open questions that block launch are answered (BLUEPRINT).
5. Rollback tested: promote previous Vercel deployment; DB changes additive.
6. Support contact, DPO email and runbook published.

## 7. Done rule (every task)

`npx tsc --noEmit`, `npx eslint app src`, `npm test` and `npm run build` pass in CI; the task's proof tests pass; a DB-backed test exists for every new write; audit row in the same transaction; RLS in the same migration; five states and 360/375/390/768/1024/1440 checked for UI; no dead code left; what was not verified is stated plainly in the pull request.

## 8. Status table (update as work proceeds)

Statuses: todo, doing, done, blocked. All tasks start `todo`.

## 9. Change log

| Date | Change |
|---|---|
| 2026-10-10 | First version |
| 2026-10-10 | Doc-review fixes: K-109..K-111 added, dependencies rewired, MG-nn migrations, tests T-070..T-075, T-119, T-310, NFR coverage, matrix regenerated |

## 10. Coverage matrix (every PRD feature)

Built features are covered by the Wave 0 suites and the listed tests. New and gap features are covered by the listed tasks and their proof tests.

| FR | Feature | Task(s) | Tests |
|---|---|---|---|
| FR-001 | Marketing sites | built (Wave 0 suites) | T-093, T-095 |
| FR-002 | Signup with email verification | built (Wave 0 suites) | T-010, T-101 |
| FR-003 | Login, logout, password reset, social sign-in | built (Wave 0 suites) | T-011..T-016, T-118 |
| FR-004 | Plan checkout (first payment without a domain) | K-102, K-105, K-106, K-111 | see task proof |
| FR-005 | Renewals | K-201, K-208 | see task proof |
| FR-006 | Owner subscription management | K-107, K-202 | see task proof |
| FR-007 | Tier slot limit and add clinic | K-202 | see task proof |
| FR-008 | Admin tenant controls | K-204 | see task proof |
| FR-009 | Domain purchase hardening | K-111, K-207 | see task proof |
| FR-010 | Subdomain routing | built (Wave 0 suites) | T-033 |
| FR-011 | Custom domain with session handoff | built (Wave 0 suites) | T-304 |
| FR-012 | Plan limits catalogue | K-101 | see task proof |
| FR-013 | Trial lifecycle | K-102, K-103 | see task proof |
| FR-014 | Masterlock enforcement | K-104 | see task proof |
| FR-015 | Onboarding wizard | built (Wave 0 suites) | T-101 |
| FR-016 | PWA and offline notice | K-503 | T-080..T-082 |
| FR-020 | Platform team and login | built (Wave 0 suites) | T-016, T-026 |
| FR-021 | Tenants list and create | K-204 | T-026, T-114 |
| FR-022 | Admin Overview (real) | K-205 | see task proof |
| FR-023 | Admin Billing (real) | K-205 | see task proof |
| FR-024 | Platform audit log (real) | K-203, K-205 | see task proof |
| FR-025 | AI usage per clinic for admin | K-206 | see task proof |
| FR-026 | Remove fictional screens and chrome | K-009 | see task proof |
| FR-030 | Staff invites and roles | built (Wave 0 suites) | T-102 |
| FR-031 | Patients | built (Wave 0 suites) | T-103 |
| FR-032 | Custom patient fields | built (Wave 0 suites) | T-020 |
| FR-033 | Vertical profiles | K-302 | see task proof |
| FR-034 | Veterinary patient with guardian | K-303 | see task proof |
| FR-035 | Appointments | built (Wave 0 suites) | T-104, T-208, T-210 |
| FR-036 | Walk-in queue | built (Wave 0 suites) | T-104 |
| FR-037 | Clinic profile edit | K-109, K-301 | see task proof |
| FR-038 | Global search in the command palette (patients, records) | not scheduled (Later/Won't) | see task proof |
| FR-040 | Clinical notes (SOAP) | built (Wave 0 suites) | T-105 |
| FR-041 | Dental tooth chart | built (Wave 0 suites) | T-106 |
| FR-042 | Treatment plans | built (Wave 0 suites) | T-106 |
| FR-043 | Recalls | built (Wave 0 suites) | T-110 |
| FR-043b | Vet recalls | K-303 | see task proof |
| FR-050 | Checkout | K-006 | T-050..T-055, T-107 |
| FR-051 | Payments, pay later, installments | built (Wave 0 suites) | T-056, T-058 |
| FR-052 | Void receipt | built (Wave 0 suites) | T-058, T-216 |
| FR-053 | Saved discounts | built (Wave 0 suites) | T-021 |
| FR-054 | Claims (HMO/PhilHealth) | built (Wave 0 suites) | T-108 |
| FR-055 | Receipt number integrity | K-109, K-304 | see task proof |
| FR-056 | Receipt print/PDF | K-304 | see task proof |
| FR-057 | Services and price list | built (Wave 0 suites) | T-020 |
| FR-060 | Items, batches, stock use | built (Wave 0 suites) | T-109 |
| FR-061 | Write-off expired stock UI | K-305 | see task proof |
| FR-070 | Daily appointment reminders | K-110 | T-110 |
| FR-071 | Recall reminder emails | K-110 | T-110 |
| FR-072 | Visible email failures | K-108, K-109 | see task proof |
| FR-073 | Owner lifecycle emails | K-103, K-108 | see task proof |
| FR-080 | Invite and read-only portal | built (Wave 0 suites) | T-111 |
| FR-080b | Portal fixes | K-306 | see task proof |
| FR-090 | Assistant chat | built (Wave 0 suites) | T-116 |
| FR-091 | Confirm-first writes with step-up | built (Wave 0 suites) | T-116, T-308 |
| FR-092 | AI monthly cap, meter, admin usage | K-206 | see task proof |
| FR-093 | Patient-data gating | built (Wave 0 suites) | T-025 |
| FR-100 | Patient CSV import | K-404 | T-215, T-306 |
| FR-101 | Exports uncapped | K-404 | see task proof |
| FR-102 | Activity log | built (Wave 0 suites) | T-309 |
| FR-103 | Record-view audit | K-403 | see task proof |
| FR-104 | Privacy requests | K-402 | see task proof |
| FR-105 | Owner Overview | K-307 | T-093, T-119 |
| FR-110 | Legal pages and consent | K-401 | see task proof |
| FR-111 | DPO and NPC registration | K-408 | see task proof |
| FR-112 | RLS enforced in production | K-407 | see task proof |
| FR-113 | Backups | K-602 | see task proof |
| FR-114 | Monitoring and alerts | K-010, K-110, K-601 | see task proof |
| FR-115 | Live verification | K-010, K-603 | see task proof |
| FR-116 | Error and permission screens | K-008, K-502 | see task proof |
| FR-117 | Security hardening list | K-406 | see task proof |
| FR-118 | Database constraints and audit immutability | K-405 | see task proof |
| FR-119 | Dead code and unused items | K-009, K-011 | see task proof |
| FR-124 | Offline notice everywhere | K-503 | see task proof |
| FR-130 | Branding application | not scheduled (Later/Won't) | see task proof |
| FR-131 | Receipt send by email | not scheduled (Later/Won't) | see task proof |
| FR-132 | SMS/Viber reminders | not scheduled (Later/Won't) | see task proof |
| FR-133 | Patient writes in portal (book, edit) | not scheduled (Later/Won't) | see task proof |
| FR-134 | Dedicated eye/skin/vet tools | not scheduled (Later/Won't) | see task proof |
| FR-135 | Offline record saving and sync | not scheduled (Later/Won't) | see task proof |
| FR-136 | Inter-branch inventory transfer | not scheduled (Later/Won't) | see task proof |
| FR-137 | Clinic ownership transfer | not scheduled (Later/Won't) | see task proof |
| FR-138 | Clinic archive by owner | not scheduled (Later/Won't) | see task proof |

## 11. Non-functional coverage

| NFR | Proof |
|---|---|
| NFR-01 | T-030..T-035 |
| NFR-02 | T-402 |
| NFR-03 | T-401 |
| NFR-04 | T-420 |
| NFR-05 | T-421 (uptime check and alert) |
| NFR-06 | T-002, T-301, T-302 |
| NFR-07 | T-081, T-305 |
| NFR-08 | T-309 |
| NFR-09 | T-050..T-059, T-070, T-071 |
| NFR-10 | T-090..T-092, T-094 |
| NFR-11 | T-403 |
| NFR-12 | T-004 |
| NFR-13 | T-094 plus a manual browser pass in Quality Screen audit |
| NFR-14 | T-117 |
| NFR-15 | T-310 |
