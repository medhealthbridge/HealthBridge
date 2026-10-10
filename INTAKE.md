# INTAKE: DataBridgeSol / Clinix PH (repo: HealthBridge)

Status: CONFIRMED by the owner 2026-10-10. Written 2026-10-09. Next step: `system-blueprint`.

## 1. Fixed prompt

Plan the blueprint for **Clinix PH**, the clinic app of **DataBridgeSol**: a multi-tenant B2B SaaS sold to clinic owners in the Philippines. One Next.js app (Server Actions, Drizzle, Neon Postgres, better-auth, Vercel Singapore) serves a sales site (databridgesol.space), a client dashboard (app.), and one subdomain per clinic. Clients pay per account in tiers of 1-4 clinics (5+ is custom), after a 15-day trial with no card. Unpaid or expired accounts are locked (Masterlock): access is blocked, new clinics cannot be created, data is never deleted. The first release serves **dental, eye care, skin and veterinary** clinics in a **pilot with 1-3 known clinics**. Dental has dedicated tools (3D tooth chart, treatment plans, recalls); the other types launch on the shared tools plus configurable fields, and vet stores each patient as an animal linked to a human owner. The blueprint documents what is already built as the test standard, then plans the gaps and the launch gate below. Patient data is treated as sensitive; the Philippine Data Privacy Act (RA 10173) applies.

## 2. Decisions

| # | Question | Answer | Source |
|---|---|---|---|
| I-01 | Blueprint scope | Built + gaps | user |
| I-02 | Names | DataBridgeSol (company, sales site), Clinix PH (clinic app), HealthBridge (repo only) | user |
| I-03 | Clinic types at launch | Dental, eye, skin, veterinary | user |
| I-04 | Vet patient model | Animal record linked to a human owner (owner is billed and contacted) | user |
| I-05 | Non-dental tools at launch | Shared tools + custom fields; dedicated eye/skin/vet tools are later modules | user |
| I-06 | Rollout | Pilot with 1-3 known clinics, onboarded by hand | user |
| I-07 | Launch gate | All five "before any real clinic" items done first (see section 5) | user |
| I-08 | Subscription charging | PayMongo (recurring support to be verified in research) | user |
| I-09 | AI assistant limits | Monthly cap per plan, usage meter for clinic, per-clinic usage view for platform admin | user |
| I-10 | Reminders | Email only at launch; SMS/Viber later | user |
| I-11 | Weak internet | Offline notice, keep half-filled forms, retry; no offline record saving | user |
| I-12 | Billing model | Per account, tiers 1-4 clinics, 5+ custom | docs/healthbridge-plan.md |
| I-13 | Tenant isolation | Shared database, row-level security, audit log on patient and billing writes | docs + AGENTS.md |
| I-14 | Delete rule | Never hard-delete clinical or financial records: archive, void or amend | docs/real-data-roadmap.md |
| I-15 | Patient access | Patient portal is read-only; staff do all writes on a patient's behalf | docs/real-data-roadmap.md |
| I-16 | Data-fetching pattern | Server Actions (AGENTS.md wins over the older docs/architecture.md) | AGENTS.md |
| I-17 | Language, currency, timezone | English, PHP (integer centavos), Asia/Manila | default accepted |

## 3. Modules

| Module | Status | Standalone |
|---|---|---|
| Platform: accounts, tenants, subdomains, Masterlock, subscription | Partly built; renewals and past-due lockout missing | Yes |
| Company admin (platform staff): tenants, AI settings, audit, billing, support | Partly built; Overview, Billing, Support, Audit, Feedback, Modules on sample data | Yes |
| Clinic core: staff and roles, patients, custom fields, appointments and queue | Built | Yes |
| Clinical notes | Built | Needs clinic core |
| Checkout and billing: discounts, receipts, pay later, void | Built | Needs clinic core |
| Inventory | Built | Yes |
| Claims (HMO/PhilHealth) | Built | Needs billing |
| Reminders (email) | Built; live test pending | Needs clinic core |
| Patient portal (read-only) | Built | Needs clinic core |
| Dental tools: tooth chart, treatment plans, recalls | Built | Needs clinic core |
| Vet: animal-with-owner patient model | New (MVP) | Needs clinic core |
| Eye and skin: configurable fields and shared tools | New (MVP) | Needs clinic core |
| AI assistant with plan limits | Built; limits and meter new (MVP) | Optional |
| Import/export | Built | Needs clinic core |
| SMS/Viber reminders, dedicated eye/skin/vet tools, offline sync, public signup | Later | n/a |

## 4. Roles

- **Platform admin:** company staff; manages tenants, plans, locks, AI settings; reads cross-tenant data only through audited admin paths.
- **Owner:** runs the clinics on an account; full control of own clinics, staff, settings, subscription.
- **Assistant (front desk):** patients, appointments, queue, checkout; no clinical notes; cannot void.
- **Practitioner:** own schedule and patients, clinical notes, tooth chart; own records only.
- **Patient:** read-only portal for own visits, receipts and upcoming appointments.

## 5. Launch gate (all required before the pilot, per I-07)

1. Database security cutover to the restricted `clinix_app` role, with RLS verified under it.
2. Live verification of invite and reminder email (Resend), PayMongo checkout, domain purchase, AI keys.
3. Subscription renewals, failed-payment handling, past-due lockout.
4. Terms, Privacy Policy, data-processing notice, NPC/DPO details.
5. Backups with a tested restore, error tracking, uptime check.

## 6. Assumptions and out of scope

Assumptions:
- General-practice clinics are not in the first release (not in the chosen list).
- Non-dental types need no dedicated charts or photo tools at launch; if skin clinics need photo upload, that is a change request.
- Pilot clinics are charged through the same PayMongo flow, not by hand, because the launch gate requires renewals.
- Names in section 2 replace the mixed names in the docs.

Out of scope for this release: patient writes (booking, editing), SMS/Viber, offline mode, public self-signup marketing funnel, custom domains, white-label theming beyond colors and logo, franchise-style billing.

## 7. Open items

| Item | Blocks blueprint? |
|---|---|
| Does PayMongo support recurring subscription charges the way section 2 needs? Verify in research | No (research step) |
| Who writes the legal pages, and is the DPO / NPC registration done? | No, but blocks launch gate 4 |
| Skin clinics: is photo upload needed at launch? | No (assumed later) |
| Merge or retire `docs/architecture.md`, which conflicts with AGENTS.md | No (handled in the TRD) |

## 8. Next step

Confirm or correct this brief. Then run `system-blueprint` with it as input to produce `BLUEPRINT.md` and the six documents in `docs/`, and run Quality in doc-review mode on them.
