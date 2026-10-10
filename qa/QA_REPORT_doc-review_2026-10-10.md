# QA Report: Doc review (readiness gate), 2026-10-10

## 1. Verdict

**FAIL (not ready to build past Wave 0).** The documents contradict each other and the code in 10 High places: the subscription state model, two CHECK lists that would break live data, the vet/guardian data model, the portal link, the plan+domain checkout already in the code, the webhook route, how Masterlock works with the payment page, the permission-matrix markings and the wave dependencies. All of them sit on the Wave 1 to 3 critical path. Wave 0 (K-001..K-011) can start now, because nothing in it depends on these findings except K-005, which needs DR-09 fixed first.

## 2. Scope

- Mode: Doc review (audit only). No blueprint file and no application code was edited. The only file written is this report.
- Read in full: BLUEPRINT.md, INTAKE.md, CLAUDE.md, docs/PRD.md, docs/APP_FLOW.md, docs/SCHEMA.md, docs/TRD.md, docs/DESIGN_BRIEF.md, docs/IMPLEMENTATION_PLAN.md, docs/ops/*.md, docs/baseline/actions.md, docs/baseline/checks.md. Read in part: docs/baseline/screens.md and the AGENTS.md rules.
- Code read: package.json, package-lock.json, vercel.json, next.config.ts, proxy.ts, .env.example, src/lib/{constants,pricing,invoice-totals,installments,discounts,pos-totals,clinic-app-nav}.ts, src/server/auth.ts, src/server/db/client.ts, src/server/db/schema/{tenancy,patients,billing,agent}.ts, all migrations (table and RLS counts), src/server/services/{domain-orders,payments/*,reminders,billing (statuses),recalls}.ts, app/api/webhooks/[provider]/route.ts, app/api/cron/reminders/route.ts, app/api/clinic/{export,agent}/route.ts, app/clinix-ph/admin/{layout,subscription/page}.tsx, public/sw.js, app/globals.css, src/lib/fonts.ts.
- Environment: sandbox, Node v22.22.0. No npm or network commands were run (as instructed). The only code executed was a copy of `src/lib/invoice-totals.ts`, `pos-totals.ts` and `installments.ts`, run with `node --experimental-strip-types` from the scratchpad. Only the import alias was rewritten.
- Repo is not a git checkout of record, so there is no commit hash.

## 3. Findings

IDs are DR-nn. Severity and priority follow the Quality agent rules. Every High finding is P1 for the wave it blocks.

### High

```
DR-01  [High / P1]  Subscription state and lock_reason model differs across PRD, SCHEMA and APP_FLOW
Where:     PRD FR-014 rules (PRD:127), FR-006(4) (PRD:141), PRD §6 States (PRD:263); SCHEMA §3.2 E-07 (SCHEMA:93), §3.3 (SCHEMA:107); APP_FLOW S-70 (APP_FLOW:148)
Violates:  FR-014, FR-006, FR-013, FR-005, D-13
Expected:  One state machine and one lock_reason list, used everywhere (BLUEPRINT rule 2).
Actual:    PRD lock_reason = trial_expired | payment_failed | admin | canceled.
           SCHEMA lock_reason = trial_expired | payment_failed | admin_lock | null (no `canceled`).
           APP_FLOW S-70 uses `admin_lock`.
           FR-006(4) says a cancelled plan becomes status `masterlocked` with lock_reason `canceled`, but PRD §6
           lists `canceled` as its own status after masterlocked, and the SCHEMA CHECK keeps `canceled` as a status.
           Nothing defines which transitions are allowed (for example past_due > active, masterlocked > canceled).
Evidence:  the quoted lines; code tenancy.ts:79 comment lists the same five statuses with no lock_reason.
Fix:       Add a state-transition table to SCHEMA §3.3 (from, to, trigger, actor). Use one enum
           `lock_reason IN ('trial_expired','payment_failed','admin','canceled')`. Choose either "canceled = status"
           or "canceled = lock_reason" and delete the other. Update FR-006(4), PRD §6, S-70 and T-061/T-067.
```

```
DR-02  [High / P1]  SCHEMA CHECK on invoices leaves out the `open` status the code uses
Where:     SCHEMA §3.2 E-23 (SCHEMA:97), §3.3 "Invoice (receipt) status: draft, paid, void"; M-07 (SCHEMA:222)
Violates:  FR-051, FR-118, NFR-15
Evidence:  src/server/services/billing.ts:29 `type InvoiceStatus = "paid" | "open" | "void" | "draft"`;
           billing.ts:169 `status: balance === 0 ? "paid" : "open"`; billing.ts:219 payments require `open`.
Actual:    Every pay-later or partly paid receipt is `open`. M-07 says "fix data, not constraint", which tells the
           builder to rewrite the status of financial records. The rule at SCHEMA:225 forbids that, so the two
           rules contradict each other. If the CHECK is applied to an empty database, every pay-later checkout fails.
Fix:       Change to `CHECK status IN ('draft','open','paid','void')` and add `open` to §3.3. Add a T-411 fixture
           that holds an open receipt.
```

```
DR-03  [High / P1]  SCHEMA recall_type list leaves out the only value the code writes
Where:     SCHEMA §3.2 E-17 (SCHEMA:96); FR-043b
Evidence:  src/server/services/recalls.ts:50 inserts `recallType: "dental_recall"`; schema/patients.ts:154 comment
           lists 'dental_recall' | 'vaccine_due' | 'post_procedure_checkin'.
Actual:    The target list `dental_cleaning, follow_up, vaccine_due, post_procedure` matches no stored row.
           M-07 would fail against existing data or force edits to clinical rows.
Fix:       Make the target list `dental_recall, follow_up, vaccine_due, post_procedure_checkin` (or add a mapping
           migration with an audit row). Align the FR-043b labels with it.
```

```
DR-04  [High / P1]  Vet patient and guardian data model contradicts itself and ignores existing columns
Where:     PRD FR-034 rules (PRD:175) "patient_kind='animal' requires guardian_id"; SCHEMA E-44 (SCHEMA:81)
           `guardians.patient_id` FK; SCHEMA §3.2 E-14 (SCHEMA:95) "add patient_kind ... species, breed"
Violates:  FR-034(2)(4), FR-080, X-21
Actual:    (a) PRD puts the link on the patient (`guardian_id`). SCHEMA puts it on the guardian (`patient_id`, one
           patient per guardian row). With SCHEMA's model, "a guardian with 2 pets shows both" (FR-034(2)) and
           "guardian sees all their pets" (FR-034(4)) cannot be done without duplicate guardian rows.
           (b) E-44 has no consent or address column, but FR-034 requires the guardian's consent (RA 10173) and
           address.
           (c) The code already has `patient_kind` (default 'human'), `species_breed`, `guardian_or_owner_name`
           and `display_name` (schema/patients.ts:37-44). SCHEMA says "add" and does not say what happens to them.
           (d) The guardian portal: E-44.portal_user_id is new, but the portal reads through
           `patients.portal_user_id` and the `patient_self_read` policy. No policy is designed for guardian reads.
Fix:       Pick one model (recommended: `guardians` keyed by clinic plus a `patient_guardians(patient_id,
           guardian_id, is_primary)` join, or `patients.guardian_id`). Add consent_at, address and
           portal_user_id to guardians. Map or retire the existing columns in M-04. Add an RLS policy for the
           guardian portal. Update FR-034 and T-103.
```

```
DR-05  [High / P1]  A global unique index on patients.portal_user_id makes X-18 and the guardian portal impossible
Where:     PRD X-18 (PRD:326), FR-034(4); PLAN T-035 (PLAN:149); baseline actions.md §1 says "One user can be
           linked to patient rows in several clinics"
Evidence:  src/server/db/schema/patients.ts:67-69 and migrations/0000_flimsy_red_hulk.sql:384
           `CREATE UNIQUE INDEX "patients_portal_user_id_idx" ON "patients" ("portal_user_id") WHERE portal_user_id is not null`
Actual:    One portal user can be linked to only one patient row in the whole database, so T-035 cannot pass.
           The baseline statement is wrong, and no migration in SCHEMA §8 changes the index.
Fix:       In M-04 or M-08, replace it with a unique index on `(clinic_id, portal_user_id)` (or move the link to
           guardians or a link table). Correct baseline actions.md §1. Keep T-035.
```

```
DR-06  [High / P1]  The plan+domain checkout already in the code is not reconciled with FR-004, FR-009 or D-10
Where:     PRD FR-004 rules (PRD:119) "domain ... optional add-on to the same invoice"; FR-009(3) (PRD:152);
           BLUEPRINT D-10; no K task touches it
Evidence:  src/lib/pricing.ts:6 `PLAN_FIRST_MONTH_CENTAVOS = 1490 * 100` (always the tier_1 price);
           domain-orders.ts:37-44 adds it to every domain quote;
           domain-orders.ts:198-205 sets subscription `active`, `billingInterval: "monthly"`,
           `trialEndsAt: null`, period end now+30 days, only after the domain purchase succeeds;
           the order provider can be 'xendit' (tenancy.ts:129).
Actual:    (a) Plan money is collected outside `subscription_invoices`, so it is invisible to FR-006, FR-022
           and FR-023.
           (b) The price is fixed at tier_1 whatever tier is chosen.
           (c) If the registrar fails (needs_review), the customer has paid for the plan but stays on trial
           and can be locked (X-14 meets X-09).
           (d) Plan money can be taken through Xendit, against D-10.
           (e) FR-009(3) "unless the order included a plan invoice" is always true today.
           (f) INTAKE §6 puts custom domains out of scope, yet onboarding still sells them.
Fix:       Add a K task in Wave 1 (after K-106): domain orders stop carrying plan money (planCentavos = 0) and
           the plan is paid only through A-01/E-41; or the domain becomes an E-41 line with `kind='domain'`.
           Delete PLAN_FIRST_MONTH_CENTAVOS. fulfillPaidOrder must never change the subscription. Restate
           FR-009(3), and either hide the onboarding domain offer (D-26) or record it as intended.
```

```
DR-07  [High / P1]  The new PayMongo webhook route overrides the existing domain-order webhook, and dispatch is unspecified
Where:     SCHEMA §6 route handlers (SCHEMA:191-192); TRD §2 rule 6
Evidence:  app/api/webhooks/[provider]/route.ts already serves `paymongo` (it handles domain orders);
           .env.example "PayMongo: webhook URL <site>/api/webhooks/paymongo, event checkout_session.payment.paid";
           route.ts:32 returns 200 and fulfils in `after()` (a transient failure is never retried);
           paymongo.ts:107 ignores every event type except checkout_session.payment.paid.
Actual:    A static `app/api/webhooks/paymongo/route.ts` takes precedence over `[provider]`. Domain-order webhooks
           would reach the subscription handler, and paid domains would never be delivered. SCHEMA says the domain
           route follows the "same rules", but it acknowledges before the provider re-read and cannot return 500
           to get a retry. The event types for Mode A payment links are not specified (FR-005).
Fix:       Keep one PayMongo endpoint. Dispatch on metadata (`kind: domain_order | subscription_invoice`, id) and
           list every subscribed event type. Write in SCHEMA §6 which rules the domain path actually follows,
           or bring it in line. Add T-064 fixtures for both kinds and for a link-payment event.
```

```
DR-08  [High / P1]  Masterlock enforcement in requireWorkspace would block the payment page the locked owner needs
Where:     PRD FR-014 rules (PRD:127) "check ... used by requireActiveClinic, requireWorkspace ..."; APP_FLOW S-70
           (APP_FLOW:148) and §5 "S-34 ... reachable while locked"; SCHEMA §5 cross-rule 1
Evidence:  app/clinix-ph/admin/subscription/page.tsx:10 `await requireWorkspace()`; admin/layout.tsx also uses it.
Actual:    If the lock check lives in requireWorkspace as written, S-34 and S-71 (/clinix-ph/admin/subscription/
           return) become unreachable for a locked owner. The only way back would then be R-01, which breaks
           FR-014(4) and W-12.
Fix:       Specify a separate gate (for example `requireWorkspace({ allowLocked: true })`) used only by S-34, S-71,
           A-01 and sign-out. List the allowed routes in FR-014. Make T-027 assert that a locked owner can still
           pay.
```

```
DR-09  [High / P1]  The permission matrix does not mark every cell that differs from the code
Where:     SCHEMA §5 (SCHEMA:129-162) "A cell in bold differs from the as-built code"; only P-24 is bold
Compared:  docs/baseline/actions.md §4
Actual:    These cells differ from the code but are not bold:
           P-15 O "RU" (code has no profile update);
           P-22 O "pay, change tier, add clinic" (code is read only plus domain);
           P-04 (guardians) and P-19 (privacy requests), which are new;
           P-25/P-26 (new tables);
           P-08 P "CRU" (code lets the practitioner cancel plans and items, so D);
           P-06 O has no void-own although code allows void own;
           P-16 A "send now", which has no reachable screen (the reminders page is RACO);
           P-24 SA lock/tier through the UI (today only through the AI confirm path).
           K-005 builds tests "built behaviour first" from this table, so unmarked cells will produce tests that
           are wrong, or that get "fixed" silently.
Fix:       Add a "Code today" column, or bold every differing cell with its PD or FR reason. Add PD rows for
           P-08 (practitioner cancel) and P-16.
```

```
DR-10  [High / P1]  Wave dependencies are missing or impossible (migrations and tasks)
Where:     IMPLEMENTATION_PLAN §2
Actual:    (a) Migration M-03 (clinic columns, `clinic_counters`, vertical_profile) has no owning task, but K-301,
               K-302, K-304 and K-202 need it.
           (b) M-05 creates E-47 idempotency_keys, which K-106 (Wave 1) needs. M-05 is assigned to K-108 (no
               dependency from K-106) and again to K-402 (Wave 4).
           (c) K-103 sends lifecycle emails (FR-073) before K-108 builds `sendEmail` and `email_log`.
           (d) K-202 add clinic needs a vertical and timezone (A-03), but K-302 is Wave 3.
           (e) K-105, K-106 and K-206 need PLAN_LIMITS (K-101) but do not depend on it.
           (f) No task creates `/api/cron/daily` or changes vercel.json (it still points at /api/cron/reminders
               only).
           (g) K-603 omits K-201, K-601 and K-602, which its checklist covers.
Fix:       Add K-109 "M-03 + M-05 migrations" to Wave 1 (Dep K-102), with K-106, K-108, K-202, K-301 and K-304
           depending on it. Remove M-05 from K-402. Make K-103 depend on K-108, K-202 on K-302 (or move the
           vertical choice into K-202), and K-105/K-106/K-206 on K-101. Add K-110 "cron route /api/cron/daily +
           vercel.json + alias" to Wave 1. Extend K-603's dependencies.
```

### Medium

| ID | Where / ID | Finding (evidence) | Fix |
|---|---|---|---|
| DR-11 | BLUEPRINT §3 rule 1; PRD §3 M-01..M-12; SCHEMA §8 M-01..M-08; PLAN K-102 "Migration M-01" vs K-605 FR column "M-12" | The same ID prefix is used for both modules and migrations, so "M-05" means Billing in one place and "privacy and email migration" in another. | Rename the migrations to MG-01..MG-08 (or DB-nn) and update SCHEMA, PLAN and BLUEPRINT. |
| DR-12 | APP_FLOW S-38 route `/clinix-ph/admin/privacy` (APP_FLOW:38), R-04 menu (APP_FLOW:83); SCHEMA P-19 A=CRU | The console is owner-only (`requireWorkspace` in admin/layout.tsx), so the assistant cannot reach S-38. | Add `/clinix-ph/app/[role]/privacy` for R-04 (with a clinic-app-nav entry), or limit P-19 to O. |
| DR-13 | INTAKE §4 Practitioner "own records only" vs PRD R-05 "reads patients"; P-02 P=R all; PD-03 covers custom fields only | The practitioner's read scope departs from the confirmed brief and no decision row records it. | Add PD-11 "Practitioner reads all clinic patients (keep code)", or restrict reads. Cite it in P-02 and P-06. |
| DR-14 | SCHEMA E-06 adds `vertical_profile (dental, vet, eye, derma, general)` (SCHEMA:94); FR-033 "exactly one specialty (`clinics.specialty`)", "`general` not offered"; seed Tenant B "clinic B1 general" (SCHEMA:234) | There are two columns for one concept. `general` contradicts D-27 and the code (`SPECIALTIES = ["dental","vet","eye","derma"]`, constants.ts:81), and onboarding would reject the seed. | Drop `vertical_profile` and use `specialty` with a CHECK on the four values. Change the seed B1 to `eye` or `derma`. Use "skin" as the label for `derma` throughout. |
| DR-15 | PRD FR-033(2) labels "Pet", "Owner"; APP_FLOW W-03 "owner/guardian block"; DESIGN_BRIEF §6 (DESIGN_BRIEF:228) "guardian ... never owner", vet shows "Patient" | The UI words contradict each other, and T-098 tests copy verbatim. | Use "Guardian" and "Patient" everywhere (DESIGN_BRIEF wins), or record an exception. Fix FR-033 and W-03. |
| DR-16 | FR-013 (one email at 3 days); SCHEMA J-03 (3 days, 1 day, ended); APP_FLOW §6 (welcome, 3 and 1 day); FR-073 (no welcome or 1-day; adds payment failed and reactivated, which are missing from APP_FLOW §6); FR-115 "all 9 templates" | The set of lifecycle emails is undefined. Code has 7 templates (email-templates.ts), and live-check #3 lists 5. | Make a single email catalogue table in APP_FLOW §6 (template id, trigger, dedupe key) with the exact count. FR-073, J-03, FR-115 and live-check cite it. |
| DR-17 | PRD X-04 (PRD:312) "skip accounts with open invoice <48 h while provider health failing"; SCHEMA J-04 (SCHEMA:204) "skips accounts with an open provider outage flag" | The two rules differ, and neither "provider health" nor the "outage flag" exists in any entity or env var. | Define one rule plus its data (for example a `platform_settings.paymongo_degraded_until` set by R-01 or an alert) and test it in T-204. |
| DR-18 | SCHEMA E-41 (SCHEMA:75), J-04 idempotency, FR-004(3); E-42 and J-03 "(account,type,date)" | J-04 relies on "unique (subscription_id, period_start)", which is not in E-41. No job moves `open` to `expired` after 24 h. The J-03 dedupe key is not a constraint. | Add the unique index to E-41, plus a partial unique key on E-42 (account_id, type, date). Add the invoice expiry to J-04 or J-06. |
| DR-19 | SCHEMA E-46 email_log tenant "A (nullable C)", RLS on account_id; FR-072 | Verification and reset emails happen before any account exists, so the row cannot satisfy account_id plus RLS. FR-072 cannot be logged as designed. | Make account_id nullable, add a policy for system inserts with account_id null (or keep auth emails in a separate table without RLS). State this in SCHEMA §4. |
| DR-20 | SCHEMA §4 E-41/E-42 "writes by webhook run in withAccount" | The webhook knows only the provider id. Finding the account needs a cross-tenant read, and no GUC or policy exists for it (domain orders use `withOrder`, client.ts:96). | Add `withSubscriptionInvoice(providerRef)` and a matching SELECT policy, or a SECURITY DEFINER lookup. Document it in §4. |
| DR-21 | PRD FR-112, NFR-01, PLAN T-030 "all 29 RLS tables" | 29 is the current count (verified: 40 tables, 29 forced). The target adds E-41, E-42, E-44, E-45, E-46, clinic_counters and E-36, so a suite generated from "29" misses the new tables. | Say "every table with RLS = Y in SCHEMA §2 (generated)" instead of a number. |
| DR-22 | SCHEMA §1 conventions vs code | Archive is said to be `archived_at`, but patients, services and inventory_items use `deleted_at`. E-07 "adds `interval` (month/year)", but `billing_interval` ('monthly'/'annual') exists, and `current_period_ends_at` and `trial_ends_at` exist (tenancy.ts:78-82). `stripe_*` has no rename step. `clinic_slot_limit` competes with PLAN_LIMITS. `clinics` has no `archived_at` (E-06 rule). E-25 says `amount` (the column is `amount_cents`). E-23 says `number` (it is `invoice_number`). | Add an "as-built column" column to SCHEMA §3.2 and use the real names. Name the source of truth for slots (recommended: the column, set from PLAN_LIMITS, with an enterprise override). |
| DR-23 | PRD FR-007(2) "name, specialty, subdomain"; APP_FLOW S-72 fields (APP_FLOW:151); SCHEMA A-03 `name, vertical, timezone` | No subdomain is collected, but `clinics.subdomain` is NOT NULL UNIQUE. | Add a `subdomain` field to S-72 and A-03 (reserved list and taken-name errors, as in FR-004a). |
| DR-24 | FR-006(2) "pay the difference as a new invoice"; E-41 kind `upgrade`; NFR-09 | The upgrade proration formula is undefined, and no money vector exists for subscription amounts. | Define the formula (for example the remaining days times the price difference, rounded to the centavo) and add T-07x vectors. |
| DR-25 | FR-092(4) "at most one more succeeds (atomic counter)"; E-37 append-only `agent_usage` | Counting append-only rows cannot guarantee the cap under concurrency, and no counter row or lock is specified. | Add a `clinic_ai_usage(clinic_id, month, answers)` counter with a guarded `UPDATE ... WHERE answers < cap RETURNING`. |
| DR-26 | baseline actions.md §7 #8, #11, #20; INTAKE §4 "reads cross-tenant data only through audited admin paths" | No FR covers: the session cookie scoped to `.databridgesol.space`, shared with the sibling app `nlminventory` (auth.ts:132-133); domain checkout acting on `clinics[0]`; unaudited onboarding and login; audit of platform reads. | Add FR-117(j) cookie scope (`__Host-` cookie or move the sibling app off the domain), (k) host-bound clinic for domain checkout, FR-024 audit of platform tenant-detail reads, and an onboarding audit row. |
| DR-27 | PLAN §6 launch checklist item 1 (PLAN:239) vs INTAKE §5 gate 5 | Error tracking and uptime (T-421) and the Mode A renewal live check are not in the gate list. | Add T-421 and live-check #5 to item 1. |
| DR-28 | PLAN proofs | K-207 to T-064 (should be T-214, plus a J-05 test); K-108 to T-060 (unrelated); K-103 to T-112 (needs K-106); K-104 to T-227 (needs PayMongo); FR-105 to T-093 only (no data-correctness test); FR-011 to T-304. NFR-05, NFR-13, NFR-14 and NFR-15 have no tests. T-098 has no owning task. | Re-map the proofs. Add T-119 "Overview numbers equal seeded sums in clinic time" and an NFR coverage section. |
| DR-29 | DESIGN_BRIEF §2 tokens (DESIGN_BRIEF:173-174); NFR-10 "3:1 UI/borders" | Measured `line` #e1e7e4 on #ffffff = 1.25:1 and dark `line` #1e293b on #111827 = 1.21:1. Wherever the line is the only boundary of an input, it fails WCAG 1.4.11. The brief lists the tokens as fine. All text pairs measured pass (4.75-13.31:1). | Add a `--color-console-border-strong` of at least 3:1 for input and control borders, and give T-090 a UI-pair list. |
| DR-30 | PRD FR-104 types (access, correction, objection, erasure-restriction) vs APP_FLOW S-38 and SCHEMA E-45 (access, correction, erasure) | The enumerations do not match. | Use one list in E-45 and cite it from FR-104 and S-38. |
| DR-31 | TRD §2 and §4 | `src/server/payments/` is really `src/server/services/payments/`. `AGENT_DAILY_AI_LIMIT` is marked "no" but is in .env.example. GOOGLE/APPLE/FACEBOOK_CLIENT_ID/SECRET are missing from the table. Geist Mono is used but not listed. T-003 is generated from this table, so it will be wrong. | Correct the TRD table and the path, and add the social variables. |

### Low

| ID | Where | Finding | Fix |
|---|---|---|---|
| DR-32 | APP_FLOW registry | S-42 cites FR-050 (should be FR-035). S-46 cites FR-052 (should be FR-050/051). S-65 cites FR-092 (should be FR-093/P-28). S-83 "R-01" vs P-30 PS=R. | Correct the feature and role cells. |
| DR-33 | APP_FLOW W-04, W-07, W-08 | W-04 says status `scheduled` (code books `confirmed`). W-07 includes "HMO" as a payment method (not in PAYMENT_METHODS). W-08 says "submitted" (code `filed`). | Use the code enumerations. |
| DR-34 | SCHEMA J-02 "due today or overdue" | FR-071 and the code use due within 7 days, including overdue. | Align J-02. |
| DR-35 | APP_FLOW S-35/S-36 | Both use route `/clinix-ph/admin/settings`. | Give S-36 its own `?tab=profile`. |
| DR-36 | PRD/PLAN IDs | FR-004 vs FR-004a and FR-005 vs FR-005a are unrelated features with near-identical IDs. FR-013b is a pointer with its own coverage row. "T-2nn = X-nn" is broken (T-215 = X-19, T-216 = X-20, T-217 = X-22, T-227). | Renumber, or retire with a note (BLUEPRINT rule 1). |
| DR-37 | PLAN T-051, T-053, T-056 | "base" and per-line "spread" are not outputs of `invoiceTotalsFor`. T-056 uses a first due date in the past, which checkout refuses (actions.md §6). | Assert only returned fields, or the persisted line rows. Mark T-056 as a unit test of `buildInstallments` or freeze the clock. |
| DR-38 | PLAN §5, BLUEPRINT §7, INTAKE header | PLAN §5 points to a "BLUEPRINT launch section" that does not exist. BLUEPRINT §7 points to "section 8 of this file's review step". INTAKE still says "DRAFT for confirmation". | Fix the references and mark INTAKE confirmed (with date). |
| DR-39 | PRD FR-119 and PD-10 "delete posTotals()" | invoice-totals.ts:1 imports VAT_RATE and STATUTORY_DISCOUNT_RATE from pos-totals.ts, so deleting the file breaks the build. | Say "move the constants into invoice-totals.ts, then delete posTotals()". |
| DR-40 | DESIGN_BRIEF §3, PLAN T-094 | Breakpoints are 375/768/1024/1440. The Quality standard also needs 360 and 390 phones (gap). | Add 360 to T-094. |
| DR-41 | PRD FR-022 | MRR for annual-interval accounts is undefined. | Define MRR = annual price / 12. |
| DR-42 | SCHEMA §3.2 vs §4 vs FR-118 | Append-only triggers are listed inconsistently (audit_logs only; E-35/E-42/E-43; audit_logs and subscription_events). | Use one list. |
| DR-43 | PRD X-07 "manual run route for R-01" | It is not in the SCHEMA §6 contracts. | Add an R-01-only POST that reruns a single job (audited). |
| DR-44 | .env.example `EMAIL_FROM="Clinix PH <no-reply@clinix.ph>"`; live-check #3 "real sender domain" | The sender domain is unspecified and does not match D-01 names. | Record the sender domain in TRD §4. |

## 4. Gaps (documents silent)

- Subscription transition table (DR-01), proration (DR-24), webhook event catalogue and dispatch (DR-07), provider-health data (DR-17), email catalogue (DR-16), guardian portal policy (DR-04).
- Ownership transfer is only a runbook item (X-13). Add an FR, or record it as Won't with the reason.
- Clinic archive: E-06 says `archived_at` but no FR, column or screen exists. Add it or retire the rule.
- Platform admin MFA: baseline says there is none. No FR or decision covers it. Record it as accepted risk or add it to FR-117.

## 5. Results table (spot checks against code: 47 claims)

| Area | Checks | Pass | Fail |
|---|---|---|---|
| Versions (next 16.3.6, react 19.2.4, drizzle-orm 0.45.3, drizzle-kit 0.31.11, pg 8.23.0, better-auth 1.7.5, zod 4.6.5, vitest 3.2.7, @google/genai 2.27.0, @anthropic-ai/sdk 0.131.0) | 10 | 10 | 0 |
| Infra: region sin1; cron `0 1 * * *` (= 09:00 Manila) at /api/cron/reminders; maxDuration 300 | 3 | 3 | 0 |
| Constants: TRIAL_DAYS 15; STAFF_INVITE_TTL_DAYS 7; TIER_MRR 1490/2690/3690/4590; SPECIALTIES (no general); PAYMENT_METHODS; CLAIM_STATUSES | 6 | 5 | 1 (SCHEMA general, DR-14) |
| Rate limits: sign-up 5/h IP (FR-002 "6th refused"); webhook 300/min; PayMongo tolerance 5 min; export 20/h; clinic agent 30/10 min; pool max 8 | 6 | 6 | 0 |
| Counts: 40 tables / 29 forced RLS / 11 none; 74 actions; 34 test files / 153 cases; 6 onboarding steps | 4 | 4 | 0 |
| Schema claims: invoice statuses; recall types; portal link multiplicity; patient_kind "add"; subscriptions columns; archive column names; clinics.archived_at | 7 | 0 | 7 (DR-02, 03, 05, 04, 22) |
| Routes and env: S-38 route reachability; /api/webhooks/paymongo; domain route "same rules"; TRD payments path; TRD env table; @neon/env and drizzle-zod unused (FR-119) | 6 | 1 | 5 (DR-12, 07, 31) |
| Money vectors T-050..T-056 recomputed by executing a copy of invoice-totals.ts and installments.ts | 7 | 7 | 0 |
| Design tokens (brand, accent, muted, subtle hex) and text contrast | 2 | 2 | 0 (border pairs fail, DR-29) |
| Email template count (FR-115 "9") | 1 | 0 | 1 (DR-16) |

Money vector evidence (`node --experimental-strip-types orig/run.ts`): T-050 {100000, 0, vat 10714, 100000}; T-051 {disc 17857, vatExempt 10714, total 71429}; T-052 {disc 20000, vatExempt 0, total 80000}; T-053 {disc 10000, vat 9643, total 90000}; T-054 {disc 100000, total 0}; T-055 {sub 47035, disc 8613, vatExempt 3968, total 34454}; T-056 33333/33333/33334 due 2026-01-31, 2026-02-28, 2026-03-31. All match the plan to the centavo. T-053's internal spread (3334 + 6666) was checked by hand.

Other checks:
- INTAKE requirement to PRD: all 17 I-rows and all 5 launch gates map to FRs. The exceptions are DR-13, DR-26 (platform reads) and DR-27.
- Five states: specified for the new screens; built screens are covered by baseline screens.md §3.

## 6. Not tested

- No tsc, eslint, vitest, build or npm audit (no registry access, as instructed). The Vitest suites were not run, so they were not used as evidence.
- PayMongo behaviour (Subscriptions, Links events, 24 h rules) was not checked against live docs or the dashboard. That remains an FR-115 item.
- No DB or Neon access. RLS policies were read from migrations only, and the cutover state is unknown.
- Not read in full: baseline schema.md and infra.md, docs/architecture.md, the AGENTS.md body beyond rule greps, and most UI components.

## 7. Coverage

- FRs whose proof is weak or wrong: FR-009, FR-011, FR-105, FR-073 (DR-28).
- NFRs with no test: NFR-05, NFR-13, NFR-14, NFR-15.
- Tests with no task: T-013..T-016, T-034 and T-098. These are built-behaviour tests with no K owner other than "Wave 0 tests".

## 8. Next actions (smallest set to PASS)

1. DR-01, DR-02, DR-03, DR-22: correct the SCHEMA enumerations, columns and transition table.
2. DR-04, DR-05: settle the guardian and portal-link model and its migration.
3. DR-06, DR-07: one PayMongo endpoint with dispatch; take plan money out of domain orders.
4. DR-08: add the lock-exempt gate for S-34 and S-71.
5. DR-09: mark the matrix against the code before K-005.
6. DR-10, DR-11: rewire the wave dependencies and rename the migration IDs.
7. Re-run this doc review. Medium findings may be closed during their waves, but DR-12, DR-14, DR-18, DR-19 and DR-20 should be closed before Wave 1 starts.

---

## Re-check (2026-10-10, audit only)

**Verdict: FAIL, but close.** All 10 original High findings are fixed. One new High finding came in with the edits (RC-01). It needs only a one-line rule change, and once it is fixed the result becomes PASS with notes. No code or blueprint file was edited. Method: I re-read SCHEMA in full, the changed sections of PRD, APP_FLOW, PLAN, TRD and DESIGN_BRIEF, the INTAKE header and the baseline correction, and re-checked against the code where a name or value is cited. Recomputed by hand: T-070 is (269000-149000)x15/30 = 60000, and T-071 is 120000x10/31 = 38709.68, which rounds to 38710. Both are correct.

### Original High findings: all resolved
| ID | Resolved at |
|---|---|
| DR-01 | SCHEMA §3.3 enum and state table; PRD FR-014 rules; FR-006(4); APP_FLOW S-70 (`admin`, `canceled` as a status) |
| DR-02 | SCHEMA §3.2 E-23 `('draft','open','paid','void')` |
| DR-03 | SCHEMA §3.2 E-17 and §3.3; FR-043b (as-built values) |
| DR-04 | SCHEMA E-44 and E-48, the §4 `guardian_self_read` policy and `patient_portal_v`; PRD FR-034 rules |
| DR-05 | SCHEMA E-14 row and MG-04; baseline actions.md §1 correction note |
| DR-06 | PRD FR-004 rules and FR-009(3)(4); PLAN K-111 |
| DR-07 | SCHEMA §6 single `[provider]` endpoint; TRD §2 rule 6; T-074 |
| DR-08 | PRD FR-014 lock-exempt routes; K-104; T-075 |
| DR-09 | SCHEMA §5 `*` marks and the §5.1 table; PD-11, PD-12 |
| DR-10 | PLAN K-109, K-110, K-111; dependencies rewired; MG owners listed in SCHEMA §8 |

### Medium and Low findings still open or only partly fixed
- **DR-21 (partly fixed):** PLAN T-030 still says "all 29 RLS tables". *Fix:* "every RLS = Y table in SCHEMA §2".
- **DR-28 (partly fixed):** K-108's proof still cites T-060 and K-010's proof still cites T-421. *Fix:* cite T-205 and EM dedupe for K-108, and a health-route test for K-010.
- **DR-31/DR-44 (partly fixed):** TRD `EMAIL_FROM` cites OQ-06, which is the PayMongo question. *Fix:* cite live-check #3 or a new OQ.
- **DR-38 (open):** BLUEPRINT §7 still refers to "section 8 of this file's review step".
- **DR-40 (partly fixed):** PLAN §7 done rule still lists 375/768/1024/1440. *Fix:* use the T-094 set (360..1440).
- **DR-42 (partly fixed):** the append-only trigger is assigned twice, in MG-02 (K-203) and MG-07 (K-405). E-42 has no trigger until Wave 2. *Fix:* create E-42's trigger in MG-01 and drop the duplicate from MG-07.
- Every other item from DR-11 to DR-44 is resolved.

### New findings introduced by the edits
| ID | Sev | Where | Finding | Fix |
|---|---|---|---|---|
| RC-01 | **High** | SCHEMA E-41 rule; J-04 "expire `open` invoices older than 24 h" | The rule also catches renewal invoices, which are created 5 days before the due date with an emailed link. They would expire after 24 h, and the unique key `(subscription_id, period_start, kind)` then blocks creating a new one. Mode A renewals (FR-005, Must) cannot be paid. | Expire after 24 h only when `kind IN ('first','upgrade','domain')`. A renewal stays `open` until it is paid or the account locks. Make the unique key partial `WHERE status IN ('open','paid')`. |
| RC-02 | Medium | PRD FR-004(1); FR-014 lock-exempt list; SCHEMA §5 cross-rule 1; K-104; T-075 | A-01 is allowed only for "trialing or past_due" accounts, yet S-70 and W-12 send `masterlocked` and `canceled` owners to pay. A-13 `resubscribeAction` and `cancelSubscriptionAction` are not on the exempt list. | Add `masterlocked` (trial_expired/payment_failed) and `canceled` to FR-004(1). Add A-13 to every exempt list. |
| RC-03 | Medium | SCHEMA §4 `provider_ref_lookup` | The lookup matches only `provider_checkout_id`. Mode A payment links (`link.payment.paid`) carry a link or payment reference that has no column. | Add `provider_link_id` to the policy, or look up by `metadata` invoice id through the GUC. |
| RC-04 | Medium | SCHEMA §3.3 vs PRD FR-005 Mode B and Rules | Mode B has webhook transitions (failed charge to `past_due`; unpaid to `masterlocked`) that are not in the table, which says "no other transition is allowed". "Grace is the retry window only (no extra days)" contradicts Mode A's 3 days. | Add the webhook rows marked Mode B, and scope the grace sentence to Mode B. |
| RC-05 | Medium | SCHEMA §4 `patient_portal_v` | A view runs with its owner's rights. If the migration owner role owns it, row-level security on `patients` is bypassed unless the view filters rows itself. | Use `WITH (security_invoker = true)`, or filter on `current_setting('app.current_user_id')` inside the view. T-023 should assert the cross-user deny. |
| RC-06 | Low | PRD §6 "States" line | It still says "trialing > active > past_due > masterlocked > canceled", which contradicts the table (canceled comes from active or past_due). | Replace it with a citation of SCHEMA §3.3. |
| RC-07 | Low | SCHEMA §3.3 row "`masterlocked` > `masterlocked (admin)`" | The From column should be any non-canceled status. | Fix the From cell. |
| RC-08 | Low | PRD FR-007 Rules | It says "slots from PLAN_LIMITS", but E-07 makes `clinic_slot_limit` the enforced value. | Align FR-007 with E-07. |
| RC-09 | Low | APP_FLOW S-34, S-70, §6; S-63 | S-34 has no Cancel or Resubscribe control. The S-70 trigger omits `canceled`. No email confirms a cancellation. S-63 has no R-01 control (with P cell and audit) for `paymongo_degraded_until`, which X-04 relies on. | Add the controls, the EM row and the S-63 toggle. |
| RC-10 | Low | PLAN K-103 and K-110 | Wave 1's exit needs J-03 to run on the cron, but K-103 does not depend on K-110. | Make K-103 depend on K-110. |
| RC-11 | Low | PRD FR-117(j) | The "host-only cookie" option would break the cross-subdomain session (`crossSubDomainCookies`, auth.ts:132-133) that FR-010 depends on. | Choose "move the sibling app" (or handoff) and remove the host-only option. |
| RC-12 | Low | PLAN §6 item 1 | The billing proof lists T-060..T-069 but leaves out T-070..T-075. | Change it to T-060..T-075. |

Counts still open: High 1 (RC-01); Medium 4 new (RC-02..RC-05) and 0 old; Low 7 new plus 6 partly-fixed or open old items.
