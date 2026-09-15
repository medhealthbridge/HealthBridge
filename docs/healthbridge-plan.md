# DataBridgeSol — Platform Architecture Plan

## Overview
DataBridgeSol sells a *software system* to clients (clinic owners/operators), not a marketplace or company directory. Clients manage one or more clinic "tenants," each running on its own subdomain.

---

## 1. Domain Structure

### Main Domain — databridgesol.space
- Marketing and sales site: features, pricing, demo requests
- Sign-up / login entry point
- No clinic directory or public listings — this is a B2B sales site, not a patient-facing marketplace

### Client Dashboard — app.databridgesol.space (or on main domain post-login)
- After login, client sees the clinic(s) they own/manage
- Single-clinic client → redirected straight to their subdomain
- Multi-clinic client → sees a list/grid of their clinics, selects one to manage
- Includes an "Add new clinic" action

### Clinic Subdomain — clinicname.databridgesol.space
- The actual product instance for that specific clinic
- First-time setup: subscription confirmation, account config, branding/theme
- After setup: becomes the clinic's operating dashboard (scheduling, staff, patients, etc.)

---

## 2. Billing Model — *Recommended: Per-Account with Per-Clinic Tiers*

A hybrid model, not pure per-clinic or pure per-account billing.

- *One account = one billing relationship.* Single invoice, single payment method, single login.
- *Plan tier = number of clinics included.* Each tier simply allows one more clinic slot than the last:
  - *Tier 1* — up to 1 clinic
  - *Tier 2* — up to 2 clinics
  - *Tier 3* — up to 3 clinics
  - *Tier 4* — up to 4 clinics
  - Above 4 clinics, switch to *custom/Enterprise pricing* with a dedicated quote — avoids an unbounded pricing table and matches how most B2B SaaS handle larger multi-location accounts.
- Client upgrades tiers when they need to add a clinic beyond their current limit — this can be enforced at the "Add new clinic" step in the dashboard (block the action and prompt an upgrade if they're at their slot limit).

### Why this model
| Approach | Problem |
|---|---|
| Pure per-clinic billing | Multiple checkouts, multiple invoices, awkward to add new locations, no unified view of spend |
| Pure per-account (flat) billing | Underprices larger multi-location clients relative to resource usage |
| *Hybrid (recommended)* | One relationship to manage, scales fairly with usage, simpler to build (billing state lives at account level, not per-subdomain) |

### Exception
If clients are *independent operators sharing a parent/franchise account* with no real financial relationship to each other, pure per-clinic billing may be more appropriate instead. *Default assumption (no franchise signal yet): per-account billing applies to all clients.* Revisit only if a specific client type surfaces this need.

---

## 3. Onboarding Flow (on the clinic subdomain)

1. *Choose subscription plan* — tiered plans by clinic count (see Section 2); monthly/annual billing option; *15-day free trial* on signup, no card required, to reduce signup friction.
2. *Account & admin setup* — clinic owner's admin account: name, email, password/SSO, phone verification if compliance requires it.
3. *Clinic profile* — name, address, specialty/type, logo, business hours.
4. *Branding / theme* — primary + accent color, logo placement, optional font style. Start simple: 4–6 preset palettes plus a custom color picker.
5. *Team invites* — invite staff with role-based permissions (admin, doctor, front-desk, etc.).
6. *Payment method* — collected via Stripe/Paddle; can be deferred to end of trial if applicable.

---

## 4. Key Architectural Decisions to Lock Down Early

- *Subdomain assignment timing* — allow clients to pick their subdomain during signup, before payment, so the URL exists even during a trial. Maintain a blocklist for reserved words (admin, api, www, app, etc.).
- *Tenant isolation model:*
  - Shared database + clinic_id column on every table — simplest, cheapest, fine at scale
  - Schema-per-tenant — more isolation, harder migrations
  - Database-per-tenant — max isolation, only needed for strict compliance requirements
  - *Recommendation:* shared DB with strict row-level security policies, plus encryption at rest and in transit, and full audit logging on patient-related records. *Default assumption: treat clinic data as sensitive/health-adjacent by default* (even without a confirmed compliance mandate) — safer to over-build isolation and access controls now than retrofit later if HIPAA or similar regulations end up applying.
- *Custom domains (future-proofing)* — clients may eventually want portal.theirclinic.com instead of theirclinic.databridgesol.space. Design the routing layer now with a domain → clinic_id lookup table so this is a config change later, not a rebuild.
- *"Masterlock" enforcement* — the lock should also block *creating any new clinic/subdomain* under a locked account, not just access to existing ones (prevents locked clients from spinning up a fresh clinic to dodge the hold).
- *Failed payment / expired trial behavior (confirmed):*
  - *Never delete clinic data* on trial expiry or failed payment — all records stay intact regardless of billing status.
  - *Lock the subdomain instead* — a "masterlock" state: login/dashboard access is blocked and a reactivation/payment screen is shown in its place. No new signups or account creation can occur while locked.
  - Once payment is resolved, the lock lifts and the clinic dashboard becomes accessible again exactly as it was — no data loss, no re-setup.
- *Theming scope* — start with colors/logo only (fast, low support burden). Full white-labeling (fonts, layout, custom CSS) should only be added later if enterprise clients specifically request it.

---

## 5. Decisions Made by Default (revisit if new info surfaces)

- *Billing:* Per-account billing applies to all clients unless a franchise-style (no shared financial relationship) client type emerges.
- *Compliance:* Clinic data treated as sensitive/health-adjacent by default — shared DB + row-level security, encryption at rest/in transit, audit logging on patient records — even before a confirmed regulatory mandate.
- *Tier cap:* Linear tiers run Tier 1 through Tier 4 (1–4 clinics); anything above 4 clinics moves to custom/Enterprise pricing with a dedicated quote.