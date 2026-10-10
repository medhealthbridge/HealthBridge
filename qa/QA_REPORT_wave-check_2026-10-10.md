# QA Report: Wave check, 2026-10-10

## 1. Verdict

**CONCERNS.** I found no Critical bug. Tenant isolation holds at the database level (RLS, re-verified with a positive control) and in every by-id query in the services. Server role checks match the standing rules. Money maths matches the hand-worked RA 9994 / RA 10754 examples.

One High bug is still open: checkout and payments have no protection against a duplicate submit. It was not reproduced, because there is no DB. There are also 10 Medium bugs, including a phone layout that overflows to 3x the screen width and a ₱0 bill that cannot be checked out. Per the exit rule, accept the wave only after BUG-001 is fixed or explicitly accepted.

## 2. Scope

- **Mode:** Wave check, audit only. No application code was edited.
- **Commits:** 76f5480, 8a67db6, 35079ba, plus the working tree at HEAD 35079ba.
- **Areas:**
  - Tooth chart, including baby teeth (FDI 51-85), and the SOAP draft
  - Treatment plans
  - Checkout, pay later, installments and discounts
  - Recalls and the cron job
  - Migrations 0019 and 0020 with RLS
- **Oracle:** there is no BLUEPRINT.md and no six-document set, so there are no FR/NFR/T IDs (see Gaps). In their place I used:
  - The standing rules in the request (roles, archive-not-delete, integer centavos, the 20% senior/PWD discount with VAT backed out, RA 10173)
  - docs/mvp-demo.md, docs/db-app-role.md, docs/real-data-roadmap.md and AGENTS.md
  - Code comments that state intent
- **Requirement IDs:** I cite them as `RULE-*` (standing rules) and `INTENT file:line` (stated code intent).
- **Environment:** a Linux sandbox with Node and Next 16.
  - Postgres on port 5432 is unreachable from the sandbox, so no app-level DB integration tests ran.
  - Neon MCP was available. I used it only for read-only queries and for DO blocks that end with RAISE EXCEPTION, so everything rolled back.
  - Browser checks used Chromium 1194 (headless) through playwright-core, against a temporary unauthenticated preview route that rendered the components with sample props. That route has been deleted.

## 3. Bugs

Ranked by severity, most severe first. Verdict tags:
- **CONFIRMED:** reproduced by a test, a query or the browser.
- **CODE-READ:** found by reading the code; not executed because there is no DB.

---

```
BUG-001  [High / P1]  Checkout and payment have no idempotency: a double submit can create two receipts and two payments
Where:     src/server/services/billing.ts:98-205 (checkout), :208-228 (recordPayment); src/components/clinic/checkout-dialog.tsx:274
Violates:  RULE money integrity (catalog F: idempotency, D: replaying requests); gap: no documented rule
Role/env:  owner or assistant, any device; a slow network makes it more likely
Steps:     1. Open New checkout. Add services only, no plan items. 2. Double-tap "Take payment" fast, or let a network retry
           replay the POST. 3. Two server-action calls run one after the other.
Expected:  One receipt per checkout. A replay is refused or returns the first result.
Actual:    The services-only path has no idempotency key and no dedupe. Each call issues a new OR-number and a new PR-number
           payment. The button is disabled only after React re-renders with pending=true, and useActionState queues every
           submit that fires before that. Plan items are protected (FOR UPDATE plus `invoice_id IS NULL`, so the second call
           gets InvalidServiceError). Services are not. In recordPayment, a second full-balance payment is refused because the
           balance is then 0, but two partial payments (for example ₱1,000 twice on a ₱5,000 balance) both go through.
Evidence:  CODE-READ. Not reproduced: the action needs a session and a DB.
Cause:     No client nonce or idempotency key on the checkout or payment actions.
Suggested fix: Send a one-time token (a hidden uuid made when the dialog opens) and add a unique (clinic_id, token)
           constraint on invoices and payments; on conflict, return the existing receipt.
```

```
BUG-002  [Medium / P1]  Patient page overflows to about 3x the width on a phone (390px renders 1197px wide)
Where:     src/components/clinic/tooth-chart.tsx:144-145 (min-w-[42rem] inside overflow-x-auto) placed in the grid at
           src/components/clinic/patient-chart.tsx:62 ("grid gap-4 lg:grid-cols-2")
Violates:  INTENT tooth-chart.tsx:143 "the page itself never scrolls sideways"; catalog H layout (no horizontal scroll at 360/390)
Role/env:  owner or practitioner, phone, 390x844
Steps:     1. Open a patient's chart on a phone. 2. Look at the page width.
Expected:  The page fits 390px. Only the arch strip scrolls sideways.
Actual:    document.scrollWidth = 1197 against clientWidth = 390 in all three states (with data, read-only, empty). The panel
           header's segmented controls are pushed off-screen. Because the panels share one grid column, Details, Visits and
           Notes also become 1197px wide.
Evidence:  CONFIRMED. Playwright: {"scrollW":1197,"clientW":390} for write-390, read-390 and empty-390. The widest element
           is the Panel (`rounded-xl … lg:col-span-2`) at a right edge of 1197. At 1280px: scrollW 1280 = clientW (passes).
Cause:     A grid item defaults to min-width:auto, so the 42rem min-content of the arch row widens the grid track.
Suggested fix: Add `min-w-0` to the tooth-chart Panel (or `grid-cols-1` / `[&>*]:min-w-0` on the patient grid).
```

```
BUG-003  [Medium / P1]  A ₱0.00 bill cannot be checked out, and the error is invisible
Where:     src/components/clinic/checkout-dialog.tsx:93,216-229 (method hidden when paidNowCents = 0); src/lib/schemas/invoice.ts:63-64
Violates:  RULE pay in full / pay later must both work; catalog H forms (error shown next to a visible field)
Role/env:  owner or assistant
Steps:     1. New checkout with a ₱0 service (a free consultation), or with an owner 100% / fixed discount that covers the bill.
           2. Click "Take payment".
Expected:  A receipt is issued for ₱0.00.
Actual:    The dialog posts payNow="" and no `method`, because "Paid by" is hidden when nothing is due. The schema treats
           payNow="" as "pay everything now" and requires a method, so it returns fieldErrors.method. That error renders only
           inside the hidden "Paid by" block, so nothing visible happens.
Evidence:  CONFIRMED. src/lib/qa-wave-known-bugs.test.ts "BUG-003" fails as expected. Playwright on a ₱0 bill:
           {"methodVisible":0,"submitText":"Take payment","payNowHidden":""}.
Suggested fix: Treat a total of 0 as needing no method on the server (after totals are known), or send payNow "0" when the
           total is 0. Also render errors.method (and every field error) where it is always visible.
```

```
BUG-004  [Medium / P1]  A plan can be cancelled while items on it are billed (paid) but not done, which strands the money
Where:     src/server/services/treatment-plans.ts:103-106
Violates:  INTENT treatment-plans.ts:97 "cancelling needs nothing billed"
Role/env:  owner or practitioner
Steps:     1. Accepted plan with a planned item. 2. Checkout bills that item (pay ahead), so invoice_id is set and status stays
           planned. 3. Cancel the plan.
Expected:  Refused, because something is billed.
Actual:    The guard only checks `status = 'done'` (the `ne(status,'cancelled')` is redundant) and never checks invoice_id.
           The plan is cancelled. markPlanItemDone then refuses ("This plan is cancelled"), so paid work can't be recorded.
           The item can't be re-billed either. The only way out is to void the receipt.
Evidence:  CODE-READ.
Suggested fix: Add `or invoice_id is not null` to the guard and reword the message.
```

```
BUG-005  [Medium / P2]  Archived patients are read-only only in the UI; the server still accepts plan, recall and status changes
Where:     src/server/services/treatment-plans.ts:98 (setPlanStatus), :112 (addPlanItem), :148/:160/:176 (item actions)
           don't check patients.deleted_at; src/server/services/recalls.ts:47 (createRecall) never checks the patient
           (contrast with createPlan :89 and addChartEntry dental-chart.ts:60, which do)
Violates:  INTENT patient-dental.tsx:22,27-28 (canWrite/canEdit/canAgree = !archived); catalog rule 6 (server truth)
Role/env:  owner, practitioner or assistant posting the action directly
Steps:     1. Archive a patient who has a plan. 2. Post addPlanItemAction / markItemDoneAction / setPlanStatusAction /
           addRecallAction with that patient's ids.
Expected:  Refused, as the UI implies.
Actual:    Accepted. A recall for another clinic's patientId hits the composite FK and throws an unhandled error (a 500, not
           a leak).
Evidence:  CODE-READ.
Suggested fix: Load the plan's patient with `deleted_at is null` in loadPlan; check the patient in createRecall and map
           NotFoundError in addRecallAction.
```

```
BUG-006  [Medium / P2]  Recall emails keep going to archived patients, who also stay on the recall list
Where:     src/server/services/recalls.ts:36 (listRecalls join), :75 (sendRecallReminder join), :104-107 (runDailyRecalls)
Violates:  RULE RA 10173 (data minimization, purpose); archive semantics
Role/env:  daily cron job; front desk
Steps:     1. Patient has a pending recall. 2. Archive the patient. 3. The cron job runs within 7 days of the due date.
Expected:  No reminder to an archived patient; the recall drops off or is closed.
Actual:    No `patients.deleted_at is null` filter anywhere in the recall path, so the email is sent.
Evidence:  CODE-READ.
Suggested fix: Filter `isNull(patients.deletedAt)` in all three queries, or close open recalls when a patient is archived.
```

```
BUG-007  [Medium / P2]  The patient portal shows an unpaid bill exactly like a paid receipt, with no balance
Where:     src/server/services/patient-portal.ts:147 (now includes "open"); app/clinix-ph/portal/page.tsx:67
Violates:  Catalog I-1 (visibility of status); RULE patient read-only portal must be accurate
Role/env:  patient, portal
Steps:     1. Front desk puts a bill on account. 2. The patient opens the portal.
Expected:  The bill is marked as having a balance (or "On account"), with the amount owed.
Actual:    The total is shown in bold with no status. Only "void" is distinguished, so the patient can't tell paid from owed.
Evidence:  CODE-READ (portal page lines 64-68).
Suggested fix: Return paidCents and status, and show "Balance ₱x" / "On account" for open bills.
```

```
BUG-008  [Medium / P2]  Tooth-chart colour text fails WCAG contrast for 9 of 15 codes
Where:     src/components/clinic/tooth-chart.tsx:99 (affected-teeth chips), :183 (tooth number), :184 (word under the tooth)
Violates:  Catalog J (text contrast ≥ 4.5:1)
Role/env:  owner or practitioner, light theme
Steps:     Chart a crown, veneer, bridge, sealant, missing, filling, watch, mobile or fracture finding.
Expected:  Text ≥ 4.5:1.
Actual:    Contrast of the code colour on white (the real background is tinted, so it is slightly worse):
           crown #eab308 1.92, veneer #84cc16 1.98, bridge #f59e0b 2.15, sealant #22c55e 2.28, missing #94a3b8 2.56,
           filling #0ea5e9 2.77, watch #ca8a04 2.94, mobile #d97706 3.19, fracture #ea580c 3.56.
           The text is 9-12px, so the large-text exemption does not apply. Colour is not the only signal (the word under
           each tooth, aria-label and describeTooth text exist), so this is contrast only.
Evidence:  CONFIRMED. Computed relative luminance (WCAG formula) in the Playwright run. Screenshot: "#26: crown" and the
           yellow labels are hard to read.
Suggested fix: Keep the colours for fills and swatches; render the text in console-ink, or use a darker shade per code.
```

```
BUG-009  [Medium / P2]  The database does not enforce any of the new domain rules (no CHECK constraints)
Where:     src/server/db/migrations/0019_dental_flow.sql (all new tables)
Violates:  Catalog F (every rule has a DB constraint, not only app validation)
Steps:     As the owner role, in a DO block that was rolled back: insert a plan with status 'nonsense', an item with
           price -500, quantity 0, tooth 99 and status 'whatever', a chart entry with tooth 56 and code 'bogus' dated
           2999-01-01, and a discount of 250%.
Expected:  Each insert is rejected.
Actual:    All accepted: "plan.status=nonsense ok; item price=-500 qty=0 tooth=99 status=whatever ok; chart tooth=56
           code=bogus ok; discount 250% ok;" (then rolled back).
           Also: payments.receipt_number has no unique index (only payments_pkey and payments_clinic_invoice_idx exist);
           dental_chart_entries.plan_item_id and invoice_line_items.plan_item_id have no FK; invoice_installments has no
           unique (invoice_id, sequence).
Evidence:  CONFIRMED (Neon run_sql, transaction rolled back by RAISE EXCEPTION; pg_indexes listing).
Suggested fix: Add CHECKs (tooth in the FDI set, quantity between 1 and 32, unit_price_cents >= 0, amount_cents > 0,
           status/kind enums, percent 1-100), a unique (clinic_id, receipt_number) on payments, and composite FKs for
           plan_item_id.
```

```
BUG-010  [Medium / P2]  "Remove" (cancel item) and "Cancel plan" have no confirmation, and a cancelled item can never be restored
Where:     src/components/clinic/treatment-plans-panel.tsx:149 ("Remove", next to "Mark done"), :114 ("Cancel plan");
           src/server/services/treatment-plans.ts:148 (no un-cancel path)
Violates:  Catalog I-3/I-5 (user control, error prevention); RULE delete = archive/cancel, which implies it can be undone
Steps:     Tap "Remove" on an item by mistake.
Expected:  A confirmation, or an undo.
Actual:    It is cancelled immediately and permanently struck through. The only way to recover is to add the item again,
           which loses the agreed price snapshot.
Evidence:  CONFIRMED in the UI (preview screenshot: "Mark done" and "Remove" sit side by side with no dialog). No restore
           action exists in actions/dental.ts.
```

```
BUG-011  [Medium / P2]  Checkout loses typed values after a server error (PLAUSIBLE)
Where:     src/components/clinic/checkout-dialog.tsx:180,197,225,242,264 (uncontrolled discountLabel, discountIdNumber,
           referenceNumber, firstDueOn, recallReason); src/server/actions/billing.ts:66,74-77 return `values`, which the
           dialog never reads
Violates:  Catalog H forms ("entered data is kept after an error")
Steps:     1. Pick a senior discount, type the ID, choose GCash, leave the reference blank. 2. Submit.
Expected:  The error is shown and the ID number is still filled in.
Actual (expected from code): React 19 resets uncontrolled fields after a form action completes, so the ID, reference,
           label and due date are blank again.
Evidence:  CODE-READ. A browser run needs the server action, which needs a DB session.
Suggested fix: Use defaultValue={state.values?.x}, or make these inputs controlled.
```

```
BUG-012  [Low / P2]  The front desk can step an agreed plan back to "Shown to patient"; several actions skip the rate limit
Where:     src/server/actions/dental.ts:80 (assistant allowed to set "proposed" from "accepted"; canSetPlanStatus allows
           accepted→proposed); no consumeRateLimit in setPlanStatusAction :75, itemAction :90, voidChartEntryAction :133,
           addRecallAction :149, closeRecallAction :158
Violates:  INTENT dental.ts:79 "cancelling or reopening is the doctors'"; catalog D (rate limits, consistency)
Evidence:  CODE-READ.
```

```
BUG-013  [Low / P2]  An installment schedule can contain ₱0.00 installments
Where:     src/lib/installments.ts:16-24
Steps:     A ₱0.05 balance in 12 monthly installments.
Actual:    Eleven installments of ₱0.00 and one of ₱0.05. A ₱0.00 "upcoming" or "overdue" row shows on the receipt.
Evidence:  CONFIRMED. src/lib/qa-wave-known-bugs.test.ts "BUG-013" fails.
Suggested fix: Cap the count at balanceCents, or refuse when balance < count centavos.
```

```
BUG-014  [Low / P3]  Integer overflow gives a 500 on large amounts
Where:     src/server/actions/dental.ts:28-31 (pesosToCents has no maximum for a custom plan price); int4 columns in
           schema/billing.ts:28,77-78 and schema/dental.ts:51
Steps:     The owner types a custom plan price of ₱25,000,000 (2.5e9 centavos > 2,147,483,647), or checks out 22 × a
           ₱1,000,000 service.
Actual:    Postgres "integer out of range". The error is unhandled, so the user sees an error page.
Evidence:  CODE-READ (the limits are arithmetic).
Suggested fix: Cap prices at ₱1,000,000 like the price list does, and cap the invoice total, or use bigint.
```

```
BUG-015  [Low / P3]  Inputs that cross tenants or patients produce 500s or silent wrong links
Where:     src/server/services/billing.ts:156 (appointmentId not checked against the clinic or patient); recalls.ts:47
Actual:    Another clinic's appointmentId or patientId is blocked by the composite FKs (no leak), but it surfaces as an
           unhandled 500. A same-clinic appointment that belongs to a different patient is linked silently.
Evidence:  CODE-READ. The composite FKs were verified in the migrations (0003 invoices_appointment_fk, recalls_patient_fk).
```

```
BUG-016  [Low / P3]  Voiding a chart entry that "Mark done" created leaves the plan item done
Where:     src/server/services/dental-chart.ts:67-77 (the reverse case is handled at treatment-plans.ts:182)
Actual:    The chart says the work didn't happen; the plan still says it did, and it can be billed as done.
Evidence:  CODE-READ.
```

```
BUG-017  [Low / P3]  Recalls page: wrong label, fixed timezone, patient list cut off at 200
Where:     src/components/clinic/recalls-page.tsx:8 ("Due this week" for timing "soon", which is 30 days: recalls.ts:14-18);
           :9 hard-codes Asia/Manila instead of clinic.timezone; recall-actions.tsx picker uses listPatients
           (PATIENT_LIMIT = 200, clinic-app.ts:212)
Evidence:  CODE-READ.
```

```
BUG-018  [Low / P3]  Recall emails are not claimed before sending (unlike appointment reminders)
Where:     src/server/services/recalls.ts:70-94
Actual:    A cron run and a manual "Send reminder" at the same moment can both send. Appointment reminders claim a
           reminder_log row first (reminders.ts:62-63).
Evidence:  CODE-READ.
```

## 4. Gaps (the documents are silent or contradictory)

| # | Gap | Row to add |
|---|---|---|
| G1 | No BLUEPRINT.md, PRD, APP_FLOW, SCHEMA, TRD, DESIGN_BRIEF or IMPLEMENTATION_PLAN, so there are no FR/NFR/T IDs to trace. | Write the six documents (at least a PRD with FRs for chart, plans, checkout and recalls, and a permission matrix in SCHEMA). |
| G2 | Is patient agreement required before work is marked done, or before it is billed? Today a **draft** plan's items can be marked done (the plan jumps to in_progress), and a **proposed** (not agreed) plan's items can be billed. | FR: "Items can be marked done only on an accepted plan" (or say explicitly that it is allowed). |
| G3 | Senior/PWD eligibility: the ID number is free text (4+ characters) and is not checked against the patient's OSCA/PWD ID or age. Rules on combining discounts are not stated. | FR plus a BIR rule: prefill the ID from the patient record; senior/PWD and clinic discounts don't stack. |
| G4 | Voiding a paid receipt: no refund record; installments and the checkout-created recall stay. | FR for void, refund and its side effects. |
| G5 | Archived-patient behaviour on plans, recalls and reminders is implied by the UI but not written down. | FR: "An archived patient is read-only everywhere; open recalls close." |
| G6 | Recall emails are reminders or marketing under RA 10173; there is no opt-out or consent rule. | E row: consent and opt-out for recall reminders. |
| G7 | Who may void a chart entry (any doctor, or only its author)? | Permission matrix row. |
| G8 | DB hardening: `clinix_app` has DELETE on invoices, payments, line items, chart entries and plans (verified with has_table_privilege), despite the never-hard-delete rule. | docs/db-app-role.md: REVOKE DELETE on money, clinical and audit tables. |
| G9 | The app still connects as neondb_owner, so RLS is bypassed in production and only the per-query clinic_id filters protect tenants. | Release gate: switch DATABASE_URL to clinix_app (docs/db-app-role.md). |

## 5. Results table

There are no T IDs (G1), so rows are by area.

| Area | Checks | Covers | Result | Evidence |
|---|---|---|---|---|
| Static | `npx tsc --noEmit`, `npx eslint app src`, `npm run build` | S | **Pass** (3/3) | tsc exit 0; eslint exit 0; build exit 0 (only the expected BetterAuth default-secret/baseURL lines) |
| Existing unit suite | `npm test` before the QA files | regression | **Pass** 153/153 in 34 files | vitest output |
| Server role checks (code-read, every new action) | 17 actions × 4 roles | RULE roles, C | **Pass** 66/68 cells; 2 concerns (BUG-012) | See the matrix below |
| Tenant scoping / IDOR (code-read) | Every by-id query in dental-chart, treatment-plans, billing, discount-types, recalls has `clinic_id = ctx` | C | **Pass** (all queries); FK-only fallbacks in BUG-015 | Code lines cited above |
| RLS (database, as clinix_app, with a positive control) | Cross-tenant read, update, delete and insert on treatment_plans, treatment_plan_items, dental_chart_entries; clinic A sees its own rows | C | **Pass** 5/5 | `clinic_b_sees=0 b_sees_a_invoices=0 cross_update=0 cross_delete=0 cross_insert=refused 42501 clinic_a_sees_own=3` (rolled back) |
| RLS presence | ENABLE + FORCE + 1 nullif-guarded policy on 9 tables | C | **Pass** 9/9 | pg_class / pg_policies query |
| DB constraints | CHECK, unique and FK | F | **Fail** | BUG-009 |
| Validation boundaries | Teeth 10, 19, 20, 29, 49, 50, 56, 66, 76, 86, 90, 0, -11, 11.5, 100 rejected; 16 valid teeth accepted; surfaces; quantity 0/1/32/33; phase 0/1/8/9; void reason; recall months | A | **Pass** 84/84 | src/lib/qa-wave-dental-billing.test.ts |
| Money (hand-worked) | Senior on a mixed VAT/exempt bill; PWD on ₱999.99; custom 15%; fixed cap; 100%; quantity; discount parsing; payNow parsing; payment amount > 0 | A, F, RULE money | **Pass** (included in the 84) | same file |
| Installments | Remainder on the last part, month-end clamp, leap year, down payment not counted, partial, overdue | A | **Pass**; 1 fail (BUG-013) | same file plus qa-wave-known-bugs.test.ts |
| Plan state machine | 4 valid and 3 forbidden manual moves; item-driven moves | A | **Pass**; logic gaps BUG-004, G2 | same file plus code-read |
| Overpayment / partial payment (code-read) | payNow > total refused (billing.ts:143); payment > balance refused (:220); paid or void invoice refused (:217-219); FOR UPDATE on the invoice | A, F | **Pass** | code-read |
| Void un-bills plan items (code-read) | billing.ts:341 clears invoice_id; FOR UPDATE; owner only (actions/billing.ts:102) | A | **Pass** | code-read |
| Concurrency | Plan items: FOR UPDATE plus EvalPlanQual re-check refuses a second bill. Services: no dedupe | F | **Fail** (BUG-001) | code-read |
| Cron | Bearer secret, timing-safe compare, 503 when unset | D | **Pass** (code-read) | route.ts:9-13 |
| UI: 1280px | No horizontal scroll; 1 h1; no console errors; no control under 24px | H, J | **Pass** | Playwright write/read/empty-1280 |
| UI: 390px | Horizontal scroll | H | **Fail** (BUG-002) | scrollW 1197 |
| UI: touch targets | Under 24px: 0 at both widths. Under 44px (project standard): 20-49 per view, e.g. 32px chips and 36px segmented buttons | J | **Concern** (meets 2.5.8 minimum; misses the 44px project standard) | Playwright counts |
| UI: keyboard | Focus a tooth, press Enter, the "Tooth 16" detail opens; focus outline is solid 2px | J | **Pass** | Playwright |
| UI: contrast | Chart colour text | J | **Fail** (BUG-008) | computed ratios |
| UI: states | Empty ("Nothing charted yet…", "No treatment plans yet.") **Pass**; read-only (no write controls) **Pass**; loading (3D lazy placeholder) **Pass**; error (inline role=alert) **Pass** | H | **Pass** 4/4 rendered | screenshots in the scratchpad |

### Permission matrix (server, code-read)

Y = allowed, 404 = refused by `notFound()`. A patient has no clinic membership, so requireStaff redirects them to the portal for every action.

| Action | Owner | Practitioner | Assistant | Patient |
|---|---|---|---|---|
| createPlan, addPlanItem, item done / undo / cancel | Y | Y | 404 | refused |
| Custom plan price / custom item | Y | refused (service) | 404 | refused |
| setPlanStatus | Y | Y | proposed / accepted only (BUG-012) | refused |
| Chart add / void | Y | Y | 404 | refused |
| Recall add / close | Y | Y | Y | refused |
| Recall send | Y | 404 | Y | refused |
| Checkout, record payment | Y | 404 | Y | refused |
| Custom one-off discount | Y | n/a | refused (billing.ts:91) | refused |
| Void receipt | Y | 404 | 404 | refused |
| Discount types CRUD | Y | 404 | 404 | refused |
| Read the tooth chart | Y | Y | not loaded (patient-dental.tsx:17) | not in the portal |

**New tests:** 85 written. 84 pass; 1 is a bug reproduction that fails. Plus 1 more bug reproduction for the ₱0 checkout (BUG-003), which also fails. Full suite now: **237 passed, 2 failed (both intentional bug reproductions) in 36 files.**

## 6. Not tested

- **Server actions against a running server per role** (allowed and denied HTTP responses), plus the IDOR attempts through the app, archived-patient writes and double submit. There is no DB from the sandbox and no login, so the permission matrix above is from reading the code.
- **Transactions under load** (two desks billing the same plan item at once). This was code-read only.
- **3D view** (tooth-chart-3d.tsx): only the lazy-load fallback was seen. WebGL interaction and the onFail fallback were not exercised headless. There was no review of performance on a low-end phone.
- **Email content** of recall reminders, and the cron run end to end.
- **Migration 0019 on a fresh DB and on a seeded DB, and rollback.** The backfill UPDATEs for receipt_number and paid_cents were not re-run.
- **Lighthouse, axe-core** (not installed; I added no packages), **Safari/iOS**, **dark mode**, **200% zoom**, and **768px tablet**.
- **Receipt print layout**, and **CSV export** of the new paid/balance columns (formula injection was not rechecked).

## 7. Coverage

- Requirements with no tests: all of them formally (there are no FR IDs, G1). In practice, server actions and services have no automated tests (there is no DB test harness); only the pure lib/ logic is unit-tested.
- Tests with no requirement: none. Every new test traces to a standing rule or a code-stated intent.

## 8. Next actions (the smallest set to reach PASS)

1. BUG-001: add an idempotency token to checkout and recordPayment.
2. BUG-002: add `min-w-0` on the tooth-chart panel (or the patient grid), then re-run the 390px check.
3. BUG-003: allow a ₱0 bill without a method; show field errors where they can be seen.
4. BUG-004: block plan cancel when any item is billed.
5. BUG-005 and BUG-006: enforce "archived patient" on the server for plans and recalls, and filter archived patients out of the recall path.
6. BUG-007: show the balance on open bills in the portal.
7. BUG-008: give chart text a dark or ink colour.
8. BUG-009: add CHECK, unique and FK constraints in a new migration.
9. Retest: `npm test` (the 2 bug reproductions must turn green), the Playwright 390/1280 run, and a DB integration pass per role once a test DB is reachable.
10. Resolve gaps G2-G9, starting with G9 (move to the clinix_app connection) before launch.

---

## 9. Fix log (2026-10-10, after the audit)

| Bug | Fix | Verified by |
|---|---|---|
| BUG-001 | Checkout and Record payment send a one-time `requestId` made when the dialog opens. The server takes the numbering lock (checkout) or the invoice row lock (payment), then returns the first receipt for a replayed id. Unique `(clinic_id, request_id)` indexes back it up in the database. | Code + migration 0021 applied; not run end to end (no DB session in sandbox) |
| BUG-002 | `min-w-0` / `grid-cols-1` on the patient grid, the chart and plan panels, and the chart's bottom grid. | Playwright: scrollWidth = clientWidth at 360, 390, 768, 1280; arch strip scrolls inside its panel |
| BUG-003 | A free bill needs no method: the schema only requires a method for a typed amount; the server checks method and reference once it knows the total. | `qa-wave-known-bugs.test.ts` BUG-003 now passes |
| BUG-004 | Cancel plan is refused when any live item is done or on a receipt. | Code |
| BUG-005 | `loadPlan` refuses archived patients (all plan writes go through it); `createRecall` and `voidChartEntry` check the patient too. | Code |
| BUG-006 | Archived patients are filtered out of the recall list, the send path and the daily job. | Code |
| BUG-007 | Portal shows "Balance ₱x" on open bills and "Paid" on paid ones. | Type-check |
| BUG-008 | Chip text, tooth number and status word are console-ink; the code colour stays on the tint, border and dot. | Screenshot at 390px |
| BUG-009 | Migration 0021: CHECKs on plan/item status, quantity 1-32, price 0-₱1M, phase 1-8, FDI tooth (incl. baby teeth), chart kind/code, discount value, payment/installment amount > 0, invoice amounts; unique payment receipt numbers and installment sequence; composite FKs for plan_item_id. | Neon, rolled back: all 7 bad inserts refused; teeth 55 and 85 accepted |
| BUG-010 | Remove and Cancel plan ask first; a removed item can be restored at its agreed price. | Type-check |
| BUG-011 | Uncontrolled checkout fields take their default from the returned values, so they survive a server error. | Code |
| BUG-012 | The front desk can only move a plan forward (draft → shown → agreed). Rate limit on every plan, chart and recall write. | New unit tests in `plan-totals.test.ts` |
| BUG-013 | `buildInstallments` never makes a ₱0.00 part. | `qa-wave-known-bugs.test.ts` BUG-013 now passes |
| BUG-014 | Custom plan prices capped at ₱1,000,000; a bill over ₱10,000,000 is refused with a message. | Code |
| BUG-015 | Checkout refuses an appointment that isn't this patient's; recall for an unknown or archived patient returns a field error, not a 500. | Code |
| BUG-016 | Voiding a chart entry made by "Mark done" puts the plan item back to planned and refreshes the plan status. | Code |
| BUG-017 | Label "Due within 30 days"; reminded-at dates in the clinic's timezone. **Still open:** the add-recall patient picker lists at most 200 patients. | Code |
| BUG-018 | A recall reminder is claimed (notified_at compare-and-set) before the email goes out, and released if the send fails. | Code |
| G8 | `clinix_app` can no longer DELETE from invoices, line items, payments, installments, plans, plan items, chart entries, clinical notes, recalls or patients. | Neon: `has_table_privilege` false for each |

Checks after the fixes: `tsc` clean, `eslint` clean, `npm test` 241/241, `npm run build` exit 0.
Still not run: end-to-end per-role server actions, double submit against a live DB, and the remaining items in section 6.
