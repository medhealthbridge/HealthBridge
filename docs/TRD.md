# TRD: DataBridgeSol / Clinix PH

Technical requirements and the single source for stack, structure, commands, environment, integrations, operations and boundaries. Exact as-built facts are in `docs/baseline/infra.md` (cite BI-x). Binding coding rules are in `AGENTS.md` (it wins over `docs/architecture.md`, which is an unadapted template: do not follow its Route Handler + TanStack Query pattern).

## 1. Stack (versions from `package-lock.json`)

| Layer | Choice | Version | Note |
|---|---|---|---|
| Framework | Next.js App Router | 16.3.6 | Breaking changes vs older Next: read `node_modules/next/dist/docs/` before using an API not yet used here (proxy, `after`, caching) |
| UI runtime | React | 19.2.4 | Server Components by default; `'use client'` on leaves only |
| Language | TypeScript strict | per lockfile | no new `any` |
| Styling | Tailwind CSS | 4 | tokens in `app/globals.css` `@theme` |
| ORM and migrations | Drizzle ORM / drizzle-kit | 0.45.3 / 0.31.11 | one client in `src/server/db/client.ts` |
| Database | Neon Postgres via `pg` | pg 8.23 | pool max 8; region near Singapore |
| Auth | better-auth | 1.7.5 | do not switch library; email verification required |
| Validation | Zod | 4.6.5 | contracts shared by form and action |
| Tests | Vitest | 3.2.7 | add Playwright for e2e (K-002) |
| Email | Resend (raw fetch) | n/a | all mail via `sendEmail` |
| Payments | PayMongo (subscriptions, D-10); Xendit code exists (domains) | raw fetch | see section 6 |
| AI | Gemini and Anthropic SDKs | `@google/genai` ^2.27, `@anthropic-ai/sdk` ^0.131 | rules > Gemini > Claude |
| 3D | three.js | per lockfile | tooth chart |
| Hosting | Vercel | region `sin1` | one cron entry |
| PWA | service worker `public/sw.js` | n/a | static assets and offline page only |

Rule: pin through the lockfile; upgrades are their own task with `npm audit`, tsc, tests and build green (NFR-06). New libraries need a written reason (AGENTS.md: native Next first).

## 2. Architecture

One Next.js app; no separate backend (AGENTS.md). Request path: browser > Vercel > `proxy.ts` (host routing: marketing host, clinic subdomain, admin host, custom domain) > route/page > Server Component data load or Server Action > service > `with*` DB helper > Postgres (RLS when `clinix_app`).

```
src/
  app/ (root app/ also used)   routes; _components/ colocated per route
  server/
    actions/   thin: authorize, rate limit, Zod, call service, revalidate
    services/  plain TypeScript, no Next imports; all business rules
    db/        client.ts (with* helpers), schema/*, migrations/
    auth.ts    requireUser, requireActiveClinic, requireClinicRole, requirePlatformAdmin ...
    services/payments/  paymongo.ts, xendit.ts (signature verify, API re-read)
    jobs/      daily job functions J-01..J-06 (called by the cron route)
  lib/
    plans.ts           PLAN_LIMITS (FR-012)
    schemas/           Zod contracts
    invoice-totals.ts  canonical money maths (PD-10)
    mock-data/         static marketing copy only (no data shown as real)
  components/ shared UI (2+ routes); components/console/* console design system
```

Rules binding every change (full text in AGENTS.md):
1. Schema/migration first > Zod contract > service > action > UI > revalidate.
2. Services reach data only through `withTenant`, `withAccount`, `withUser`, `withAccountAndClinic`, `withOrder`, `withPlatformAdmin` (after `requirePlatformAdmin()`).
3. Authorize on the server in the action and the page; layouts are not gates; never trust `Host`, `Origin` or ids from forms for authorization or redirect URLs.
4. Money is integer centavos; totals only from `invoice-totals.ts`; plan prices only from `PLAN_LIMITS`.
5. Every patient-record write, billing-state change and platform write has an audit row in the same transaction.
6. Webhooks: one dynamic endpoint `/api/webhooks/[provider]` dispatches by metadata (SCHEMA section 6); verify signature on the raw body, re-read the fact from the provider, idempotent guarded update, rate-limited. Do not add a static route that shadows it.
7. One error style for services (typed throws mapped to the action result `{ ok, error }`).
8. UI separation: one section one component; no inline mock data; Tailwind `dark:`; no `<style jsx>`.

## 3. Commands

| Purpose | Command | Gate |
|---|---|---|
| Dev | `npm run dev` | n/a |
| Types | `npx tsc --noEmit` | zero errors |
| Lint | `npx eslint app src` | zero errors |
| Unit and service tests | `npm test` (Vitest) | all pass |
| DB-backed tests | `npm run test:db` (to add, T-001): runs against a disposable Neon branch with `clinix_app` | all pass |
| E2E | `npm run test:e2e` (to add, Playwright, 375/768/1024/1440) | critical flows pass |
| Build | `npm run build` | passes |
| Audit | `npm audit --omit=dev` | 0 High/Critical (NFR-06) |
| Migrate | `npm run db:generate` then review SQL; apply with admin URL | per AGENTS.md procedure |

Sandbox note: the Claude cloud sandbox cannot reach the npm registry or Neon (BI-checks). The five gate commands therefore run in CI (GitHub Actions, task K-001) and in the owner's environment. Any report written from the sandbox says which gates were not run.

## 4. Environment variables

Single table; `.env.example` must list every variable (task Wave 0). Secrets never in the repo; production values in Vercel.

| Variable | Purpose | Required | In `.env.example` today |
|---|---|---|---|
| `DATABASE_URL` | runtime DB; must be `clinix_app` in production | yes | yes |
| `DATABASE_ADMIN_URL` | migrations and seeds only; never in deployed env | dev/ops | yes |
| `BETTER_AUTH_SECRET` | auth signing and root of encryption keys; rotating breaks stored AI keys | yes | yes |
| `BETTER_AUTH_URL` | base URL | yes (prod) | yes |
| `RESEND_API_KEY`, `EMAIL_FROM` | email; sender domain must be a verified Resend domain owned by DataBridgeSol (`.env.example` shows `no-reply@clinix.ph`; confirm the real domain in live-check #3) | yes | yes |
| `CRON_SECRET` | cron bearer | yes | yes |
| `CLINIC_SUBDOMAINS` | `on` enables subdomain routing | prod | **no: add** |
| `NEXT_PUBLIC_CLINIX_URL` | landing buttons | optional | yes |
| `PAYMONGO_SECRET_KEY` | API | yes (launch) | yes |
| `PAYMONGO_WEBHOOK_SECRET` | webhook HMAC | yes (launch) | yes |
| `PAYMONGO_PUBLIC_KEY` | only if client-side elements are used (not planned) | no | **no** |
| `SUBSCRIPTION_RETURN_BASE_URL` | return/cancel URLs for checkout; defaults to `BETTER_AUTH_URL`; never from `Host` | optional | **no: add** |
| `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN` | domain payments only | optional | yes |
| `VERCEL_API_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, `DOMAIN_REGISTRANT`, `USD_PHP_RATE`, `DOMAIN_MARGIN` | domain registrar | optional | partial |
| `GOOGLE_`, `APPLE_`, `FACEBOOK_` + `CLIENT_ID` / `CLIENT_SECRET` | social sign-in; button shows only when both are set | optional | check and add |
| `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` | AI fallback keys (DB-stored keys win) | optional | yes |
| `GEMINI_MODEL`, `ADMIN_AGENT_MODEL` | model overrides (rename `ADMIN_AGENT_MODEL` use for the clinic assistant to a clear name, FR-119) | optional | partial |
| `AGENT_DAILY_AI_LIMIT` | per-user daily answers (default 100) | optional | yes |
| `AI_MONTHLY_CAP_DEFAULT` | default monthly clinic answer cap (OQ-05, 300) | optional | **no: add** |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_NAME`, `SUPER_ADMIN_PASSWORD` | seed | dev/ops | **no: add** |
| `DEMO_PASSWORD` | demo seed | dev | **no: add** |
| `SENTRY_DSN` (or chosen tool, OQ-07) | error tracking | launch | **no: add** |
| `ALERT_EMAIL` | where R-01 alerts go | launch | **no: add** |

## 5. Quality requirements (technical)

NFR-01..NFR-15 in the PRD are the targets. How each is met:

| NFR | Mechanism |
|---|---|
| NFR-01 isolation | DB-backed suite generated from the RLS table x roles (T-030..T-033); production on `clinix_app` (FR-112) |
| NFR-02/03 speed | Server-render lists with pagination; indexes on `(clinic_id, ...)` per query; no client fetch waterfalls; image/3D lazy-loaded; measured by Lighthouse CI on Today, Patients, Checkout |
| NFR-04 recovery | Neon PITR window confirmed; restore drill documented in `docs/ops/runbook.md` |
| NFR-05 availability | uptime check on `/` and `/api/health`; alerts to `ALERT_EMAIL` |
| NFR-06 security | headers in `next.config.ts` (exists) verified by test; CSP without `unsafe-eval` in production; `npm audit` gate |
| NFR-07 privacy | service worker caches no HTML of authenticated pages; no personal data in logs/events (scrub function tested) |
| NFR-08 audit | each write service has a test asserting the audit row |
| NFR-09 money | vector tests T-050..T-056; property test: totals equal sum of lines minus discounts, never negative |
| NFR-10 accessibility | axe checks in e2e on every screen; manual keyboard pass in Quality screen audit |
| NFR-11 jobs | measured with 50 seeded clinics; alerts on failure |
| NFR-12 coverage | CI step fails when a service write has no DB-backed test (script lists writes vs tests) |

## 6. Integrations and fallbacks

| Integration | Use | Fallback when down |
|---|---|---|
| PayMongo | subscription checkout, payment-link renewals (Mode A), webhooks; Subscriptions API for cards/Maya (Mode B, Should, OQ-02) | nothing is charged; user sees clear message; no lock caused by our outage (X-04); R-01 alert |
| Resend | all email | `failed` status in logs, UI message for auth emails, retry button, alert on failure rate |
| Gemini / Anthropic | assistant | next provider, then rules only |
| Vercel registrar API | domains | `needs_review` on S-83 |
| Neon | database | error page with retry; no partial writes (single transaction per action) |

PayMongo facts that drive the design (verify in the live dashboard, FR-115): hosted checkout and payment links accept GCash, Maya, cards; Subscriptions product supports cards (Visa/Mastercard) and Maya only and needs enablement by PayMongo support; first subscription payment must be made within 24 hours; failed charges retry three times daily then mark unpaid. GCash recurring is not documented, so Mode A (payment link) is the guaranteed path.

## 7. Operations

| Area | Requirement |
|---|---|
| Environments | local, Vercel preview (own Neon branch), production. Preview never uses production DB or live PayMongo keys (test keys only) |
| CI | GitHub Actions on pull request: install, tsc, eslint, test, build, audit; migrations check (generated SQL matches schema) |
| Deploy | merge to main deploys to production; migrations applied before deploy by the owner procedure in AGENTS.md; rollback = Vercel promote previous deployment; DB changes are additive first (expand, then contract in a later release) |
| Backups | Neon PITR window recorded; quarterly restore drill to a branch |
| Monitoring | error tracking client+server (no personal data), uptime checks, cron failure alert within 15 minutes, webhook failure alert |
| Secrets | in Vercel only; rotation procedure in runbook; BETTER_AUTH_SECRET rotation requires re-entering AI keys |
| Logs | structured, no personal data, no bodies, no tokens |
| Support runbook | owner locked out, wrong lock, double payment, failed domain, restore from backup, privacy request: `docs/ops/runbook.md` |

## 8. Boundaries for builders

Always: follow AGENTS.md; read the SCHEMA permission matrix before touching an action; write the test with the change; run the five gates (section 3); say what was not verified.

Ask first: new dependency; schema change not in SCHEMA section 8; changing a permission cell; changing money rules or plan prices; touching `proxy.ts`, auth config, or RLS policies; anything that sends real email/SMS or real money.

Never: hard-delete clinical or financial rows; bare `db` for tenant data; trust `Host`; put secrets or personal data in logs, client bundles or the repo; weaken a security header, rate limit or check to make a task pass; claim a check passed that was not run; deploy to production with open High/Critical findings from Quality.

## 9. Change log

| Date | Change |
|---|---|
| 2026-10-10 | First version |
