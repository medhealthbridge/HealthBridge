# Clinix PH — role audit and real-data roadmap

Status as of 2026-10-03. "Real" means it reads and writes the database; "mock" means the page shows sample data from `src/lib/mock-data/`.

## 1. What each role can do today

### Owner
| Area | Where | Read | Create | Edit | Archive / delete |
|---|---|---|---|---|---|
| Services & pricing | Console → Services | Real | Real | Real | Real (archive + restore) |
| Patients | Clinic app → Patients | Real | Real | **Missing in UI** (assistant only) | **Missing in UI** (assistant only) |
| Patients | Console → Patients | Mock | Mock | Mock | Mock |
| Today / queue | Clinic app | Real | Walk-in only | Status changes | Cancel via status |
| Appointments (booking) | Console → Appointments | Mock | **Missing** (assistant only) | **Missing** | **Missing** |
| Staff | Console → Staff | Real (read) | Invite at onboarding only, **cannot be accepted** | **Missing** (role change) | **Missing** (deactivate) |
| Clinic settings | Console → Settings | Real (read) | — | **Missing** | — |
| Subscription | Console → Subscription | Real (read) | — | — | — |
| Inventory, claims, reminders, modules, import/export, activity log, overview | Console | Mock | Mock | Mock | Mock |
| AI assistant | Console → Assistant | Real | Patients, bookings, services (confirm-first) | Same, password step-up | Archive with password + typed name |

### Assistant (front desk)
- In the clinic app: Today, Queue and Patients are real. They can add patients and walk-ins and move appointment status.
- **Blocker:** nobody can actually become an assistant, because staff invites are never emailed and there is no accept page. The role exists only in code.

### Practitioner
- In the clinic app: My schedule (own appointments only) and Patients are real. They can move their own appointments' status.
- Missing: clinical notes (the `clinical_notes` table exists but nothing uses it), and the same invite blocker as Assistant.

### Patient
- Nothing exists: no login, no portal, no booking. `patients.portal_user_id` is in the schema but unused.

## 2. Target permissions (who may do what)

**The rule (decided 2026-10-03):** the patient has **read only**. Owner, practitioner and assistant create, edit and delete — each within their own area. "Delete" always means archive, void or amend (never a hard delete) because clinical and financial records must be kept.

C = create, R = read, U = edit, D = delete (archive / void). "own" = only records that belong to that person.

| Data | Owner | Assistant (front desk) | Practitioner | Patient |
|---|---|---|---|---|
| Services & prices | CRUD | R | R | R |
| Patients (demographics, contact, IDs) | CRUD | CRUD | R (U contact only for own patients) | R own |
| Appointments | CRUD | CRUD | R own, U status/notes on own | R own |
| Clinical notes | R | — | CRU own (amend after 24h, D = void with reason) | R own summary |
| Invoices / payments | CRUD (void) | CRU (void needs owner) | R own patients' | R own receipts |
| Inventory | CRUD | R, record use | R, record use | — |
| Staff & roles | CRUD (deactivate) | — | — | — |
| Settings, subscription | U | — | — | — |

What changes because the patient is read-only:
- No patient login that writes anything. Patients cannot book, cancel, or edit their own details; they ask the front desk, who do it.
- The patient portal becomes a simple read-only view (own visits, receipts, upcoming appointments).
- Patient consent and data-access/deletion requests (RA 10173) are captured by staff on the patient's behalf, and logged.

Rules that apply everywhere: every write and every patient-record view writes `audit_logs`; the clinic comes from the session and host, never from a form; the server refuses what a role may not do, not just the UI.

## 3. Phases (build in this order; each is shippable on its own)

1. **Staff invites and staff management** — email the invite (Resend), accept page that creates the account with its role, owner can change role and deactivate. Unblocks every other role. *(Start here.)*
2. ~~Services & pricing~~ — **done** (`0cd43e8`).
3. **Patients everywhere** — console Patients page on real data; edit and archive in the UI (owner), contact-detail edits (assistant), read-only (practitioner); patient-record views logged.
4. **Appointments** — day/week calendar, book, reschedule, cancel; console Appointments page real; service and practitioner on each booking.
5. ~~Clinical notes~~ — **done.** practitioner writes notes per visit (per-specialty fields in `data`), amendments instead of edits after 24h, owner can read.
6. ~~Checkout~~ — **done.** invoice from services, senior/PWD maths (`src/lib/pos-totals.ts`), payments (cash, GCash, Maya, card), void with reason, receipt numbering.
7. ~~Inventory~~ — **done.** items, batches, stock in/out, low-stock and expiry alerts.
8. ~~Activity log and Overview~~ — **done.** real audit trail page; dashboard KPIs from real tables.
9. **Patient portal (read-only)** — invite by email/OTP, own visits, receipts and upcoming appointments. No writes; consent and data requests are handled by staff.
10. **Claims, reminders, import/export** — HMO/PhilHealth claims, email/SMS reminders, CSV import with preview.

The AI assistant gains tools for each area as it lands, always confirm-first with step-up on edit/delete.

## 4. The improved prompt (paste one phase at a time)

> **Goal:** Build phase *N* of `docs/real-data-roadmap.md`: *(phase name)*.
>
> **Before coding:** read `AGENTS.md`, the `db-schema-architect` and `ui-ux-pro-max` skills, and the roadmap's permission table (section 2). List the screens, server actions, services and tables you will add or change, and anything in the roadmap that conflicts with the existing code.
>
> **Scope:** real database reads and writes only — no mock data on the pages this phase touches; delete the mock exports they stop using. Every role in the permission table gets exactly its row: hide controls a role may not use *and* refuse them on the server.
>
> **Safety:** soft-delete or void, never hard-delete clinical or financial rows; audit row in the same transaction for every write; confirm dialog for archive/void; the clinic comes from the session.
>
> **Assistant:** add read tools and confirm-first write tools for this area, following `src/server/agent/clinic-tools.ts`.
>
> **Done means:** type check, lint, tests (unit tests for new services and Zod schemas, plus a permission test per role) and build pass; migration applied and recorded; the pages work at 375 px and 1440 px; and a short report of what was *not* verified.

Why this version works better than "make all data real and CRUD for every role":
- It names one phase, so each change is small enough to review and test.
- It points at a written permission table, so "CRUD for every role" has an exact meaning instead of everyone getting everything.
- It states the safety rules and the definition of done up front, so they aren't rediscovered (or skipped) each time.
