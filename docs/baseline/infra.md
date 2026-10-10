# Clinix PH - Infrastructure, Integrations and AI Assistant Inventory

Source: /home/claude/work/hb (read-only; no repo file modified). Facts below are read from code unless marked UNVERIFIED. "Verified" here means covered by a unit test in the repo; nothing was executed against a live provider by this inventory.
Package name is `healthbridge`; product is "Clinix PH" by DataBridgeSol. node_modules is not installed in the clone, so versions come from package-lock.json.

## 1. Stack (package.json, installed version from package-lock.json)

| Dependency | Installed | Used for in THIS repo |
|---|---|---|
| next | 16.3.6 | App Router, Server Actions, route handlers, `proxy.ts` (replaces middleware), `after()`, `app/manifest.ts`, security headers |
| react / react-dom | 19.2.4 | UI |
| better-auth | 1.7.5 | Email+password (verification required), Google/Apple/Facebook OAuth (optional), `oneTimeToken` plugin (custom-domain session handoff), cross-subdomain cookie, `nextCookies`; its `verifyPassword` is reused for assistant step-up |
| drizzle-orm | 0.45.3 | Postgres ORM; all queries via `withTenant/withAccount/withOrder/withPlatformAdmin...` helpers in `src/server/db/client.ts` |
| drizzle-kit (dev) | 0.31.11 | `db:generate/migrate/push/studio`; 21 SQL migrations (0000-0020) |
| pg | 8.23.0 | Node-postgres Pool (max 8) in db client and seed scripts |
| zod | 4.6.5 | Validation at every action/handler, assistant tool inputs (`z.toJSONSchema` for model tool defs), provider response parsing |
| @anthropic-ai/sdk | 0.131.0 | Claude layer of the assistant (`src/server/agent/providers/anthropic.ts`, key check in `verify.ts`) |
| @google/genai | 2.27.0 | Gemini layer of the assistant (`providers/gemini.ts`, key check) |
| lucide-react | 1.48.0 | Icons (33 files) |
| three | 0.186.1 | Only `src/components/clinic/tooth-chart-3d.tsx` (3D dental chart); `@types/three` 0.186.0 dev |
| tailwindcss + @tailwindcss/postcss | 4.3.2 | Styling |
| typescript | 5.9.3 | Strict TS |
| eslint / eslint-config-next | 9.39.5 / 16.3.6 | Lint |
| vitest (dev) | 3.2.7 | Unit tests; config includes only `src/**/*.test.ts` |
| @types/node / react / react-dom / pg | 20.19.43 / 19.2.17 / 19.2.3 / 8.23.1 | Types |
| @neon/config | 1.5.0 | Only `neon.ts` (`defineConfig({})`, an empty config) |
| **drizzle-zod** | 0.8.3 | **UNUSED**: zero imports in app/src/components/scripts |
| **@neon/env** | 1.3.4 | **UNUSED**: zero imports anywhere |

Not present (do not assume): Stripe SDK (but `subscriptions.stripe_customer_id/stripe_subscription_id` columns exist and are never written), Playwright, TanStack Query, any queue/job library, any storage/S3 library, any Sentry/logging SDK, any PayMongo/Xendit/Resend/Vercel SDK (all called with raw `fetch`).

Infra config: `vercel.json` = region `sin1` + one cron. `neon.ts` = empty. DB = Neon Postgres. Hosting = Vercel (domain purchase assumes a Vercel Pro team).

## 2. Environment variables

`.env.example` contains no secret values (all secrets blank; only URL, sender address, FX rate, margin, daily limit have values). `.gitignore` ignores `.env*` except `.env.example`. No real-looking secrets found.

| Name | Purpose | Read in | Required? |
|---|---|---|---|
| BETTER_AUTH_SECRET | better-auth signing; ALSO the root key for secret-box AES-GCM (HKDF) and the assistant step-up unlock cookie HMAC | better-auth (implicit), `secret-box.ts`, `step-up.ts` | Required. Rotating it breaks stored AI keys (must re-paste) and invalidates unlock cookies |
| BETTER_AUTH_URL | Base URL; fallback origin for links/checkout return URLs when subdomains are off | `clinic-host.ts`, `actions/domain.ts`, better-auth | Required (prod) |
| DATABASE_URL | Runtime DB. Must be the restricted `clinix_app` role in prod for RLS to bite | `db/client.ts`, drizzle.config | Required |
| DATABASE_ADMIN_URL | Owner connection for migrations + seeds only; never in deployed app | drizzle.config.ts, seed scripts | Optional (dev/ops) |
| GOOGLE_/APPLE_/FACEBOOK_CLIENT_ID + _CLIENT_SECRET | Social sign-in; button shown only when both set | `auth.ts` (`process.env[`${prefix}_CLIENT_ID`]`) | Optional |
| RESEND_API_KEY, EMAIL_FROM | All transactional email | `email.ts` | Required in practice (sign-up cannot verify without it; `sendEmail` throws if unset) |
| CRON_SECRET | Bearer secret for `/api/cron/reminders` | cron route | Required for reminders (route returns 503 if unset) |
| NEXT_PUBLIC_CLINIX_URL | Where landing "Clinix PH" buttons point | `lib/constants.ts` | Optional |
| CLINIC_SUBDOMAINS | `"on"` enables subdomain routing, admin host, cross-subdomain cookies | `clinic-host.ts` | Optional but prod-critical. **Missing from .env.example** |
| VERCEL_API_TOKEN, VERCEL_TEAM_ID, VERCEL_PROJECT_ID | Registrar API (availability, price, buy, attach domain) | `registrar.ts` | Optional (domain checkout hidden unless all set + a payment provider) |
| DOMAIN_REGISTRANT | JSON registrant contact (DataBridgeSol) for every domain bought | `registrar.ts` | Optional; only needed at purchase time |
| USD_PHP_RATE (60), DOMAIN_MARGIN (0.1) | Domain price -> PHP centavos | `domain-orders.ts` | Optional, defaulted |
| PAYMONGO_SECRET_KEY, PAYMONGO_WEBHOOK_SECRET | PayMongo checkout + webhook HMAC | `payments/paymongo.ts` | Optional (both needed for provider to count as configured) |
| XENDIT_SECRET_KEY, XENDIT_CALLBACK_TOKEN | Xendit invoices + callback token | `payments/xendit.ts` | Optional (both needed) |
| GEMINI_API_KEY, ANTHROPIC_API_KEY | AI keys; env is the FALLBACK, a key pasted in /admin/ai-settings (encrypted in DB) wins | `platform-secrets.ts` | Optional |
| GEMINI_MODEL (default `gemini-2.5-flash`), ADMIN_AGENT_MODEL (default `claude-opus-5-5`) | Model override; ADMIN_AGENT_MODEL also applies to the clinic assistant despite its name | providers, `verify.ts` | Optional. Default model IDs UNVERIFIED against live APIs |
| AGENT_DAILY_AI_LIMIT (100) | AI answers per user per feature per Manila day | `agent-usage.ts` | Optional |
| SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME, SUPER_ADMIN_PASSWORD | Seed script (email defaults to the owner's gmail if unset) | `seed-super-admin.mjs` | Optional. **Missing from .env.example** |
| DEMO_PASSWORD | Seed demo clinic password | `seed-demo-clinic.mjs` | Optional. **Missing from .env.example** |
| NODE_ENV | CSP dev relax, SW registration only in production | next.config.ts, pwa-register.tsx | Implicit |

Not an env var but a deployment dependency: `.env.example` has no `STRIPE_*`, no storage, no Sentry.

## 3. Route handlers and webhooks (`app/api/**`)

| Path | Method | Auth | Rate limit (Postgres-backed, shared across instances) | Idempotency / notes |
|---|---|---|---|---|
| /api/auth/[...all] | GET, POST | better-auth. Per-path limits via `hooks.before`: sign-in 30/15min/IP + 10/15min/email; sign-up 5/h/IP; social 30/15min/IP; send-verification 10/h/IP + 3/h/email; request-reset 10/h/IP + 3/h/email; reset-password 10/15min/IP. Other routes: better-auth built-in limiter | as left | n/a |
| /api/webhooks/[provider] (`paymongo`, `xendit`) | POST | Unknown/unconfigured provider -> 404. PayMongo: `Paymongo-Signature` HMAC-SHA256 over `t.rawBody`, 5-min timestamp tolerance, test (`te`) vs live (`li`) signature chosen by body `livemode`. Xendit: `x-callback-token` constant-time compare. Signature checked before acting; payload amount never trusted, `confirmPaid` re-reads provider API | 300/min per IP (x-forwarded-for) per provider | Returns 200 immediately and runs `fulfillPaidOrder` in `after()`. Guarded status transitions (`pending_payment -> paid -> purchasing -> active`) make duplicate deliveries harmless. Bad signature/body -> 400. Fulfilment errors after 200 are NOT retried by the provider |
| /api/cron/reminders | GET | `Authorization: Bearer $CRON_SECRET`, constant-time; unset secret -> 503; mismatch -> 404 | none | `reminder_log` unique (appointment, kind, channel) claim row; recalls only picked when `pending`. `maxDuration` 300 |
| /api/admin/agent | POST | Verified-email session + any platform role (404 otherwise); `canPropose` only for super_admin | 30 / 10 min / user | Body: 1-20 messages, each <=4000 chars, last from user |
| /api/admin/agent/confirm | POST | Super admin re-checked at confirm time | 30 / 10 min / user | Guarded `pending -> executed` update; 15-min TTL; owner-of-proposal only |
| /api/clinic/agent | POST | `getAgentClinic()` (clinic from session+host, never body); owner only; `clinicAiAccess` (account grant + company-wide patient-data switch) else 403 | 30 / 10 min / user | Same body limits |
| /api/clinic/agent/confirm | POST | Same + access re-checked; step-up (see section 5) | 40 / 10 min / user; password attempts 5 / 15 min | Guarded `pending -> executed`; 10-min TTL; daily executed caps per risk (create 60, edit 40, delete 5) per clinic |
| /api/clinic/export | GET | Owner only (`?kind=` whitelist) | 20 / h / user | `Cache-Control: no-store`, CSV attachment |
| /api/clinic/import-template | GET | Public (no patient data; owner also gets own custom field columns) | none | n/a |
| /api/handoff | GET | `?token=` one-time token (hashed at rest, 1-minute expiry, server-initiated only) accepted only on a host that exists in `domain_lookups`; strips `Domain=` from cookie so it is host-only | none | Token single-use via better-auth |

Everything else is Server Actions (`src/server/actions/`). No Stripe webhook. No patient-payment webhook. `proxy.ts` (not middleware) does host routing only and explicitly is not authorization.

## 4. Integrations

| Integration | What exists | Failure / fallback | Verified vs unverified |
|---|---|---|---|
| **Resend email** (raw fetch to api.resend.com) | 7 templates: verify email, password reset, platform-staff invite, clinic staff invite, patient portal invite, appointment reminder (day-before), recall reminder. HTML escaped in `emails/layout.ts`; reminders carry no clinical detail | Missing key/from -> throws. Auth emails sent in `after()` and swallowed to a log (`deliver`), so a failed verification/reset email is silent to the user. Platform invite returns `emailed:false` for a manual resend. Reminder failures stored as `failed` in `reminder_log` | Template/schema tests only (platform-invite, staff-invite). No test of `sendEmail`, never exercised live by this inventory |
| **PayMongo** (GCash, Maya, card, GrabPay, QR Ph) | Hosted checkout session (`/v1/checkout_sessions`), webhook `checkout_session.payment.paid`, `confirmPaid` reads payments from the session | Throws on non-2xx; checkout failure -> "Nothing was charged" message | Webhook signature (good, tampered, missing, stale) unit-tested. `createCheckout` / `confirmPaid` against the real API: UNVERIFIED (no mocked HTTP test either) |
| **Xendit** (cards, bank, e-wallets) | Invoice (`/v2/invoices`, 24h expiry), callback token, `confirmPaid` | Same | Callback-token tests only. Live calls UNVERIFIED |
| **Vercel registrar/domains** (raw fetch api.vercel.com) | Availability, price, buy (`autoRenew:true`, `expectedPrice` guard), attach `domain` + `www` (308 redirect) to project | Errors thrown as `RegistrarError`; after payment any failure -> order `needs_review` with reason; listed in admin assistant ("domain orders needing review") | `normalizeDomain` / `candidateDomains` unit-tested. Buy/attach flow UNVERIFIED live; `fulfillPaidOrder` untested |
| **Gemini** (layer 2) | gemini-2.5-flash default; function-calling loop, max 8 steps, 4096 output tokens | Any thrown error (quota/outage/bad key) falls to next provider | Loop unit-tested with fake client; live UNVERIFIED |
| **Anthropic** (layer 3) | `claude-opus-5-5` default (env-overridable), streaming, `effort: medium`, max_tokens 16000, 8 steps; handles refusal / max_tokens | Throws only if every provider failed -> route returns 502 "unavailable" | Loop unit-tested with fake client; live UNVERIFIED; default model ID not verifiable offline |
| **Cron** | One job: `0 1 * * *` UTC (= 09:00 Manila) -> `/api/cron/reminders` | A failing run just logs; next day continues. No alerting | Not tested |
| **Social OAuth** | Google, Apple, Facebook via better-auth | Button hidden unless both vars set | Untested |

### Payment flows that EXIST
1. **Onboarding "own-domain" checkout** (only when registrar + >=1 provider configured): one order = first month of the plan (PHP 1,490 flat, `PLAN_FIRST_MONTH_CENTAVOS`) + 1 year of a domain priced `ceil(usd * rate * (1+margin))` pesos. On confirmed payment: buy domain, attach to Vercel, insert `domain_lookups`, set `subscriptions` to `active`, monthly, period end = now + 30 days.
2. **Patient payments inside a clinic** (`billing.ts`): manual ledger only. `payments.method` in cash/gcash/maya/card/hmo, entered by staff, official receipt (OR-) and payment receipt (PR-) numbering, installments, void, no gateway.

### Payment flows that DO NOT exist
- Plan checkout without a domain purchase (no way to pay for a subscription alone).
- Recurring/subscription renewal: nothing charges after the first 30 days, nothing moves `active -> past_due`, nothing expires a trial. `currentPeriodEndsAt`/`trialEndsAt` are display values.
- Enforcement of subscription state: grep shows `subscriptions` is read only for display (`workspace.ts`, `tenants.ts`); no gate checks `trialing` expiry, `past_due` or `masterlocked` on clinic access. Locking a tenant (assistant `set_tenant_status`) only changes the label; verify before relying on it.
- Tier/plan limits beyond `clinicSlotLimit` (no feature or AI entitlements per plan).
- Refund tooling, invoices for the SaaS subscription (client "Invoice history" table is empty-state UI), Stripe (columns unused).
- Domain renewal pass-through: domain bought with `autoRenew:true` on DataBridgeSol's Vercel team, but the client is charged for year 1 only; year-2 renewal cost lands on the company with no billing path.
- Abandoned checkouts: `pending_payment` is in the unique "live order" index and nothing sets `expired`, so an abandoned checkout locks that domain name for everyone indefinitely.
- Recovery job for orders stuck in `paid` / `purchasing` (e.g. process dies mid-fulfilment); only `needs_review` is surfaced.
- Company-admin Billing page, Support, Feedback, Audit, Modules and admin home still render `src/lib/mock-data/*` (billing KPIs are fake).

## 5. AI assistant

Two assistants share `runAssistant` (`agent/assistant.ts`): company-admin (`/admin/assistant`, feature `admin_assistant`) and clinic-owner (`/clinix-ph/admin/assistant`, feature `clinic_assistant`).

**Layers (cheapest first):**
1. Rules (`rules.ts`, `clinic-rules.ts`): regex matchers, question <=140 chars, skipped if it contains a change verb. Calls tools directly, no model, full (unredacted) values. Logged as `layer='rule'`.
2. Gemini (if a key exists, DB-pasted preferred over env).
3. Claude (second provider in chain; used when Gemini throws, not when Gemini answers badly). If no key: static "needs the AI layer" message. If daily AI cap hit: limit message, rules still work.

**Safety design:** tools get only zod-validated args (no tenant/user/SQL from model); tool output wrapped in `<tool_data>`, truncated at 20,000 chars, emails redacted to `j***@host`; clinic phones masked to last 3 digits; error detail hidden from the model; system prompts forbid medical advice; max 8 model steps. Patient names, MRNs, ages, appointment data DO go to Gemini/Anthropic (only emails and phones are masked) - gated by (a) account grant `accounts.ai_assistant_enabled` set by company admin and (b) company-wide `allow_patient_data_ai` setting that the founder must confirm.

**Confirm-first writes:** every write is a `propose_*` tool that only inserts an `agent_actions` row (kind, validated args, summary, TTL). Nothing runs until the same user posts `confirm`; args re-validated at confirm; atomic `pending -> executed` claim; access and role re-checked at confirm (a demotion or revoked grant kills pending proposals); audit via action row.
- Admin actions (super_admin only): invite_admin, set_staff_active, set_tenant_status (masterlocked/active), set_tenant_ai_access, change_tenant_tier. 15-min TTL. No password step-up.
- Clinic actions (18 kinds): create/update/archive/restore patient; book/reschedule/change status of appointment; create/update/archive/restore service; create inventory item, receive stock, record stock use; file claim, set claim status. Receipts/payments/invoices are read-only to the assistant. No permanent delete exists. 10-min TTL.
- **Step-up (clinic):** create = none; edit = password once, then httpOnly `agent_unlock` cookie (HMAC, 10 min, path /api/clinic, SameSite strict, secure); archive = password every time + type the MRN (or service name). Wrong-password limiter 5/15 min; social-only accounts (no password) cannot pass step-up, so they cannot edit/archive via assistant. Daily executed-change caps per clinic: create 60, edit 40, delete 5.

**Usage metering (`agent-usage.ts`, table `agent_usage`):** one row per answer: userId, feature, layer (rule/ai), provider, model, input/output tokens. No text stored.

| Question | Answer |
|---|---|
| Per-plan monthly cap today? | **No.** Only one cap exists: `AGENT_DAILY_AI_LIMIT` (env, default 100), global, per user per feature per Manila calendar day, counting AI calls (not tokens). Not tied to tier, not monthly, not per clinic/account. |
| Usage meter? | Partial. Owner/admin assistant page shows today's `aiCalls`, `ruleAnswers`, `tokens`, `limit` for the signed-in user only (`usageToday`). Data to build more is stored (tokens, provider, model, timestamps). |
| Per-clinic usage view for platform admin? | **No.** No query aggregates by clinic/account/month (`agent_usage` has `user_id`, no `clinic_id` / `account_id`; mapping needs a join through clinic_staff/accounts). `/admin/ai-settings` shows key source + last4 and the global switch, not usage. No cost estimation. |
| Token-based cap / budget / alert? | No. Step cap (8) and `max_tokens` bound a single request only. |
| Per-tenant on/off? | Yes: `accounts.ai_assistant_enabled`, toggled by super admin (also via the admin assistant). |
| Race on cap | `usageToday` then run is not atomic; concurrent requests can exceed the cap slightly. Failed (all-providers-down) requests record no usage. |

## 6. Reminders (daily cron)

- Trigger: Vercel Cron `0 1 * * *` UTC (09:00 Asia/Manila), GET `/api/cron/reminders`, `Authorization: Bearer $CRON_SECRET`.
- Step 1 `runDailyReminders`: for every clinic with `remindersEnabled=true`, find appointments with status requested/confirmed starting within tomorrow (clinic timezone) whose patient has an email and is not already `sent`; cap 200 per clinic per run; send "day before" email sequentially. Claim row in `reminder_log` first (unique per appointment+kind+channel; a `failed` row may be re-claimed, a `sent` row never). Result stored sent/failed with <=200-char error.
- Step 2 `runDailyRecalls`: same clinics; recalls with status `pending` and due within 7 days (limit 100/clinic); email, then mark `notified`.
- Content: clinic name, phone, date/time, service name, link to clinic origin. No clinical detail. Email only: no SMS/push.
- Gaps: clinics processed sequentially in one function (300 s max) with no pagination or fan-out; failed reminders are retried only by manual action because the window is only "tomorrow"; no alert on cron failure; no per-clinic send time; recall email send then `notified` update is not atomic (crash between = duplicate next day); no test of any of this (only `recallTiming` pure fn).
- Staff can also send single reminders manually (audited when actor present).

## 7. PWA / offline

- `app/manifest.ts`: built per host (admin host gets "DataBridgeSol Admin"); standalone; icons 192, 512, maskable 512 in `public/icons/`.
- `public/sw.js` (VERSION v1): registered only in production (`pwa-register.tsx`, `updateViaCache:none`); `/sw.js` served `no-cache` with `Service-Worker-Allowed: /`.
  - Precaches only `/offline.html`, `icon-192.png`, `icon-512.png`.
  - Navigations: network-first, no caching; on failure serve `/offline.html`.
  - Cache-first only for `/_next/static/*` and `/icons/*` (public build assets).
  - Ignores non-GET, cross-origin, and everything under `/api/`; all other requests (including RSC/data fetches) go to the network untouched.
  - **Verified: no patient data is stored.** No page, API response, or authenticated request is ever put in Cache Storage. Unit test (`service-worker.test.ts`) asserts a failed navigation caches nothing, a successful navigation caches nothing, and only static assets/icons are cached. Caveat: the browser's normal HTTP cache is outside the SW's control (relies on Next's default no-store for dynamic pages; `/api/clinic/export` sets `no-store` explicitly).
  - Writes are never queued; no background sync; offline = read nothing, save nothing (deliberate, RA 10173).
- `public/offline.html`: standalone page, retry button, auto-reload on `online` event, privacy note.
- `src/components/console/offline-banner.tsx`: sticky "You're offline. Nothing can be saved until you reconnect." via `navigator.onLine` in console shell.
- Missing: push notifications, install prompt UI (not checked), offline drafting.

## 8. Security headers, config, secrets

`next.config.ts` (all routes): CSP static (no nonce) `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (+`unsafe-eval` in dev); `style-src 'self' 'unsafe-inline'`; `img-src 'self' blob: data:`; `font-src 'self'`; `connect-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'` + accounts.google.com, appleid.apple.com, facebook.com; `frame-ancestors 'none'`; `upgrade-insecure-requests` (prod). Plus HSTS 2 years includeSubDomains (no preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` camera/mic/geo/payment off, `poweredByHeader:false`. Weakness: `'unsafe-inline'` scripts means CSP gives limited XSS protection. Note `connect-src 'self'` means any future client-side call to a third party (e.g., a payment SDK) needs a CSP change.

Secrets at rest (`secret-box.ts`): AES-256-GCM, random 12-byte IV, key = HKDF-SHA256(BETTER_AUTH_SECRET, salt "databridgesol-secret-box", info "platform-secrets-v1"), format `v1:iv:tag:ciphertext`. Stores only Gemini/Anthropic keys (`platform_secrets`; only last4 shown). No key versioning/rotation path other than re-pasting; payment and registrar keys are env-only.

Other controls seen: rate limits in Postgres (`rate_limits`, hashed key, atomic upsert); webhook rate limit; cookies httpOnly/secure/strict for unlock cookie; cross-subdomain session cookie scoped to `.databridgesol.space` only when `CLINIC_SUBDOMAINS=on`; email HTML escaping; CSV export owner-only + no-store; platform admin pages 404 for non-staff; admin host path allow-list in `proxy.ts`.

Tenant isolation / RLS: RLS policies exist on tenant tables (migrations 0001, 0006, 0018 nullif guard). `clinix_app` (NOBYPASSRLS, no update/delete on `audit_logs`) is created and tested but `docs/db-app-role.md` (2026-10-04) and AGENTS.md say the **cutover was pending**: until `DATABASE_URL` is that role, the app runs as `neondb_owner` and RLS is not enforced; app-level `WHERE clinic_id` is the only protection. Current production state is UNVERIFIED from the repo. Global tables with no RLS by design: platform_secrets, platform_settings, agent_actions, agent_usage, rate_limits, platform_admins, domain_lookups (public SELECT). These are read through bare `db` in services (`platform-secrets`, `agent-usage`, `agent-actions`, `custom-domains`, `rate-limit`, `platform-staff`), which technically deviates from the AGENTS.md rule "never import bare db in a service for tenant data" (acceptable since they are non-tenant tables).

## 9. Tests

Vitest, 34 files, about 153 `it` cases, all pure/unit: no test imports `db/client`, so nothing touches a database.

| File | Covers |
|---|---|
| src/lib/csv.test.ts | CSV generation/escaping |
| src/lib/dental-chart.test.ts | FDI numbering, tooth states, chart entries, baby teeth, code guessing |
| src/lib/dental-soap.test.ts | SOAP draft generation |
| src/lib/discounts.test.ts | Discount rules |
| src/lib/installments.test.ts | Installment schedule/status |
| src/lib/invoice-totals.test.ts | VAT/discount/statutory totals |
| src/lib/patient-fields.test.ts | Custom patient field logic |
| src/lib/plan-totals.test.ts | Treatment plan summary/status transitions |
| src/lib/schemas/{appointments,clinical-note,invoice,patient-import,patient-portal,reminders,service}.test.ts | Zod schemas, calendar helpers, receipt numbering, CSV patient import parsing |
| src/lib/service-worker.test.ts | Real `sw.js` run in a VM: offline fallback, no page caching, static-only caching, API bypass |
| src/server/agent/anthropic.test.ts | Claude tool loop with canned replies |
| src/server/agent/providers.test.ts | Provider chain fallback, `redactEmails`, Gemini loop |
| src/server/agent/rules.test.ts, clinic-rules.test.ts | Rules layer routing, change-word bypass, patient change schema, price questions |
| src/server/services/activity, claims, clinic-app, inventory, overview, recalls (timing only), tenant-summary .test.ts | Pure helpers: activity descriptions, claim logic, day bounds / appointment workflow / timezone, stock status, overview, recall timing, tenant summarisation |
| src/server/services/patient-fields.test.ts | Field-permission rules |
| src/server/services/payments/webhooks.test.ts | PayMongo signature (valid/tampered/missing/stale) and Xendit token (valid/wrong/missing/non-paid) |
| src/server/services/platform-invite.test.ts, staff-invite.test.ts | Invite email composition, schemas, `clinicLinkOrigin` |
| src/server/services/registrar.test.ts | Domain normalization / candidates |
| src/server/services/secret-box.test.ts | Encrypt/decrypt, tamper |
| src/server/services/step-up.test.ts | Unlock token issue/validate/expiry |

NOT covered: `fulfillPaidOrder`/`startDomainCheckout`/pricing math; webhook route handler; cron route and `runDailyReminders/Recalls`; `sendEmail`; `confirmClinicAction`/`confirmAction` (step-up gating, caps, double-confirm); `checkOwnPassword`; `consumeRateLimit`; `runAssistant` cap logic; `agent-usage`; `clinicAiAccess`; billing `checkout/recordPayment/voidInvoice` DB logic; auth hooks; `proxy.ts` host routing; `/api/handoff`; tenant isolation / RLS (no DB tests at all); registrar HTTP calls; all UI components. **No e2e tests**: Playwright is mandated by AGENTS.md ("Playwright for critical e2e") but is not installed and no config exists. No CI config seen in the repo (no .github). Build/typecheck/lint status was not run by this inventory.

## 10. Conflicts: docs/architecture.md vs AGENTS.md vs code

docs/architecture.md is a generic template for a different app (never adapted). AGENTS.md itself says not to follow its fetch/TanStack pattern.

| Topic | architecture.md says | AGENTS.md says | Actual code |
|---|---|---|---|
| Data fetching / mutations | Route Handlers + TanStack Query + `src/services/` + `src/hooks/api/` | Server Actions by default; `app/api/*` only for webhooks/OAuth/non-Next clients | Server Actions + RSC. No TanStack, no `src/services/client`, no `src/hooks/api`. But `app/api` also hosts the assistant, confirm, export, import-template, cron, handoff (AGENTS.md's "only webhooks/OAuth" list is incomplete; these are justified fetch/download/cron cases) |
| Route protection | `middleware.ts`, session cookie check | "Middleware is coarse"; auth in `src/server/auth.ts` | `proxy.ts` (Next 16) does host routing only, no auth; auth in `src/server/auth.ts` and per-page/action checks |
| Source layout | `src/app/`, `src/lib/db/` | Target `src/app`; currently root `app/` | Root `app/`, `components/` (root) AND `src/components/`; `src/server/db/schema/` is a folder (AGENTS.md layout shows `db/schema.ts`) |
| Response envelope | `{ success, data, message }` | Not specified | Handlers return `{ error }` or ad hoc objects; no envelope |
| Auth | Generic signin route, `session_token` cookie, `AUTH_SECRET` | better-auth, httpOnly cookies | better-auth with `BETTER_AUTH_SECRET`; cookie names are better-auth's |
| Env vars | `AUTH_SECRET`, `AUTH_COOKIE_NAME`, `OAUTH_*`, `STORAGE_*` | n/a | None of these exist; real set is in section 2 |
| Storage/uploads | Presigned S3/R2 storage service | File upload rules | No file storage or upload feature in the repo |
| Users/roles | `super_admin/admin/guest`, `status` | Roles per tenancy | Platform roles (`super_admin` + staff) in `platform_admins`; clinic roles owner/practitioner/assistant in `clinic_staff` |
| Deployment | Any Node host | Neon + Vercel implied | Vercel only (`vercel.json`, Vercel registrar API) |
| RLS | not mentioned | "Every new table gets RLS"; says app still on owner role until cutover | Policies exist; enforcement depends on unverified `DATABASE_URL` cutover. Exceptions: global tables listed in section 8 have no RLS (each has a written reason in its migration) |
| AGENTS.md "Webhooks: rate-limit, idempotent, re-confirm with provider" | n/a | binding | Implemented for payments (section 3) |
| AGENTS.md "Seeders never put a credential in the repo" | n/a | binding | Honoured (passwords from env or generated); `seed-super-admin.mjs` hardcodes a default admin EMAIL (not a credential) |
| AGENTS.md "Delete mock exports when moving to real data" | n/a | binding | Not met: admin Billing/Support/Feedback/Audit/Modules/home still on `src/lib/mock-data` |
| AGENTS.md "Tests ... Playwright for e2e", "unit test every webhook/permission boundary" | n/a | binding | Webhook signature tested; permission boundaries (confirm flows, tenant access) and e2e are not |
| AGENTS.md "Logging: never log personal data" | n/a | binding | Agent logs tool names and token counts only; email errors may include provider response text (<=300 chars) |
| `.claude/skills/*`, `.cursor/rules` referenced | n/a | Referenced paths | `.claude`, `.cursor`, `.agents` dirs exist (not audited here) |
| Unused deps | n/a | "No dead code" | `drizzle-zod`, `@neon/env` unused; `neon.ts` empty config; `subscriptions.stripe_*` columns unused; `domain_orders` status `expired` never set |

## Top gaps and risks (summary)
1. No subscription lifecycle: no renewal charge, no trial expiry, no past_due transition, and no access gate on masterlocked/expired (only display); only first-month-with-domain payment exists.
2. AI usage: only a global per-user daily count cap (env, default 100); no per-plan or monthly cap, no token/cost budget, no per-clinic usage view for platform admin.
3. RLS enforcement depends on a pending `clinix_app` cutover (unverified).
4. Domain purchase risks: abandoned `pending_payment` locks a name forever; stuck `paid`/`purchasing` orders are never swept; renewals billed to the company; live provider calls unverified; `fulfillPaidOrder` untested.
5. Admin Billing/Support/Feedback/Audit pages are mock data.
6. Failed verification/reset emails are silent; cron has no alerting and runs sequentially (300 s).
7. Zero DB-backed tests and no e2e; patient names/MRNs go to external AI providers (gated by two switches).
8. `.env.example` omits CLINIC_SUBDOMAINS, SUPER_ADMIN_*, DEMO_PASSWORD; two unused dependencies.
