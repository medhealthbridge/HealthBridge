# PRD: DataBridgeSol / Clinix PH

Owns IDs: R (roles), M (modules), FR (features), NFR, X (failure modes), PD (permission decisions).
Source brief: `INTAKE.md` (I-01..I-17). As-built facts: `docs/baseline/*` (snapshot 2026-10-10; historical, this document wins).
Status tags: **BUILT** works in code today and is the test standard; **GAP** exists but is incomplete or wrong; **NEW** does not exist. Scope: **MVP** = required for the pilot launch; **Later** = after.
Priority: Must / Should / Could / Won't.

## 1. Purpose

**Problem.** Philippine clinics (dental, eye, skin, veterinary) run on paper and spreadsheets: queues, patient charts, receipts, stock, HMO claims and reminders live in different places, and owners cannot see the day at a glance.

**Product.** DataBridgeSol sells Clinix PH, a subscription clinic-operations app, to clinic owners. One account (owner) has 1-4 clinics (tiers) on subdomains; staff run the day; patients get a read-only portal.

**Success (first 90 days after pilot start).**
- 1-3 pilot clinics use it daily for queue, charting, checkout: at least 80 percent of their weekday visits have an appointment or walk-in row and a receipt.
- Zero cross-tenant data exposures (NFR-01) and zero lost or duplicated receipts.
- Trial-to-paid conversion path works end to end without founder intervention: 100 percent of renewals either collected or locked on schedule (FR-004, FR-005).
- Owner can answer "how did today go" from Overview in under 10 seconds.

## 2. Roles

| ID | Role | Notes |
|---|---|---|
| R-01 | Platform super admin | The founder. Full company admin; the only role that locks/unlocks tenants, changes tiers, manages AI keys. |
| R-02 | Platform staff | DataBridgeSol team. Reads tenants and billing; cannot manage tenants (PD-04). |
| R-03 | Clinic owner | One per account. Runs clinics, staff, settings, subscription. |
| R-04 | Assistant (front desk) | Patients, appointments, queue, checkout, claims, recalls; no clinical notes; cannot void receipts. |
| R-05 | Practitioner | Own schedule, clinical notes, dental tools; reads patients. |
| R-06 | Patient or guardian (portal user) | Read-only portal. For animal patients the portal user is the guardian. |
| R-07 | Visitor | Anonymous: marketing, legal pages, signup/login, invite links. |
| R-08 | System | Cron jobs, webhooks, background tasks. Acts with no user; every write still audited. |

## 3. Modules

| ID | Module | Owns | Needs | Turned on by |
|---|---|---|---|---|
| M-01 | Platform and subscription | accounts, clinics, subscriptions, plan limits, trial/renewal/Masterlock, domain purchase | M-12 (signup) | always |
| M-02 | Company admin | tenants, platform team, platform audit, AI keys, company KPIs | M-01 | R-01/R-02 |
| M-03 | Clinic core | staff, patients, guardians, custom fields, appointments, queue, clinic profile | M-01 | always |
| M-04 | Clinical | notes, dental chart, treatment plans, recalls | M-03 | always (dental tools: specialty = dental) |
| M-05 | Billing and checkout | services/prices, invoices, payments, installments, discounts, claims | M-03 | always |
| M-06 | Inventory | items, batches, stock use, expiry | M-01 | always |
| M-07 | Reminders and messages | appointment/recall reminders, owner lifecycle emails, email log | M-03, M-05 | clinic `reminders_enabled` (patient reminders); always (owner emails) |
| M-08 | Patient portal | portal invites, read-only records | M-03, M-05 | always |
| M-09 | AI assistant | rules/Gemini/Claude chat, confirm-first writes, usage caps | M-03..M-06 | account `ai_assistant_enabled` + platform patient-data switch |
| M-10 | Data and audit | import, export, activity log, privacy requests | M-03 | always |
| M-11 | Trust and compliance | legal pages, consent, security hardening, backups, monitoring | all | always |
| M-12 | Site, auth, onboarding | landing pages, signup/login, onboarding wizard, PWA | none | always |

Each module runs alone against its entities; cross-module links go through service functions, never direct table reads from another module's screens (existing rule: services in `src/server/services/`).

## 4. Features

### 4A. Baseline (BUILT): the test standard

Acceptance criteria here are the minimum Quality checks; deeper rules are in `docs/baseline/actions.md` section 6 (business rules, cite as BR-x there) and screens in `docs/baseline/screens.md` section 4.

**M-12 Site, auth, onboarding**
- **FR-001 Marketing sites** (Must, MVP; R-07). As a visitor I want to see what the product is. AC: Given `/` or `/clinix-ph`, When opened, Then the page renders without login. (Footer legal links fixed by FR-110.)
- **FR-002 Signup with email verification** (Must, MVP; R-07). As an owner I want an account so I can start a trial. AC: Given valid name/email/password, When I sign up, Then no session exists until I open the emailed link; Given an existing email, Then the response is identical (no enumeration); Given 6 signups from one IP in an hour, Then the 6th is refused.
- **FR-003 Login, logout, password reset, social sign-in** (Must, MVP; R-03..R-06). AC: Given wrong password or unknown email, Then the same message appears; Given a reset link, When used twice, Then the second use fails; Given Google keys unset, Then no Google button shows. (Session revocation on reset: FR-117.)
- **FR-015 Onboarding wizard** (Must, MVP; R-03). As an owner I want my clinic live in minutes. AC: Given a verified user with no clinic, When I finish the 6 steps, Then an account, one clinic, a subscription (`trialing`, tier_1, 15 days), a subdomain lookup and my owner membership exist; Given a taken subdomain, Then I get a field error and no partial workspace; Given a reserved word, Then it is refused.
- **FR-016 PWA and offline notice** (Must, MVP; all). AC: Given the network drops, When I navigate, Then `/offline.html` shows and no patient page is stored in Cache Storage; Given I am in the console, Then a banner says nothing can be saved. (Banner on auth/portal pages: FR-124.)

**M-03 Clinic core**
- **FR-030 Staff invites and roles** (Must, MVP; R-03). AC: Given I invite an email as practitioner, Then only a hash of the token is stored and the link expires in 7 days; Given a used or revoked link, Then acceptance fails; Given I try to change or deactivate an owner or myself, Then it is refused. Owner role cannot be invited.
- **FR-031 Patients** (Must, MVP; R-03,R-04 CRUD+archive; R-05 read). AC: Given a new patient with consent ticked, Then an MRN `MRN-00001` style is assigned and `data_privacy_consent_at` is set; Given archive, Then the row is kept (`deleted_at`) and hidden from lists and booking; Given consent unticked, Then save is refused.
- **FR-032 Custom patient fields** (Should, MVP; R-03 manage, R-05 own add-ons). AC: Given a medical field, Then R-04 and the portal never receive its value; Given 41 active fields, Then creation is refused; Given a type change that does not fit stored answers, Then it is refused.
- **FR-035 Appointments** (Must, MVP; R-03,R-04 manage; R-05 own status). AC: Given a booking in the past (more than 5 min ago), Then refused; Given a practitioner already booked in an overlapping slot, Then refused; Given status moves outside the allowed graph (requested>confirmed>checked_in>in_progress>completed, with cancel/no-show), Then refused.
- **FR-036 Walk-in queue** (Must, MVP; R-03,R-04, any staff by action). AC: Given a walk-in, Then status is `checked_in` and `queue_number` is the day's max plus 1 in clinic-local time.

**M-04 Clinical**
- **FR-040 Clinical notes (SOAP)** (Must, MVP; R-05 write; R-03 see PD-01). AC: Given my note under 24 h old, Then I can edit it; Given 24 h or more, Then only a new note with `amendsNoteId` is possible; Given void, Then reason of 5-300 chars is required and the row is kept.
- **FR-041 Dental tooth chart** (Should, MVP for dental; R-03,R-05). AC: Given an entry, Then it is append-only; Given a mistake, Then it is voided with a reason, never edited.
- **FR-042 Treatment plans** (Should, MVP for dental; R-03,R-05 write; R-04 propose/accept). AC: Given a plan with `done` items, Then it cannot be cancelled; Given an item marked done with tooth and code, Then a chart entry is created in the same transaction; Given a receipt is voided, Then billed items become billable again.
- **FR-043 Recalls** (Should, MVP; R-03,R-04,R-05). AC: Given months 1-24, Then due date is that many months from clinic-local today; Given closed or cancelled, Then it cannot be reopened.

**M-05 Billing and checkout**
- **FR-050 Checkout** (Must, MVP; R-03,R-04). AC: Given a senior or PWD discount, Then totals follow BR-money (VAT backed out first, then 20 percent of the base; VAT-exempt lines get 20 percent of gross); Given prices posted in the form, Then they are ignored and read from the price list; Given pay-now greater than total, Then refused.
- **FR-051 Payments, pay later, installments** (Must, MVP; R-03,R-04). AC: Given a balance, Then installments split equally with the remainder on the last; Given a payment over the balance, Then refused; Given non-cash, Then a reference of 4 or more characters is required.
- **FR-052 Void receipt** (Must, MVP; R-03 only). AC: Given a reason of 5 or more characters, Then status is `void`, number retained, billed plan items released; Given R-04, Then the control is absent and the server refuses.
- **FR-053 Saved discounts** (Could, MVP; R-03). AC: Given a percent over 100 or a non-integer, Then refused.
- **FR-057 Services and price list** (Must, MVP; R-03 CRUD+restore, R-04 read at checkout and booking, R-05 read in plan picker). AC: Given a service with name, price in centavos >= 0, duration minutes, VAT-exempt flag, When saved, Then it is audited and used by checkout and booking; Given archived, Then hidden from pickers and kept on old receipts; Given a price change, Then past receipts are unchanged (prices copied to lines).
- **FR-054 Claims (HMO/PhilHealth)** (Should, MVP; R-03,R-04). AC: Given status `paid` or `withdrawn`, Then the claim is locked; Given `withdrawn`, Then only R-03 may set it; Given a receipt number from another clinic, Then refused.

**M-06 Inventory**
- **FR-060 Items, batches, stock use** (Should, MVP; R-03 manage; R-04,R-05 use). AC: Given consume of N, Then batches are taken first-expiring-first-out, expired batches are skipped, and if stock is short nothing changes; Given a duplicate active SKU, Then refused.

**M-07 Reminders**
- **FR-070 Daily appointment reminders** (Should, MVP; R-08). AC: Given `reminders_enabled`, Then each `requested|confirmed` appointment starting tomorrow (clinic time) with a patient email gets one email; Given an already `sent` row, Then none is sent. (Race fix: FR-117.)
- **FR-071 Recall reminder emails** (Could, MVP; R-03,R-04,R-08). AC: Given a pending recall due within 7 days, Then the daily job emails once and marks `notified`.

**M-08 Patient portal**
- **FR-080 Invite and read-only portal** (Should, MVP; R-03,R-04 invite; R-06). AC: Given a valid link, When the patient sets a password, Then `portal_user_id` is linked once; Given a linked patient, Then the portal shows only that patient's non-medical fields, visits and receipt totals and has no write control.

**M-09 AI assistant**
- **FR-090 Assistant chat** (Could, MVP; R-03 clinic, R-01/R-02 admin). AC: Given a simple question, Then the rules layer answers with no model call; Given Gemini fails, Then Claude is tried; Given both fail, Then 502 "unavailable".
- **FR-091 Confirm-first writes with step-up** (Could, MVP). AC: Given a proposed change, Then nothing is written until the same user confirms within the TTL; Given archive, Then password plus typed MRN is required each time.
- **FR-093 Patient-data gating** (Must if AI on). AC: Given `allow_patient_data_ai` off or account not granted, Then clinic assistant returns 403.

**M-10 Data**
- **FR-100 Patient CSV import** (Could, MVP; R-03). AC: Given more than 500 rows or 1 MB, Then refused; Given preview, Then nothing is written.
- **FR-105 Owner Overview** (Must, MVP; R-03). AC: Given the Overview, Then it shows revenue today, queue/booked, stock alerts, payments today, today's appointments with status, collections by method (30 days), stock needing attention, no-show rate, new patients and collected (30 days), all from real data in clinic time, with an "as of" time; Given no data, Then the empty messages in `docs/baseline/screens.md` section 4.6 show; no number is invented.
- **FR-102 Activity log** (Should, MVP; R-03). AC: Given any audited write, Then the owner sees it with filter by type.

**M-01 Platform**
- **FR-010 Subdomain routing** (Must, MVP). AC: Given `<slug>.databridgesol.space`, Then `/` shows that clinic's console; Given a staff member of another clinic opens it, Then 404.
- **FR-011 Custom domain with session handoff** (Could, MVP). AC: Given a sold domain, Then a one-time token (1 min) creates a host-only session.
- **FR-020 Platform team and login** (Must, MVP; R-01 manage). AC: Given a non-platform user on `/admin-login`, Then the session is signed out and the generic error shown.
- **FR-021 Tenants list and create** (Must, MVP; PD-04: R-01 only). AC: Given a new tenant, Then account, subscription, clinic, owner (no password) are created, an owner setup email sent, and an audit row written.

### 4B. Gaps and new features (full specification)

Each block: story, priority/scope, roles, Given/When/Then, rules and limits, edge cases.

**FR-004 Plan checkout (first payment without a domain)**. NEW, Must, MVP. R-03.
- Story: As an owner I want to pay for my plan from the Subscription page so my account stays active after the trial.
- G/W/T: (1) Given a trialing, past_due, canceled or masterlocked (`trial_expired`, `payment_failed`) account, When I choose a tier and billing interval and press Pay, Then I am sent to a PayMongo hosted checkout for that tier's price and a `subscription_invoices` row (`open`) exists. (2) Given PayMongo confirms payment (webhook then provider re-read), Then the invoice is `paid`, subscription is `active`, `current_period_ends_at` is paid-through date, `lock_reason` is cleared if it was `trial_expired` or `payment_failed`, a `subscription_events` row is written. (3) Given I abandon checkout, Then nothing changes and the invoice expires after 24 h with no charge. (4) Given a duplicate webhook, Then state and invoice count are unchanged.
- Rules: amounts in centavos from `PLAN_LIMITS` (FR-012), never from the browser; return URLs derived from config, not from `Host`. Plan money is collected only through `subscription_invoices`; a domain order never carries plan money and never changes the subscription (FR-009, task K-111).
- Edge: user pays twice (two invoices) then the later period extends from the current period end, never overlaps.

**FR-014 Masterlock enforcement**. GAP, Must, MVP. R-03,R-04,R-05,R-06,R-08.
- Story: As the company I want accounts that do not pay to be locked, with data kept, so unpaid use stops and payers are safe.
- G/W/T: (1) Given `subscriptions.status = masterlocked`, When any staff opens any clinic page, action or API route (including the AI endpoints), Then the request is refused and S-70 shows: owner sees plan, amount due and Pay; others see "Ask your clinic owner". (2) Given a locked account, When a patient opens the portal, Then a neutral "unavailable" page shows with no clinic data. (3) Given a locked account, When the owner tries to create a clinic (FR-007), Then refused. (4) Given payment confirmed, Then the lock lifts and every record is exactly as left. (5) Given R-01/R-02, Then admin pages still work for that tenant. (6) Given cron or webhooks, Then they still run (reminders skip locked accounts).
- Rules: the check lives in one function used by `requireActiveClinic`, `requireWorkspace`, `getAgentClinic`, portal loaders and the cron; data is never deleted or edited by locking; `lock_reason` (only while status is `masterlocked`) is one of `trial_expired | payment_failed | admin`; `admin` locks lift only by R-01. Status `canceled` is treated like a lock: S-70 shows "Plan canceled" with Resubscribe. State transitions are defined once in `docs/SCHEMA.md` section 3.3.
- Lock-exempt routes (DR-08): a locked R-03 can still open S-34 and S-71, run `startCheckoutAction` (A-01), `resubscribeAction`/`cancelSubscriptionAction` (A-13) and sign out; legal pages, `/api/health` and `/api/webhooks/*` are never locked. They use `requireWorkspace({ allowLocked: true })`; every other owner and staff route is refused. Test T-027, T-075.
- Edge: lock occurs while a user is mid-form: the next request is refused, the form shows S-70, nothing is half-saved (each action is one transaction). Payment arrives during lock transition: guarded status update, payment wins.

**FR-013 Trial lifecycle**. NEW, Must, MVP. R-08, R-03.
- G/W/T: (1) Given a trialing account 3 days before `trial_ends_at`, When the daily job runs, Then the owner gets the trial-ending email (EM-09, APP_FLOW section 6), and again at 1 day (EM-10). (2) Given `trial_ends_at` has passed and no paid invoice, When the daily job runs, Then status becomes `masterlocked` with `lock_reason = trial_expired` and a `subscription_events` row is written. (3) Given the job runs twice, Then the second run changes nothing. (4) Given the platform admin extends a trial, Then the new date is audited (FR-008).
- Rules: trial = 15 days, no card. Job runs daily at 09:00 Asia/Manila with the existing reminders cron (extended, FR-070).

**FR-005 Renewals**. NEW, Must, MVP. R-03, R-08.
- Mode A (Must): renewal invoice + payment link. Given an `active` account 5 days before `current_period_ends_at`, When the daily job runs, Then a `subscription_invoices` row (`open`, due on the period end) is created and the owner is emailed a PayMongo payment link accepting any method PayMongo offers (GCash, Maya, card). Given payment, Then the period extends 1 interval. Given the due date passes unpaid, Then status becomes `past_due` (full access plus a banner); given 3 more days pass unpaid, Then `masterlocked` with `lock_reason = payment_failed`.
- Mode B (Should, depends on OQ-02): PayMongo Subscriptions auto-charge for cards and Maya. Given an owner saves a card or Maya, Then PayMongo charges each cycle; Given a failed charge, Then `past_due` immediately; Given PayMongo reports the subscription `unpaid`, Then `masterlocked`. PayMongo facts (docs.paymongo.com): cards (Visa/Mastercard) and Maya only; Subscriptions must be enabled by PayMongo support before live use; first payment must complete within 24 h; failed renewals retry once a day up to 3 times; plan changes apply from the next cycle; changing the card needs re-authentication. GCash recurring is not documented: GCash owners use Mode A.
- Rules: both modes write the same tables and states; the webhook handler is idempotent with a guarded update and re-reads the payment from the provider; in Mode B the grace is the provider retry window only; in Mode A it is the 3 days defined above.
- Edge: webhook arrives before checkout return page: state is already correct; PayMongo outage on our side: no state change, no lock (X-04).

**FR-006 Owner subscription management**. GAP, Must (view, pay, change tier) / Should (change card, cancel), MVP. R-03.
- G/W/T: (1) Given S-34, Then I see tier, status, period end, clinics used of allowed, and a real invoice history (paid/open/void, amounts, dates, receipt link). (2) Given I choose a higher tier on a monthly plan, Then it applies immediately when I pay the difference as a new `upgrade` invoice: difference = round((new monthly price - old monthly price) x remaining days / days in the current period), at least 0, period end unchanged (vectors T-070, T-071). Given a downgrade or an annual plan change, Then it applies at the next cycle. (3) Given I choose a tier with fewer slots than my clinics, Then refused with the number to remove. (4) Given I cancel, Then `cancel_at_period_end` is set, access continues to the period end, then status `canceled` (S-70 "Plan canceled"); data kept; I can resubscribe by paying and return to `active` (T-072).
- Rules: only R-03 sees billing controls; R-04/R-05 never see amounts.

**FR-007 Tier slot limit and add clinic**. GAP, Should, MVP. R-03.
- G/W/T: (1) Given tier N and N clinics, When I press Add clinic, Then refused with an upgrade prompt. (2) Given room, When I add a clinic with name, specialty, subdomain (same reserved-name and taken-name rules as FR-015), timezone, Then it is created under my account and I can switch to it. (3) Given a locked account, Then creation is refused.
- Rules: slots from `clinic_slot_limit` (set from `PLAN_LIMITS` on every tier change); each clinic has its own staff memberships and data; enterprise (5+) is quote only: no self-serve.

**FR-008 Admin tenant controls**. GAP, Must, MVP. R-01.
- G/W/T: Given the Tenants drawer, When R-01 locks, unlocks, extends a trial by N days, changes tier, or grants AI, Then the action runs with a required reason (5-300 chars), a `subscription_events` row and a `platform_audit_logs` row are written, and R-02 sees the controls disabled.

**FR-009 Domain purchase hardening**. GAP, Should, MVP. R-03,R-08.
- G/W/T: (1) Given `pending_payment` older than 24 h, When the daily job runs, Then it becomes `expired` and frees the domain name. (2) Given `paid` or `purchasing` older than 30 min, Then it moves to `needs_review` and appears on S-83 for R-01. (3) Given a paid order for a locked account, Then the domain is attached but the lock is not lifted by this payment alone (a domain order never changes the subscription or the lock). (4) Given a domain checkout, Then it acts on the clinic of the current host and session, never on the first clinic of the account.

**FR-012 Plan limits catalogue**. NEW, Must, MVP. R-08.
- Single source `src/lib/plans.ts`: per tier: monthly price centavos (annual price = 12 x monthly less a discount set in OQ-04), clinic slots (1..4), monthly AI answer cap (OQ-05 default 300 for all tiers until set), enterprise = no self-serve. Prices in code today (TIER_MRR 1490/2690/3690/4590) are the starting values.

**FR-022 Admin Overview (real)**. GAP, Must, MVP. R-01,R-02. Given S-60, Then KPIs come from `subscriptions`, `subscription_invoices`, `clinics`: MRR (sum of active tier prices), active, trialing, trials ending in 7 days, past_due, masterlocked, new this month, churned this month. MRR for annual accounts is annual price / 12. Fictional data, hard-coded date, fake bell and badges are removed.

**FR-023 Admin Billing (real)**. GAP, Must, MVP. R-01,R-02. Given S-63, Then I see subscription invoices (filter by status), past-due list, last webhook events, refunds noted manually; no charge/refund buttons in MVP (refunds are done in the PayMongo dashboard and noted by R-01).

**FR-024 Platform audit log (real)**. NEW, Must, MVP. R-01,R-02 read. Every platform write (tenant create, lock, tier, trial extend, AI keys, settings, team invite/deactivate, impersonation if ever added) writes `platform_audit_logs` in the same transaction. S-68 lists, filters by actor/action/tenant; no edits. Opening a tenant detail (S-62) writes a `platform_audit_logs` row `tenant.view` (once per user per tenant per 10 minutes), because platform reads of tenant data must be audited (INTAKE role rule).

**FR-025 AI usage per clinic for admin**. GAP, Must, MVP. R-01,R-02. See FR-092.

**FR-026 Remove fictional screens and chrome**. GAP, Must, MVP. Given Modules, Support, Feedback (company and owner), Then they are removed from navigation and routes return 404 until built; no screen shows invented numbers, notifications or badge counts. "Notify me" stubs removed from the landing page.

**FR-033 Vertical profiles**. GAP, Must, MVP. R-03..R-05.
- Story: As a vet, eye or skin clinic I want screens that fit my work so the app does not look like a dental tool.
- G/W/T: (1) Given `specialty != dental`, Then the tooth chart, treatment-plan panel and their API actions are absent and refused. (2) Given specialty vet, Then labels say "Patient" (with the animal name and species) and "Guardian", and species fields appear (FR-034). (3) Given each specialty, Then onboarding and Settings offer that specialty's suggested custom fields (existing suggestions, reviewed by the owner). (4) Given dental, Then nothing changes.
- Rules: a clinic has exactly one specialty (`clinics.specialty`, values dental, vet, eye, derma; the UI label for derma is "Skin"); there is no separate vertical column; `general` is not offered (D-27).

**FR-034 Veterinary patient with guardian**. NEW, Must, MVP. R-03,R-04,R-05.
- Story: As a vet clinic I want each pet linked to its owner so billing, reminders and the portal go to the person.
- G/W/T: (1) Given specialty vet, When I add a pet, Then I enter pet fields (name, species, breed, sex, birth date or age, weight optional) and choose or create a guardian (name, mobile, email, address, consent). (2) Given a guardian with 2 pets, Then both show under the guardian and a receipt shows "Billed to <guardian>". (3) Given reminders and recalls, Then emails go to the guardian email. (4) Given the portal invite, Then the guardian is linked and sees all their pets at that clinic. (5) Given archive of a guardian with active pets, Then refused.
- Rules: `patients.patient_kind = 'animal'` requires at least one primary guardian link (E-48 `patient_guardians`); human patients have none; one guardian (E-44) can be linked to many animals; consent (RA 10173, `consent_at`) and address are recorded on the guardian; the guardian's portal link is `guardians.portal_user_id`; the existing columns `species_breed` and `guardian_or_owner_name` are migrated into `species`/`breed` and a guardian row (MG-04) and then ignored; senior/PWD discounts apply only to human patients. Portal access for guardians needs its own read policy (SCHEMA section 4).

**FR-037 Clinic profile edit**. GAP, Must, MVP. R-03. Given S-36 Clinic profile, When I edit name, address, phone, business hours, timezone (Asia/Manila default, IANA list), Then it saves, is audited, and clinic-local dates use the new zone from the next request. Subdomain is not editable. Applying brand colors/logo to screens: Could, Later; until then onboarding says branding appears on patient emails and portal later (copy change).

**FR-043b Vet recalls**. NEW, Should, MVP. Given vet clinic, Then recall type choices include `vaccine_due` and `follow_up`; dental keeps `dental_recall` and `post_procedure_checkin` (values as built, SCHEMA section 3.3).

**FR-055 Receipt number integrity**. GAP, Must, MVP. Given two concurrent checkouts, Then numbers are unique per clinic and consecutive (as built: count plus advisory lock; add a database test T-057); add a unique index on `payments (clinic_id, receipt_number)` where not null. Given the checkout button is pressed twice, Then one invoice exists (idempotency key, FR-117).

**FR-056 Receipt print/PDF**. NEW, Should, MVP. Given S-28, When R-03/R-04 press Print, Then a clean print layout (clinic name, address, TIN field in clinic profile, OR number, lines, VAT breakdown, discount, payments) prints from the browser; PDF is browser "Save as PDF". (Official BIR receipt authority is the clinic's responsibility; app is a ledger; stated in Terms.)

**FR-061 Write-off expired stock UI**. GAP, Should, MVP. R-03. Button on Inventory calls the existing action with confirm dialog.

**FR-072 Visible email failures**. GAP, Should, MVP. Given a verification or reset email fails to send, Then the user sees "We could not send the email, try again" and `email_log` records it; R-01 can see failures per day on S-60.

**FR-073 Owner lifecycle emails**. NEW, Must, MVP. R-08. Emails to the owner are exactly the lifecycle rows of the email catalogue (APP_FLOW section 6, EM-08..EM-16 and EM-18). Each is sent once per event (dedupe key on `subscription_events`), logged in `email_log`.

**FR-092 AI monthly cap, meter, admin usage**. GAP, Must, MVP (if AI is on for any pilot clinic; else Should). R-03,R-01.
- G/W/T: (1) Given a clinic with cap N, When the (N+1)th AI-layer answer in the Manila calendar month is requested, Then it is refused with a message and the rules layer still works. (2) Given the clinic assistant page, Then it shows "X of N AI answers this month" and resets on the 1st. (3) Given S-62, Then R-01/R-02 see per-clinic usage (answers, tokens, estimated cost) for the month. (4) Given concurrent requests at N-1, Then at most one more succeeds (guarded update on the counter row `clinic_ai_usage`, E-49, `UPDATE ... SET answers = answers + 1 WHERE answers < cap RETURNING`).
- Rules: counts AI-layer answers only; rule answers are free and unlimited; cap per tier from `PLAN_LIMITS` with R-01 override per account; usage rows carry `account_id`.

**FR-101 Exports uncapped**. GAP, Must, MVP. Given a clinic with more than 200 patients, When R-03 exports patients, Then every non-archived patient is included (streamed in pages); the list screens keep paging.

**FR-103 Record-view audit**. GAP, Should, MVP. Opening a patient chart, a receipt, a claim, or a clinical-notes list writes `audit_logs` action `view` (once per user per record per 10 minutes). List pages do not.

**FR-104 Privacy requests**. NEW, Should, MVP. R-03,R-04. On the patient or guardian chart, "Privacy request": type (access, correction, erasure), the same list as E-45 and S-38, received date, handled by, outcome note, due date (30 days default, confirm with counsel). Access = export of that patient's data as PDF/CSV; erasure is never a hard delete of clinical or financial rows: record is archived and restricted, with outcome stated (PD-05). Audited.

**FR-110 Legal pages and consent**. GAP, Must, MVP. R-07. S-75 Terms, S-76 Privacy Policy, S-77 Data Processing Notice are reachable from every footer and from signup (checkbox "I agree to the Terms and Privacy Policy" required). Patient consent text at registration links the clinic's notice. Content is drafted by us and must be reviewed by counsel before launch (OQ-03).

**FR-111 DPO and NPC registration**. NEW, Must, MVP (operational). A named DPO and official email are published on S-76; NPC registration status of DataBridgeSol's processing systems is decided with counsel (NPC Circular 2022-04 requires registration when sensitive personal information of 1,000 or more individuals is processed or risk is likely; confirm per counsel) and recorded in `docs/ops/compliance.md`.

**FR-112 RLS enforced in production**. GAP, Must, MVP. Given the deployed `DATABASE_URL`, Then it uses role `clinix_app` (NOBYPASSRLS); a DB-backed test suite proves tenant A cannot read or write tenant B rows on every table with RLS = Y in `docs/SCHEMA.md` section 2 (the list is generated, not counted); `audit_logs` cannot be updated or deleted by the app role (grant plus trigger, FR-118).

**FR-113 Backups**. GAP, Must, MVP. Neon point-in-time restore window confirmed in writing (value recorded in `docs/ops/runbook.md`); one restore drill into a new branch executed and timed; result recorded (RPO/RTO in NFR-04).

**FR-114 Monitoring and alerts**. GAP, Must, MVP. Error tracking on client and server (vendor per OQ-07, no personal data in events), uptime check on `/` and a health route, alert to R-01 on cron failure, webhook failures, and masterlock job failure.

**FR-115 Live verification**. GAP, Must, MVP. Checklist executed and recorded in `docs/ops/live-check.md`: Resend delivery for every template in the email catalogue (APP_FLOW section 6), PayMongo test payment end to end incl. webhook, Gemini and Claude keys, Vercel domain flow (or domain feature switched off), cron with real `CRON_SECRET`, Singapore function region.

**FR-116 Error and permission screens**. GAP, Must, MVP. `error.tsx`, `global-error.tsx`, `not-found.tsx` and a 403 "You do not have access" screen exist and show a retry/home action and a reference id; no stack traces.

**FR-117 Security hardening list**. GAP, Must, MVP. Each is a separate acceptance: (a) password reset revokes all other sessions; (b) step-up limiter counts failures only; (c) reminder claim cannot double-send under concurrency; (d) checkout, record-payment and booking accept an idempotency key; (e) client-supplied ids (practitioner, appointment, amends-note, claim patient/invoice) are validated with clean errors, not 500s; (f) sensitive UI actions (void receipt, archive patient, withdraw claim, change role/deactivate staff) require password re-entry (reuse step-up); (g) `X-Forwarded-For` use limited to the platform's trusted header; (h) senior/PWD ID number must match the patient's stored OSCA/PWD ID or be recorded on the patient first; (i) CSP tightened (nonce) where feasible, otherwise risk accepted in writing; (j) the session cookie is not usable by sibling apps on `.databridgesol.space`: the sibling app `nlminventory` moves to another registrable domain or at least uses its own cookie name and secret, otherwise the risk is accepted in writing; (k) domain checkout is bound to the clinic of the current host (see FR-009); (l) onboarding (clinic creation), login of platform users and owner role changes write audit rows; (m) platform-admin MFA is recorded as an accepted risk for the pilot (OQ-12).

**FR-118 Database constraints and audit immutability**. GAP, Should, MVP. CHECKs: money columns >= 0, `ends_at > starts_at`, quantities >= 0, `from_clinic_id <> to_clinic_id`, status/type lists as CHECK or enum; missing FKs added for the four plain-uuid columns; trigger denies UPDATE/DELETE on `audit_logs`, `subscription_events` and `platform_audit_logs`.

**FR-119 Dead code and unused items**. GAP, Should, MVP. Remove unused dependencies (`drizzle-zod`, `@neon/env`), unused tables or mark Later (`inventory_transfers`, `patient_attachments`), unused mock exports, `posTotals()` (after moving `VAT_RATE` and `STATUTORY_DISCOUNT_RATE` into `invoice-totals.ts`, because it imports them from `pos-totals.ts`), unused `stripe_*` columns (renamed in FR-004), `src/lib/schemas/patient.ts`; add `.env.example` entries (`CLINIC_SUBDOMAINS`, `SUPER_ADMIN_*`, `DEMO_PASSWORD`, new keys).

**FR-124 Offline notice everywhere**. GAP, Should, MVP. The offline banner also shows on auth, onboarding, join and portal pages.

**FR-080b Portal fixes**. GAP, Must, MVP. A signed-in portal user who opens `/clinix-ph/admin` or `/clinix-ph/auth` goes to `/clinix-ph/portal`, not onboarding. Auth page copy no longer promises booking.

**FR-038 Global search in the command palette (patients, records)**. NEW, Could, Later. The palette lists menu items only in this release.

**FR-137 Clinic ownership transfer**. NEW, Won't (this release). Handled by the runbook (X-13).

**FR-138 Clinic archive by owner**. NEW, Won't (this release). Clinics are never archived by the app; R-01 locks instead.

**FR-130 Branding application**. NEW, Could, Later. Apply primary color and logo to patient emails, portal header and receipts.

**FR-131 Receipt send by email**. NEW, Could, Later.

**FR-132 SMS/Viber reminders**. NEW, Won't (this release); email only (I-10).

**FR-133 Patient writes in portal (book, edit)**. Won't (I-15).

**FR-134 Dedicated eye/skin/vet tools** (prescription, body map and photos, vaccine card). Won't (this release); shared tools plus custom fields (I-05). Skin photo upload is an open question (OQ-10).

**FR-135 Offline record saving and sync**. Won't (I-11).

**FR-136 Inter-branch inventory transfer**. Won't (table unused; RA-sensitive stock movements deferred).

## 5. Permission decisions (PD)

Target permissions are in `docs/SCHEMA.md` section 5. Where code today differs from `docs/real-data-roadmap.md` section 2, the decision is:

| ID | Difference | Decision | Reason |
|---|---|---|---|
| PD-01 | Owner can write clinical notes (roadmap: read only) | **Open (OQ-01).** Default until answered: keep code (owner may write own notes) and update the roadmap | Many owners are the dentist; read-only would block them |
| PD-02 | Practitioner creates walk-ins and assigns other practitioners | Keep; document | Needed when front desk is absent |
| PD-03 | Practitioner writes custom-field values (incl. medical) on any clinic patient | Keep, but audit field changes (exists) | Practitioners see all clinic patients |
| PD-04 | Platform staff can create tenants | **Change:** only R-01 | Creating accounts/owners is a trust action |
| PD-05 | Patient erasure request vs clinical records | Archive and restrict; never hard-delete clinical/financial rows; state in Privacy Policy | Records retention; counsel to confirm (OQ-08) |
| PD-06 | Practitioner has no invoice view; no contact edit for own patients | Later (Could): read-only receipts tab on own patients | Not needed for pilot |
| PD-07 | Patient sees no notes summary | Later | Read-only portal minimal for pilot |
| PD-08 | "Every patient-record view is audited" | Narrowed to record opens (FR-103) | List views are noise |
| PD-09 | Patient invite by OTP (roadmap) | **Change roadmap:** emailed single-use link plus password is the standard | Built, tested, simpler |
| PD-11 | Practitioner reads all clinic patients (INTAKE says "own records only") | Keep code; document | Front desk and cover shifts need it; edits stay limited |
| PD-12 | Practitioner can cancel treatment plans and items | Keep; document | Built; audited |
| PD-10 | Senior/PWD maths in `pos-totals.ts` | `invoice-totals.ts` is canonical; move the two rate constants into it, then delete `pos-totals.ts` | Dead code; `invoice-totals.ts` imports the constants from it today |

## 6. Subscriptions and billing

- **Plans.** Tier 1-4 = 1-4 clinics (D-12); price per tier in `PLAN_LIMITS` (starting values PHP 1,490 / 2,690 / 3,690 / 4,590 per month, OQ-04); 5+ clinics = Enterprise by quote, assigned by R-01. Monthly or annual interval.
- **Entitlements.** Clinic slots; monthly AI answer cap; AI on/off per account; modules are not separately priced in this release.
- **Trial.** 15 days, no card, tier_1 unless R-01 creates the tenant at another tier.
- **States.** `trialing`, `active`, `past_due`, `masterlocked`, `canceled`; transitions are defined once in `docs/SCHEMA.md` section 3.3. `lock_reason` records why.
- **Metering.** AI answers per clinic per Manila month (FR-092). No other metered items.
- **Upgrade/downgrade.** Upgrade takes effect on payment of the difference (Mode A) or next cycle (Mode B); downgrade next cycle and only if clinics fit.
- **Suspension/reactivation.** FR-014; data never deleted.
- **What R-01 sees per tenant.** Tier, status, period end, clinics used, AI usage, last payment, lock reason, events timeline.
- **Where money flows.** Subscriptions via PayMongo (D-10); clinic-to-patient payments are a manual ledger only (cash/GCash/Maya/card entered by staff), no gateway in this release.

## 7. Cross-cutting

- **Notifications.** Email only: owner lifecycle (FR-073), staff/patient/platform invites, password/verification, patient reminders and recalls. All sent through one `sendEmail` function that logs to `email_log` or `reminder_log`.
- **Files.** None in this release (no uploads). `patient_attachments` unused.
- **Search.** Patients page search by name, MRN, mobile; booking typeahead; command palette lists menu items only (FR-038 Could, Later).
- **Reports.** Owner Overview KPIs (real), Activity log, CSV exports (patients, receipts, inventory, claims).
- **Settings.** Platform: AI keys, patient-data switch. Tenant: profile (FR-037), patient fields, discounts, reminders toggle. User: password reset only.
- **Audit.** `audit_logs` (clinic writes, same transaction), `platform_audit_logs` (platform writes), `subscription_events` (account lifecycle).
- **Timezone and locale.** Stored UTC; clinic timezone default Asia/Manila; English only; PHP; dates shown "d MMM yyyy", times 12-hour with am/pm in clinic time.
- **Offline.** Read nothing, save nothing offline (I-11, RA 10173): notice plus preserved form input; the service worker caches only static assets and the offline page.

## 8. Flexibility points

Configurable without code: patient custom fields per clinic; saved discounts; reminders toggle; staff roles among three; AI access per account; tier and limits per account (R-01); platform AI keys. Plugs for new modules: module list in M table, new entitlement in `PLAN_LIMITS`, new nav entries by role in `src/lib/clinic-app-nav.ts`.

## 9. Non-functional requirements

| ID | Requirement | Measure |
|---|---|---|
| NFR-01 | Tenant isolation | 0 successful cross-tenant reads/writes in the isolation suite (every RLS table in SCHEMA section 2 x read/list/update/delete, by id, URL, search, export, file/link); app runs as `clinix_app` |
| NFR-02 | Responsiveness | Server render p95 <= 800 ms for list and chart pages and server actions <= 600 ms at pilot load (<= 20 concurrent users), region sin1 |
| NFR-03 | Web vitals (mid-range Android, 4G) | LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 on Today, Patients, Checkout |
| NFR-04 | Recovery | RPO <= 15 minutes (Neon PITR), RTO <= 4 hours; restore drill passed before launch and quarterly |
| NFR-05 | Availability | >= 99.5 percent monthly on `/` and clinic app routes (uptime check) |
| NFR-06 | Security | 0 High or Critical findings in production dependency audit at launch; all headers in `next.config.ts` present; no secret in repo or logs |
| NFR-07 | Privacy | No patient data in service-worker cache, logs, error events or analytics; AI sends patient names only when both switches are on |
| NFR-08 | Auditability | 100 percent of clinical and financial writes have an audit row in the same transaction (test per action) |
| NFR-09 | Money correctness | Every total matches the worked vectors in `docs/IMPLEMENTATION_PLAN.md` T-050..T-056 to the centavo; integer centavos only |
| NFR-10 | Accessibility | WCAG 2.2 AA; contrast >= 4.5:1 text, 3:1 UI; 44 px touch targets; keyboard and visible focus on every control |
| NFR-11 | Job capacity | Daily cron finishes in <= 300 s for 50 clinics; failures alert within 15 minutes |
| NFR-12 | Test coverage gate | Every service function with a write has a DB-backed test; every permission-matrix cell has an allow or deny test; e2e covers W-01, W-04, W-05, W-12, W-13 |
| NFR-13 | Browsers | Latest 2 versions of Chrome, Edge, Safari (iOS 16+), Firefox; Android Chrome on 2-3 GB RAM phones |
| NFR-14 | Cost | AI spend per clinic bounded by monthly cap; infra budget set in OQ-07 |
| NFR-15 | Data retention | Clinical and financial rows are never hard-deleted by the app; retention period per counsel (OQ-08) |

## 10. Failure modes

| ID | What can go wrong | Impact | Designed response |
|---|---|---|---|
| X-01 | Network drops mid-form | Lost typing | Offline notice, form values kept, retry (FR-016) |
| X-02 | Double submit (checkout, payment, booking) | Duplicate receipt/charge | Disabled while pending plus idempotency key (FR-117d) |
| X-03 | Duplicate or out-of-order payment webhook | Wrong state | Signature, provider re-read, guarded status update, event dedupe |
| X-04 | PayMongo outage | Cannot pay or renew | Checkout shows "Nothing was charged"; no lock caused by our side; R-01 alerted; while `platform_settings.paymongo_degraded_until` is in the future (set by R-01 with a toggle on S-63, or automatically after 3 consecutive provider API failures) J-04 does not move any account to `past_due` or `masterlocked` |
| X-05 | Resend outage | Emails lost | `email_log`/`reminder_log` `failed`; user told on auth emails; retry from UI; alert on failure rate |
| X-06 | AI provider outage or bad key | No AI answers | Fall through Gemini > Claude > rules only; message shown |
| X-07 | Cron fails or times out | No reminders/locks | Alert (FR-114); jobs idempotent; manual run route for R-01 |
| X-08 | Timezone edge (00:00-08:00 Manila = previous UTC day) | Wrong day buckets | All day logic uses clinic timezone; tests at boundary |
| X-09 | Trial expires while payment is in flight | Wrongful lock | Payment wins: guarded update; lock job re-checks open invoices |
| X-10 | Two staff edit the same record | Lost update | Row locks on status changes; last write wins only on non-critical text; conflict message on stale edit for notes |
| X-11 | Account locked mid-session | Half-done work | Each action is one transaction; next request shows S-70 |
| X-12 | Staff of clinic A opens clinic B host | Data exposure | 404 (exists); tested |
| X-13 | Owner loses access (no ownership transfer) | Locked out of own clinic | R-01 recovery runbook: verify identity, reset owner credentials; audited |
| X-14 | Domain paid but registrar fails | Customer paid, no domain | `needs_review` on S-83, R-01 alert, refund or retry |
| X-15 | Database cold start or failover | Slow or failed requests | Pool timeouts, retry once on read, user-visible error page with retry |
| X-16 | Stale service worker | Old code served | Versioned SW, `skipWaiting`, tested update |
| X-17 | Staff deactivated mid-session | Continued access | Membership re-read every request (exists) |
| X-18 | Portal user linked to patients in two clinics | Wrong clinic data | One section per clinic; tested |
| X-19 | Import fails mid-way | Partial import | Preview first; per-row transaction; report counts of added and skipped |
| X-20 | Receipt voided after payment | Money mismatch | Void keeps payments; banner says refund separately; reconciliation report lists voided-paid receipts |
| X-21 | Wrong patient/guardian merge | Wrong records | No merge feature; duplicates are archived, not merged |
| X-22 | Lost or leaked device with staff session | Data exposure | Password re-entry for destructive actions (FR-117f); owner can deactivate staff; sessions expire |

## 11. Out of scope (this release)

Patient writes (booking, editing, paying) · SMS/Viber · offline saving and sync · public self-signup funnel with a card-free trial campaign tooling · custom white-label themes · franchise-style billing · inter-branch stock transfer · file uploads and attachments · dedicated eye, skin and vet tools (prescriptions, body maps, photos, vaccine cards) · general-practice specialty · multi-language UI · BIR-registered receipt printing authority · Stripe · mobile native apps · public API. Any request for these is refused or raised as a change with a change-log entry.

## 12. Change log

| Date | Change |
|---|---|
| 2026-10-10 | Doc-review fixes (qa/QA_REPORT_doc-review_2026-10-10.md): single state machine, guardian model, one PayMongo endpoint, lock-exempt routes, ID clean-up (FR-015, FR-016), PD-11, PD-12 |
| 2026-10-10 | First blueprint: baseline of built system plus gaps; decisions D-01..D-30; PD-04 and PD-09 override the 2026-10-03 roadmap |
