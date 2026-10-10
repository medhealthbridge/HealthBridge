# APP_FLOW: DataBridgeSol / Clinix PH

Screens, navigation, workflows. Built screens keep their element tables in `docs/baseline/screens.md` (cite as BS-4.x); this file does not copy them. New or changed screens are specified in full here. Features are in `docs/PRD.md` (FR-x). Names of tables and fields match `docs/SCHEMA.md`.

## 1. Screen registry (S-IDs)

Status: B = built (real), M = built as mock (to be removed or made real), N = new, C = changed. Roles use R-IDs (PRD section 2).

| ID | Screen | Route | Who (R-) | Status | Features |
|---|---|---|---|---|---|
| S-01 | Company landing | `/` | R-07 | B, C | FR-001, FR-110 |
| S-02 | Clinix landing | `/clinix-ph` | R-07 | B, C | FR-001, FR-026, FR-110 |
| S-03 | Login and signup | `/clinix-ph/auth` | R-07 | B, C | FR-002, FR-110 |
| S-04 | Reset request | `/clinix-ph/auth/reset` | R-07 | B | FR-002 |
| S-05 | Reset confirm | `/clinix-ph/auth/reset/confirm` | R-07 | B | FR-002 |
| S-06 | Platform login | `/admin-login` | R-01, R-02 | B | FR-020 |
| S-07 | Onboarding wizard | `/clinix-ph/onboarding` | R-03 (new) | B, C | FR-015, FR-033 |
| S-08 | Staff join | `/clinix-ph/join?token=` | R-04, R-05 | B | FR-030 |
| S-09 | Portal join | `/clinix-ph/portal/join?token=` | R-06 | B | FR-080 |
| S-20 | Owner Overview | `/clinix-ph/admin` | R-03 | B, C | FR-105 |
| S-21 | Owner Assistant | `/clinix-ph/admin/assistant` | R-03 | B, C | FR-090..093 |
| S-22 | Patients (console) | `/clinix-ph/admin/patients` | R-03 | B | FR-031 |
| S-23 | Patient chart (console) | `/clinix-ph/admin/patients/[mrn]` | R-03 | B, C | FR-031, FR-034, FR-103, FR-104 |
| S-24 | Appointments (console) | `/clinix-ph/admin/appointments` | R-03 | B | FR-035 |
| S-25 | Services and pricing | `/clinix-ph/admin/services` | R-03 | B | FR-057 |
| S-26 | Recalls (console) | `/clinix-ph/admin/recalls` | R-03 | B, C | FR-043, FR-043b |
| S-27 | Billing (console) | `/clinix-ph/admin/billing` | R-03 | B | FR-050 |
| S-28 | Receipt detail (console) | `/clinix-ph/admin/billing/[number]` | R-03 | B, C | FR-050, FR-052, FR-055, FR-056 |
| S-29 | Inventory (console) | `/clinix-ph/admin/inventory` | R-03 | B, C | FR-060, FR-061 |
| S-30 | Claims (console) | `/clinix-ph/admin/claims` | R-03 | B | FR-054 |
| S-31 | Reminders | `/clinix-ph/admin/reminders` | R-03 | B | FR-070, FR-071 |
| S-32 | Staff and roles | `/clinix-ph/admin/staff` | R-03 | B | FR-030 |
| S-33 | Import and export | `/clinix-ph/admin/import-export` | R-03 | B, C | FR-100, FR-101 |
| S-34 | Subscription | `/clinix-ph/admin/subscription` | R-03 | B, C | FR-004, FR-005, FR-006, FR-007 |
| S-35 | Settings: patient fields, discounts | `/clinix-ph/admin/settings?tab=patient-fields` and `?tab=discounts` | R-03 | B | FR-032, FR-053 |
| S-36 | Settings: clinic profile | `/clinix-ph/admin/settings?tab=profile` | R-03 | B, C | FR-037 |
| S-37 | Activity log | `/clinix-ph/admin/activity` | R-03 | B | FR-102 |
| S-38 | Privacy requests | `/clinix-ph/admin/privacy` (R-03) and `/clinix-ph/app/[role]/privacy` (R-03, R-04) | R-03, R-04 | N | FR-104 |
| S-39 | Modules and Feedback (owner) | `/clinix-ph/admin/modules`, `/feedback` | none | M, removed | FR-026 |
| S-40 | Today or My schedule | `/clinix-ph/app/[role]` | R-03, R-04, R-05 | B | FR-035, FR-036 |
| S-41 | Queue | `.../queue` | R-03, R-04 | B | FR-036 |
| S-42 | Calendar | `.../appointments` | R-03, R-04, R-05 | B | FR-035 |
| S-43 | Patients (app) | `.../patients` | R-03, R-04, R-05 | B | FR-031 |
| S-44 | Patient chart (app) | `.../patients/[mrn]` | R-03, R-04, R-05 | B, C | FR-031, FR-040, FR-041, FR-042, FR-034 |
| S-45 | Recalls (app) | `.../recalls` | R-03, R-04, R-05 | B, C | FR-043 |
| S-46 | Billing and checkout (app) | `.../billing` | R-03, R-04 | B | FR-050, FR-051 |
| S-47 | Receipt detail (app) | `.../billing/[number]` | R-03, R-04 | B, C | FR-050, FR-052, FR-055, FR-056 |
| S-48 | Claims (app) | `.../claims` | R-03, R-04 | B | FR-054 |
| S-49 | Inventory (app) | `.../inventory` | R-03, R-04, R-05 | B | FR-060 |
| S-50 | Patient fields (practitioner) | `.../patient-fields` | R-05 | B | FR-032 |
| S-60 | Platform Overview | `/admin` | R-01, R-02 | M, C | FR-022 |
| S-61 | Platform Assistant | `/admin/assistant` | R-01, R-02 | B | FR-090 |
| S-62 | Tenants (list and detail) | `/admin/tenants`, `/admin/tenants/[id]` | R-01 manage, R-02 read | B, C | FR-008, FR-025 |
| S-63 | Platform Billing | `/admin/billing` | R-01, R-02 | M, C | FR-023 |
| S-64 | Company staff | `/admin/staff` | R-01 manage, R-02 read | B | FR-020 |
| S-65 | AI settings | `/admin/ai-settings` | R-01 | B | FR-093, FR-092 |
| S-66 | Platform invite accept | `/invite?token=` | invitee | B | FR-020 |
| S-68 | Platform audit log | `/admin/audit` | R-01, R-02 read | M, C | FR-024 |
| S-69 | Platform Modules, Support, Feedback | `/admin/modules`, `/support`, `/feedback` | none | M, removed | FR-026 |
| S-70 | Account locked | any clinic route when `masterlocked` | R-03 (pay), R-04, R-05, R-06 (message) | N | FR-014 |
| S-71 | Checkout return | `/clinix-ph/admin/subscription/return?invoice=` | R-03 | N | FR-004 |
| S-72 | Add clinic | dialog on S-34 | R-03 | N | FR-007 |
| S-73 | Not found | any unknown route | all | N | FR-116 |
| S-74 | Error and no-access | `error.tsx`, `global-error.tsx`, 403 view | all | N | FR-116 |
| S-75 | Terms of Service | `/terms` | R-07 | N | FR-110 |
| S-76 | Privacy Policy | `/privacy` | R-07 | N | FR-110, FR-111 |
| S-77 | Data Processing Notice | `/data-processing` | R-07 | N | FR-110 |
| S-78 | Patient portal | `/clinix-ph/portal` | R-06 | B, C | FR-080, FR-080b |
| S-79 | Offline page | `/offline.html` (service worker) | all | B | FR-016, FR-124 |
| S-81 | Domain purchase | section on S-34 | R-03 | B, C | FR-009 |
| S-82 | Specialty (the clinic's vertical) | section on S-07; read-only on S-36 after setup | R-03 | N | FR-033 |
| S-83 | Domain orders (needs review) | tab on S-62 | R-01 act, R-02 read | N | FR-009 |

Screens removed in this release (FR-026): S-39, S-69, owner Feedback, the "Notify me" stubs on S-02, invented notification counts. Routes return S-73.

## 2. Roles, entry and navigation

| Role | Signs in at | Lands on | Menu (new items marked) |
|---|---|---|---|
| R-01 | S-06 | S-60 | Overview, Assistant, Tenants, Billing, Company staff, Audit log, AI settings |
| R-02 | S-06 or S-66 | S-60 | as R-01 without AI settings; read-only on Tenants |
| R-03 | S-03 | S-20 (via `/clinix-ph/app` router) | Overview, Assistant (if granted), Patients, Appointments, Services, Recalls, Billing, Inventory, Claims, Reminders, Staff, Import/export, **Privacy requests**, Subscription, Settings, Activity; link "Clinic app" to S-40 |
| R-04 | S-03 via S-08 | S-40 | Today, Queue, Appointments, Patients, Recalls, Billing, Inventory, Claims, **Privacy requests** |
| R-05 | S-03 via S-08 | S-40 | My schedule, My calendar, Patients, Recalls, Inventory, Fields |
| R-06 | S-03 via S-09 | S-78 | none (My records, Log out) |
| R-07 | none | S-01/S-02 | Legal links in every footer |

Rules: authorization is server-side in every page and action (AGENTS.md); hiding a link is not security. Menu per role comes from `src/lib/clinic-app-nav.ts`. A role opening a route it may not use gets S-73 (404, exists) or S-74 view 403 where the user is signed in and the route exists (new, FR-116). Mobile: first four items in the bottom bar, rest under More (exists).

## 3. Workflows

Notation: Trigger > steps > result. Unhappy paths (U) are test cases (IMPLEMENTATION_PLAN T-x).

**W-01 Owner signup to first clinic.** S-02 > S-03 signup (consent checkbox, FR-110) > verification email > link > S-03 login > S-07 wizard (clinic name, specialty, type, specialty S-82, timezone) > clinic created, `subscriptions` row `trialing`, 15-day end date, welcome email (FR-073) > S-20. U: email not verified (resend notice); verification email fails (FR-072 message); duplicate email; wizard abandoned (resume on next login); invalid specialty.

**W-02 Invite staff.** S-32 invite (email, role assistant or practitioner) > email with single-use link, 7 days > S-08 (set name, password) > membership active > S-40. U: expired/used/invalid token message; invitee email already a user (sign in then join); owner deactivates staff mid-session (X-17); invite for role owner is refused.

**W-03 Create patient.** S-43/S-22 add > Zod validate > duplicate check by name+birthdate+mobile warning > MRN assigned > audit row > chart S-44. For vet clinics: the guardian block (choose or create a guardian) is mandatory (FR-034). U: duplicate warning, bad mobile, offline (X-01, input kept).

**W-04 Book, check in, serve.** S-42 book (patient, practitioner, service, slot) > conflict check > `confirmed` > reminder queued (if enabled) > day of visit: S-41 check in > `checked_in` > practitioner starts > `in_progress` > complete > prompt checkout. U: overlapping slot; cancelled/no-show transitions only along the graph (BR in `docs/baseline/actions.md` section 6); two staff change the same appointment (X-10); timezone midnight edge (X-08).

**W-05 Clinical note (SOAP).** S-44 notes tab > write > save (audit) > editable 24 h > after that amend with `amendsNoteId` > void with reason 5-300 chars. U: R-04 has no note tab; R-05 edits another's note refused.

**W-06 Dental chart and treatment plan.** S-44 dental tab (specialty = dental) > mark teeth/surfaces > plan items > accept > appointments from plan. U: non-dental clinic hides tab and refuses action.

**W-07 Checkout.** S-46 checkout from visit > lines (service, qty, price in centavos) > discounts (senior/PWD/saved, one rule set `invoice-totals.ts`) > receipt number assigned atomically (FR-055) > payments (cash/GCash/Maya/card, installments; HMO money arrives through claims, W-08) > S-47 receipt > print (FR-056). U: double submit (X-02); overpay refused; partial pay leaves balance; void by owner only with reason, payments kept (X-20); stock use with expired batch refused (FEFO).

**W-08 Insurance/HMO claim.** S-48 create claim from receipt > status `filed` > `pending`/`approved`/`denied`/`resubmitted`/`paid`/`withdrawn`. U: paid amount over invoice balance refused.

**W-09 Inventory.** S-49 add item, receive batch, use stock (FEFO), expiry flags; owner write-off of expired stock (FR-061). U: negative stock refused; archived item hidden not deleted.

**W-10 Recalls and reminders.** Daily job 09:00 Manila: appointment reminders for next day, recalls due, then subscription jobs (W-12). Email per patient, logged in `reminder_log`. U: patient has no email (skipped, shown); provider outage (X-05); job runs twice (idempotent).

**W-11 Patient portal.** Staff invites patient/guardian from S-44 > S-09 set password > S-78 read-only (appointments, receipts, balances; per clinic section). U: portal user linked in two clinics (X-18); portal user without linked patient redirected; invite for archived patient refused.

**W-12 Trial, payment, renewal, lock (state machine: SCHEMA section 3.3).** Trial day 15 passes unpaid > `masterlocked`, `lock_reason = trial_expired` > every clinic request shows S-70. Owner on S-34 picks tier + interval > Pay > PayMongo hosted checkout > returns to S-71 (shows pending until webhook confirms) > invoice `paid`, status `active`, lock cleared, email receipt. Renewal Mode A: 5 days before period end an open invoice + payment link is emailed; unpaid at due date: `past_due` banner; 3 days later: lock. U: abandon checkout (nothing changes); duplicate webhook; PayMongo down (X-04); payment during lock transition (X-09); downgrade with too many clinics refused; paid twice (period extends once per invoice, no overlap).

**W-13 Add clinic.** S-34 Add clinic (S-72) > shows used/allowed > if within tier: wizard for second clinic > else prompts upgrade to the next tier. U: at limit; R-04 cannot open S-72.

**W-14 Platform tenant control.** S-62 > open tenant S-62 detail > lock/unlock, change tier, extend trial, see invoices, AI usage, events > each change writes `platform_audit_logs` and `subscription_events` > S-68. Only R-01 changes; R-02 read. U: R-02 attempts change (refused, tested); lock of a tenant with open payment shows warning.

**W-15 Export and privacy request.** S-33 export CSV (uncapped, FR-101, logged) / S-38 log request (access, correction, erasure) > R-03 acts within 30 days > erasure = archive and restrict (PD-05). U: export rate limit; import preview then confirm (X-19).

**W-16 AI assistant.** S-21 ask > rules layer > Gemini > Claude > answer; writes are proposed, owner confirms (step-up for destructive). Monthly cap meter. U: provider outage (X-06); cap reached (message, rules still work); patient data switch off (refused).

**W-17 Forgot password.** S-04 email > generic message (no account enumeration) > link > S-05 new password > S-03. U: expired token state; reused token.

## 4. New and changed screens (full specification)

Every screen has five states: loading, empty, error, offline, no-permission. Where a cell says "shared" it uses the shared component from DESIGN_BRIEF section 4.

### S-34 Subscription (changed)
Purpose: see plan, pay, change tier, add clinic. Who: R-03 (others get S-74/403). Data: `subscriptions`, `subscription_invoices`, `subscription_events`, `clinics`, `PLAN_LIMITS`.
Elements: plan card (tier, price, interval, status chip, period end, clinics used of allowed, AI answers used of cap); primary button **Pay now** or **Renew** (state-dependent); **Change tier** (select tier and interval, shows what happens at which date); **Cancel plan** (confirm dialog; access continues to the period end) and, when canceled or on hold, **Resubscribe**; **Add clinic** (S-72); invoice table (number, issue date, due, amount, status, Pay link or receipt link); domain section (S-81); trial banner with days left.
| State | Behaviour |
|---|---|
| Loading | shared skeleton (card plus 5 table rows) |
| Empty | no invoices: "No invoices yet. Your first one appears when you choose a plan." |
| Error | "We could not load your plan. Try again." with retry; invoices failure does not hide the plan card |
| Offline | banner; Pay and Change tier disabled with reason |
| No permission | R-04/R-05: 403 view "Only the clinic owner can manage the subscription" |
Messages: pay start failure "We could not start the payment. Nothing was charged."; success arrives on S-71.

### S-71 Checkout return (new)
Reads `invoice` from query but trusts only the stored invoice of this account. Shows `pending` ("We are confirming your payment", auto-refresh every 3 s up to 60 s), `paid` (success, next period end, link to S-34), `open` after cancel ("Payment not completed. Nothing was charged. Try again"). Error and offline states shared. Wrong/other-account invoice id: S-73.

### S-70 Account locked (new)
Shown (when status is `masterlocked` or `canceled`) instead of any clinic page for R-03/R-04/R-05 (and portal S-78 shows the same message to R-06, data hidden). R-03 sees: reason (`trial_expired`, `payment_failed`, `admin`, or status `canceled` shown as "Plan canceled" with Resubscribe), amount due, **Pay now** (opens S-34 only for R-03), and "Your records are safe and will not be deleted." Others see "This clinic's subscription is on hold. Please ask your clinic owner." and Log out. Admin lock shows "Contact DataBridgeSol support" with the support email. Offline and error states shared. S-34, S-71, the checkout action and sign-out remain reachable while locked (lock-exempt routes, FR-014).

### S-72 Add clinic (new)
Dialog: shows "You use X of Y clinics." Fields clinic name, specialty, subdomain, timezone. Under limit: Create. At limit: "Your Tier N plan allows Y clinics. Upgrade to Tier N+1" button to S-34 change tier; Tier 4: "Contact us for more than 4 clinics". Errors inline. Focus returns to the trigger on close.

### S-62 Tenants (changed) and tenant detail
List: account, owner email, tier, status, period end, clinics, last payment, lock reason; filters by status; search by name/email. Detail: summary, clinics, invoices, events timeline, AI usage per clinic per month (FR-025), controls (R-01 only): Lock, Unlock, Change tier, Extend trial (days 1-30, reason required), Create tenant. Every control asks a confirm dialog with a reason and writes `platform_audit_logs`; opening a tenant detail also writes `tenant.view` (FR-024). A **Payment provider degraded** toggle (R-01 only) sets `platform_settings.paymongo_degraded_until` (X-04). Tab **Domain orders** (S-83): `needs_review` first, with Retry and Mark refunded. States: empty "No tenants yet."; R-02 sees controls absent and 403 on direct action.

### S-60 / S-63 / S-68 (changed to real)
S-60 KPI cards from real tables with "as of" time, no invented numbers, empty values show "0" or "-" never samples. S-63 invoice list with status filter, past-due list, last 20 webhook events (`subscription_events`), manual note column for refunds. S-68 table: time, actor, action, target tenant, summary; filters actor/action/tenant/date; cursor paging 50; no edit.

### S-38 Privacy requests (new)
List: patient, type (access, correction, erasure), received date, due date (+30 days), status (`open`, `done`, `declined`). Log new request dialog; resolve with note. Empty: "No privacy requests." Roles R-03 and R-04.

### S-75, S-76, S-77 Legal pages (new)
Static server pages with last-updated date, DPO name and email on S-76 (FR-111), reachable from every footer and from S-03 and S-07. Content text drafted by us and reviewed by counsel (OQ-03); placeholder text is not allowed to ship.

### S-73, S-74 (new)
S-73: "This page does not exist or you do not have access", link home by role. S-74: error with Try again and reference id (no stack, no data); 403 view for signed-in role mismatch where revealing existence is safe.

### S-23/S-44 additions
Vet clinics: patient header shows animal name, species, breed, and guardian(s) with contact; guardian required (FR-034). Tab **Privacy** lists requests for this patient. Opening the chart writes a view audit row (FR-103).

### S-47/S-28 additions
Print button (FR-056), receipt number never reused (FR-055), voided banner "Voided. Payments were kept. Refund separately."

## 5. Cross-screen rules

- Offline banner on every authenticated shell and on S-03, S-07, S-08, S-09, S-78 (FR-124).
- Every form: labels, errors beside the field, disabled while pending, input preserved on failure (X-01).
- Dates "d MMM yyyy", 12-hour time, clinic timezone; money PHP from centavos.
- Every list: empty state with next action; paging over 50 rows.
- Page `<title>` unique per screen; focus moves to heading on route change.
- Locked accounts: only S-70, S-34, sign-out, legal pages are reachable.

## 6. Email catalogue

One catalogue; FR-073, FR-115, SCHEMA J-03/J-04 and `docs/ops/live-check.md` cite these IDs. 18 templates (7 exist today, 11 are new). Every send goes through `sendEmail` and is logged (`email_log` or `reminder_log`). Dedupe: a lifecycle email is sent once per `subscription_events.dedupe_key`.

| ID | Trigger | To | Status | FR |
|---|---|---|---|---|
| EM-01 | sign-up: verify email | user | exists | FR-002 |
| EM-02 | password reset | user | exists | FR-003 |
| EM-03 | clinic staff invite | invitee | exists | FR-030 |
| EM-04 | platform team invite | invitee | exists | FR-020 |
| EM-05 | patient or guardian portal invite | patient | exists | FR-080 |
| EM-06 | appointment reminder (day before) | patient | exists | FR-070 |
| EM-07 | recall reminder | patient or guardian | exists | FR-071 |
| EM-08 | welcome and trial dates (after S-07) | owner | new | FR-073 |
| EM-09 | trial ends in 3 days | owner | new | FR-013, FR-073 |
| EM-10 | trial ends in 1 day | owner | new | FR-013, FR-073 |
| EM-11 | trial ended, account on hold | owner | new | FR-013, FR-073 |
| EM-12 | payment received (invoice paid, period dates) | owner | new | FR-004, FR-073 |
| EM-13 | renewal due in 5 days with payment link | owner | new | FR-005, FR-073 |
| EM-14 | renewal overdue (past due, full access) | owner | new | FR-005, FR-073 |
| EM-15 | account on hold for non-payment | owner | new | FR-005, FR-073 |
| EM-16 | account active again (paid or unlocked) | owner | new | FR-014, FR-073 |
| EM-17 | platform alert (job failure, webhook failure, needs-review) | R-01 | new | FR-114 |
| EM-18 | subscription canceled: access continues until the period end date | owner | new | FR-006, FR-073 |

## 7. Change log

| Date | Change |
|---|---|
| 2026-10-10 | First version |
| 2026-10-10 | Doc-review fixes: routes for S-35/S-36/S-38, specialty instead of vertical profile, code enumerations in W-04/W-07/W-08, lock-exempt routes, email catalogue EM-01..EM-17 |
