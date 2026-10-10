# BLUEPRINT: DataBridgeSol / Clinix PH

Version 1, 2026-10-10. Input: confirmed `INTAKE.md`. This is the index. The six documents hold the detail; this file holds the decisions, the open questions and the rules for keeping them in step.

## 1. What this is

Clinix PH is the clinic app of DataBridgeSol: a multi-tenant B2B SaaS for clinic owners in the Philippines (dental, eye, skin, veterinary at launch). One Next.js app serves the sales site, the owner console, the clinic app, the patient portal and the company admin. The system is partly built (about 74 actions, 40 tables, 153 tests). This blueprint documents what is built (the test standard), specifies what is missing (subscriptions, renewals, Masterlock enforcement, real company admin, vet model, compliance, hardening) and orders the work in waves for a pilot with 1-3 known clinics.

## 2. Document map

| File | Holds | Read it when |
|---|---|---|
| `INTAKE.md` | confirmed brief and answers (I-01..I-17) | you need the why behind a decision |
| `docs/PRD.md` | roles R, modules M, features FR (built and new), permission decisions PD, NFR, failure modes X | deciding what the system must do |
| `docs/APP_FLOW.md` | screen registry S, navigation, workflows W, state rules, messages | building or testing a screen or flow |
| `docs/SCHEMA.md` | entities E, target permission matrix P, contracts A, jobs J, migrations M, seed | touching data, permissions, an action or a job |
| `docs/TRD.md` | stack, structure, commands, env vars, integrations, operations, boundaries | setting up, deploying, choosing a tool |
| `docs/DESIGN_BRIEF.md` | tokens, components C, five states, content and accessibility rules | designing or reviewing UI |
| `docs/IMPLEMENTATION_PLAN.md` | waves, tasks K, tests T, coverage matrix, done rule, launch checklist | planning, building, testing |
| `docs/baseline/*.md` | as-built snapshots dated 2026-10-10: schema, screens, actions, infra, checks | comparing code with the documents |
| `docs/ops/*.md` | compliance, runbook, live-check (operational records) | operating and launching |
| `AGENTS.md` | binding coding rules (wins over `docs/architecture.md`) | before any change |
| `.claude/agents/quality.md` | the Quality agent | testing and release gates |

## 3. Rules for keeping the documents true

1. IDs are stable: R, M, FR, PD, NFR, X (PRD); S, W, EM (APP_FLOW); E, P, A, J, MG migrations (SCHEMA); C (DESIGN_BRIEF); K, T (PLAN); D, OQ (this file). Never reuse or renumber; retire with a note.
2. One home per fact. Other files cite the ID. If you copy a fact, the copy will drift.
3. The documents win: new work follows them. Built behaviour recorded in the baseline is the test standard; a difference between code and document is a finding for the owner to rule on (fix the code or change the document), never decided silently.
4. A change to behaviour starts as a change to the document (with a line in its change log), then code, then tests.
5. Anything not verified says so. Checks that need the network (npm, Neon, PayMongo live) were not run while writing this blueprint (`docs/baseline/checks.md`).

## 4. Locked decisions

| ID | Decision | Source |
|---|---|---|
| D-01 | Names: DataBridgeSol (company, sales site), Clinix PH (clinic app), HealthBridge (repo only) | I-02 |
| D-02 | Scope of this release: built system documented + gaps closed; pilot of 1-3 clinics | I-01, I-06 |
| D-03 | One Next.js app with Server Actions; no separate backend; AGENTS.md wins over `docs/architecture.md` | I-16 |
| D-04 | Shared database, tenant key `clinic_id`/`account_id`, Row-Level Security forced, restricted role `clinix_app` in production | I-13 |
| D-05 | Roles: platform super_admin and staff; clinic owner, assistant, practitioner; patient/guardian read-only portal; visitor; system | I-15 |
| D-06 | Clinical and financial records are never hard-deleted: archive, void or amend | I-14 |
| D-07 | Money is integer centavos in PHP; one totals function (`invoice-totals.ts`) | I-17 |
| D-08 | Time stored UTC, shown in clinic timezone (default Asia/Manila); English only | I-17 |
| D-09 | Notifications are email only (Resend) in this release | I-10 |
| D-10 | PayMongo is the subscription payment provider; Xendit stays only for the existing domain purchase | I-08 |
| D-11 | Trial is 15 days, no card | docs |
| D-12 | Billing per account; tier 1-4 = 1-4 clinics; 5+ is Enterprise by quote | I-12 |
| D-13 | Masterlock means access is blocked and data is kept; it never deletes | docs |
| D-14 | Renewals: Mode A (emailed payment link, any method) is required; Mode B (auto-charge cards/Maya) is optional pending OQ-02 | research |
| D-15 | AI assistant: rules, then Gemini, then Claude; writes need confirmation; monthly answer cap per clinic with meter | I-09 |
| D-16 | Patient portal is read-only; invite by emailed single-use link plus password (not OTP) | I-15, PD-09 |
| D-17 | Veterinary: animal patient linked to a human guardian who is contacted and billed | I-04 |
| D-18 | Eye and skin: shared tools plus per-clinic custom fields; dedicated tools later | I-05 |
| D-19 | No file uploads or skin photos in this release | assumption |
| D-20 | Weak internet: offline notice, forms keep input, no offline saving | I-11 |
| D-21 | Launch gate: RLS cutover verified, live verification, renewals and lockout, legal pages and DPO, backups and monitoring | I-07 |
| D-22 | Only R-01 manages tenants (create, lock, tier, trial); R-02 reads | PD-04 |
| D-23 | Auth stays better-auth with required email verification | AGENTS.md |
| D-24 | Hosting Vercel (Singapore) and Neon Postgres | built |
| D-25 | The existing console components are the design standard; tokens defined once | AGENTS.md |
| D-26 | Custom domains stay as built and are hardened; not promoted in this release | INTAKE section 6 |
| D-27 | General-practice clinics are not in this release | INTAKE section 6 |
| D-28 | No fictional screens: mock screens are removed until built | FR-026 |
| D-29 | Quality agent runs after every wave and as the release gate; High/Critical findings block launch | plan |
| D-30 | Documents win over code for new work; built behaviour is the test standard for the baseline | rule 3 |

## 5. Open questions

Defaults let work proceed; the answer changes the listed items. "Blocks" says what cannot be finished or launched without the answer.

| ID | Question | Default used now | Blocks |
|---|---|---|---|
| OQ-01 | May the clinic owner write clinical notes? (code: yes; roadmap: no) | keep code; show owner notes as authored | nothing (permission cell P-06) |
| OQ-02 | Will PayMongo enable Subscriptions for DataBridgeSol (cards, Maya)? | Mode A only | K-208 only |
| OQ-03 | Who reviews the Terms, Privacy Policy and Data Processing Notice drafted by us? | drafts stay marked draft | K-401 and launch |
| OQ-04 | Final tier prices and annual discount (code: 1,490 / 2,690 / 3,690 / 4,590 PHP per month) | code values; annual = 12 months less 0 percent | K-101 final values, launch |
| OQ-05 | Monthly AI answer cap per clinic | 300 | K-206 values |
| OQ-06 | PayMongo business verification and live keys status | test keys only | K-603, launch |
| OQ-07 | Error-tracking vendor and monthly infrastructure budget | pick on setup, free tier | K-601 |
| OQ-08 | Record retention period | never delete; no expiry job | privacy text |
| OQ-09 | Who is the DPO, and is NPC registration required for DataBridgeSol's systems (NPC Circular 2022-04 thresholds, verify with counsel)? | decision recorded in `docs/ops/compliance.md` | K-408, launch |
| OQ-10 | Do skin clinics need photo upload at launch? | no (D-19) | change request if yes |
| OQ-11 | Add RLS to `agent_actions` in this release? | yes if time, else documented exception | K-405 scope |
| OQ-12 | Platform-admin MFA | none for the pilot; accepted risk recorded (FR-117m) | launch sign-off |

## 6. Wave order (summary)

0 Safety nets and honesty · 1 Subscription core · 2 Renewals, tiers, admin, AI cap · 3 Clinic profile, verticals, billing integrity · 4 Trust, privacy, security · 5 Consistency and accessibility · 6 Launch readiness. Detail and tests in `docs/IMPLEMENTATION_PLAN.md`.

## 7. Readiness gate (verdict)

Checks run: ID cross-reference script (all IDs resolve, no dependency cycles, every FR in the coverage matrix) and two Quality doc-review passes (`qa/QA_REPORT_doc-review_2026-10-10.md`).

Verdict: PASS WITH NOTES for starting Wave 0. Wave 1 and later start after the owner answers OQ-02, OQ-04, OQ-06 as needed (see section 5) and rules on the `*` cells in `docs/SCHEMA.md` section 5.1.

## 8. Known limits of this blueprint

- Installs, type checks, lint, tests, build and audit could not run in the writing environment (no registry access). Test counts and versions come from reading files.
- RLS cutover to `clinix_app` in production is unverified.
- PayMongo behaviour was taken from public documentation and must be checked in the live dashboard (FR-115).
- Legal and NPC points are not legal advice; counsel confirms (OQ-03, OQ-09).
- Money vectors T-050..T-056 were computed from the written rules, not from running the code.

## 9. Change log

| Date | Change |
|---|---|
| 2026-10-10 | Version 1 written from confirmed INTAKE |
