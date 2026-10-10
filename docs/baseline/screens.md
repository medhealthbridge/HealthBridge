# Clinix PH (HealthBridge repo) - Route and screen inventory

Source: /home/claude/work/hb (Next.js App Router, `proxy.ts` instead of middleware). Read-only inventory; nothing in the repo was changed.
Counts: 52 `page.tsx` (51 render UI; `/clinix-ph/app` is a pure redirect), 11 `route.ts`, 4 `loading.tsx`, 0 `error.tsx`, 0 `not-found.tsx`, 0 `global-error.tsx`.
Legend: REAL = reads/writes the database through `src/server/services`; MOCK = static data from `src/lib/mock-data/*` or client-only state.
Check names: `requireUser`, `requirePlatformAdmin`, `requireSuperAdmin`, `requireClinicOwner`, `requireWorkspace`, `requireStaff`, `requireActiveClinic`, `requireActiveClinicOwner`, `requireClinicRole(...)`, `requireOnboardingPending` are all in `src/server/auth.ts`.

---------------------------------------------------------------------------------------------------

## 0. Auth primitives (what "who may open it" means in code)

| Guard | Rule | Failure result |
|---|---|---|
| `requireUser` | session exists AND `emailVerified` | redirect: admin host -> `/admin-login`; custom domain -> `https://clinix.databridgesol.space/clinix-ph/auth`; else `/clinix-ph/auth` |
| `requirePlatformAdmin` | active row in `platform_admins` (role `super_admin` or `staff`) | `notFound()` (404) |
| `requireSuperAdmin` | platform role === `super_admin` | `notFound()` (404) |
| `requireClinicOwner` | owner membership in >=1 clinic | none -> redirect `/clinix-ph/app` if user has any other membership, else `/clinix-ph/onboarding` |
| `requireWorkspace` | = `requireClinicOwner` + loads owner workspace (all clinics, subscription) | as above |
| `requireStaff` | any active `clinic_staff` membership | none -> redirect `/clinix-ph/portal` if user has a patient record (`hasPortalAccess`), else `/clinix-ph/onboarding` |
| `requireActiveClinic` | staff + the clinic for this host (subdomain slug, custom domain, else first clinic) | host clinic not in user's memberships -> `notFound()` (never falls back) |
| `requireActiveClinicOwner` | `requireActiveClinic` and role === owner | `notFound()` |
| `requireClinicRole(a,b)` | `requireActiveClinic` and role in list | `notFound()` |
| `requireOnboardingPending` | verified user with NO owned clinic | owner -> redirect `/clinix-ph/admin` |
| Server Actions | each repeats the guard (see per-screen tables); rate limits via `consumeRateLimit` | returns `{message}` or 404 |

Roles: platform = `super_admin` | `staff`; clinic = `owner` | `assistant` (label "Front desk") | `practitioner`; patient = a user with `patients.portalUserId` (no role row). A patient is NOT a `clinic_staff` role.
Session: better-auth, cookie cache 5 min, cross-subdomain cookie scoped to `.databridgesol.space` only when `CLINIC_SUBDOMAINS=on`. Staff role is re-read from DB on every request (revocation is immediate).

---------------------------------------------------------------------------------------------------

## 1. Host / subdomain routing (`proxy.ts` + `src/lib/clinic-host.ts` + `src/lib/constants.ts`)

`proxy.ts` matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `manifest.webmanifest` and any path ending in png/jpg/jpeg/svg/webp/ico/css/js/woff/woff2/html (so `/offline.html` and `/sw.js` are excluded).
`clinicSubdomainsEnabled()` = env `CLINIC_SUBDOMAINS === "on"`. When OFF (local, Vercel preview) the host checks below that depend on it do nothing and every route is served on every host.

| Host | What proxy.ts does | Code |
|---|---|---|
| `databridgesol.space` (apex / any host not matched below) | passes through. `/` renders `app/page.tsx` (DataBridgeSol landing) | `NextResponse.next()` |
| `clinix.databridgesol.space` (first label `clinix`) | `/` is **rewritten** to `/clinix-ph` (Clinix landing). Works whether or not subdomains are on. All other paths pass through (`/clinix-ph/auth`, `/clinix-ph/onboarding`, ...). Login always happens here (`productAuthUrl()`) | `SUBDOMAIN_ROUTES = {clinix: "/clinix-ph"}` |
| `admin.databridgesol.space` (`isAdminHost`; only when subdomains ON) | `/` rewritten to `/admin`. Allowed prefixes: `/admin`, `/invite`, `/admin-login`, `/api`, `/clinix-ph/auth/reset`. **Anything else is redirected to `/`** (so Clinix sign-in/sign-up, clinic consoles, `/clinix-ph/app` are unreachable here). `requireUser` on this host redirects to `/admin-login`; sign-out redirects to `/admin-login`. Manifest name becomes "DataBridgeSol Admin" / "DBS Admin" | `ADMIN_HOST_ALLOWED` |
| any other host, `/admin...` (subdomains ON) | `/admin` and `/admin/*` return an empty **404**. (Note `/admin-login` and `/invite` are NOT blocked on other hosts: `underPath(pathname,"/admin")` does not match `/admin-login`.) | `new NextResponse(null,{status:404})` |
| `<slug>.databridgesol.space` (single label, not in `RESERVED_SUBDOMAINS`, subdomains ON) | `/` rewritten to `/clinix-ph/admin` (owner console). **Rewrite is routing, not authorization**: `app/clinix-ph/admin/layout.tsx` 404s if the signed-in owner doesn't own that slug; `requireActiveClinic` 404s for staff of other clinics. Staff who are not owners hit the console layout, `requireWorkspace` redirects them to `/clinix-ph/app` -> their role home | `tenantSlugFromHost` |
| custom domain (any host not on suffix, not `localhost`, not `*.vercel.app`; subdomains ON) | `/` rewritten to `/clinix-ph/admin`. Session cookie can't be shared, so login happens on the product host and `/clinix-ph/open-domain` mints a one-time token -> `https://<domain>/api/handoff?token=` -> host-only cookie. `/api/handoff` only works for sold domains (`clinicIdForCustomDomain`) | `isCustomHost` |
| `app.`, `portal.`, `www.`, `api.`, `login.` etc. | **No handling.** These are only in `RESERVED_SUBDOMAINS` (so a clinic can't claim them); there is no app./portal. host mapping. Patient portal lives at `/clinix-ph/portal` on whatever host | - |
| Reserved list (36) | admin api app auth billing blog cdn clinix dashboard demo dev docs ftp help hq imap inbound login mail nlminventory ns1 ns2 pop portal pos register resend send signup smtp staging static status support test www | `constants.ts` |

Console auto-forward (`clinix-ph/admin/layout.tsx`): signed in on a shared-suffix host without a slug, subdomains ON, owner with exactly 1 clinic -> redirect to that clinic's console (`https://<slug>.databridgesol.space/clinix-ph/admin`) or, if it has a custom domain, `/clinix-ph/open-domain`.

### Redirect matrix

| Situation | Where it goes | Where enforced |
|---|---|---|
| Logged out on any protected page | `/clinix-ph/auth` (admin host: `/admin-login`; custom domain: product host auth) | `requireUser` |
| Logged in, opens `/clinix-ph/auth` | `/clinix-ph/admin` (then see next rows) | `auth/page.tsx` |
| Owner, no clinic yet | `/clinix-ph/onboarding` | `requireClinicOwner` |
| Owner with clinic, opens `/clinix-ph/onboarding` | `/clinix-ph/admin` | `requireOnboardingPending` |
| Non-owner staff opens `/clinix-ph/admin/*` | `/clinix-ph/app` -> `/clinix-ph/app/<role>` | `requireClinicOwner` in console layout |
| Staff opens `/clinix-ph/app/<other-role>` | redirect to own `roleHome(clinic.role)` | `app/[role]/layout.tsx` |
| Staff opens `/clinix-ph/app/foo` (unknown role) | 404 | `isAppRole` |
| Staff hits a page their role may not use (e.g. practitioner `/billing`, `/claims`, `/queue`; assistant `/patient-fields`) | 404 (`notFound`) - there is no 403 page | `requireClinicRole` / `queue/page.tsx` |
| Not platform admin opens `/admin/*` | 404 | `requirePlatformAdmin` |
| Platform `staff` opens `/admin/ai-settings` | 404 (and link hidden in nav) | `requireSuperAdmin` |
| Patient (portal user, no staff row) logs in | `/clinix-ph/app` -> `requireStaff` -> `/clinix-ph/portal` | `loginAction` -> `ClinicAppIndex` |
| Patient opens `/clinix-ph/admin` (or `/clinix-ph/auth` while logged in) | `/clinix-ph/onboarding` (**surprise**: `requireClinicOwner` only checks memberships, not portal access; a patient is invited to create a clinic) | `requireClinicOwner` |
| `/clinix-ph/portal` with no patient link | redirect `/clinix-ph/app` (then onboarding for non-staff) | `portal/page.tsx` |
| Social/email sign-in, new user | `/clinix-ph/onboarding`; returning `/clinix-ph/app` | `socialSignInAction`, `loginAction` |
| Unverified email login | stays on `/clinix-ph/auth` with "Verify your email first - we've sent you a new link." + resend (60 s cooldown) | `loginAction` (`EMAIL_NOT_VERIFIED`) |
| Wrong password / non-admin on admin login | same text "Incorrect email or password."; non-staff session is signed out immediately | `adminLoginAction` |
| Rate limited | "Too many attempts. Wait a few minutes and try again." | `AUTH_RATE_LIMITS` |
| **Suspended / locked / past-due / cancelled / trial-expired tenant** | **NOT ENFORCED ANYWHERE.** `subscriptions.status` can be `masterlocked`, set only via the admin AI assistant tool `set_tenant_status` (`agent-actions.ts` -> `setTenantSubscriptionStatus`); its description claims "Locking blocks login" but no code in proxy.ts, auth.ts, any layout or action reads that status or `trialEndsAt` to block. Status is only displayed (`CurrentPlanCard`: Free trial/Active/Past due/Locked/Canceled; `tenants.ts` maps masterlocked -> "Past due") | gap |
| Deactivated staff | `isActive=false` -> no membership -> treated as no clinic (onboarding/portal redirect) | `listActiveMemberships` |
| Deactivated platform staff | `platformRoleOf` returns null -> 404 on /admin; admin login rejects | `platformAdmins.isActive` |
| Offline | service worker serves `/offline.html` for navigations | `public/sw.js` |

---------------------------------------------------------------------------------------------------

## 2. Route map

Data source column: REAL / MOCK / STATIC (no data).

### 2.1 Marketing

| Path | File | Who may open | Otherwise | Data |
|---|---|---|---|---|
| `/` | app/page.tsx (`components/canvas-landing.tsx`) | anyone | - | STATIC (products list in component) |
| `/clinix-ph` (also `clinix.` host `/`) | app/clinix-ph/page.tsx (`components/clinix-landing.tsx`) | anyone | - | STATIC |

### 2.2 Auth

| Path | File | Who | Otherwise | Data |
|---|---|---|---|---|
| `/clinix-ph/auth` (`?mode=signup`, `?role=owner|practitioner|assistant|patient`) | app/clinix-ph/auth/page.tsx | anyone; verified session -> redirect `/clinix-ph/admin` | - | REAL (better-auth) |
| `/clinix-ph/auth/reset` | auth/reset/page.tsx | anyone (also allowed on admin host) | - | REAL |
| `/clinix-ph/auth/reset/confirm` (`?token=` / `?error=`) | auth/reset/confirm/page.tsx | anyone with link | missing token or `error` -> "This link has expired" state | REAL |
| `/admin-login` | app/admin-login/page.tsx | anyone; platform user already signed in -> redirect `/admin` | - | REAL |
| `/api/auth/[...all]` | app/api/auth/[...all]/route.ts | better-auth GET/POST (OAuth callbacks, verify-email, reset-password/:token) | - | REAL |

### 2.3 Onboarding / invites / portal entry

| Path | File | Who | Otherwise | Data |
|---|---|---|---|---|
| `/clinix-ph/onboarding` | onboarding/page.tsx | `requireOnboardingPending` (verified, no owned clinic) | logged out -> auth; already owner -> `/clinix-ph/admin` | REAL (writes workspace) |
| `/invite?token=` | app/invite/page.tsx | anyone with a valid open platform-staff invite token (20-200 chars) | invalid/expired/used -> inline "This invitation is no longer valid..." | REAL |
| `/clinix-ph/join?token=` | clinix-ph/join/page.tsx | anyone with valid clinic-staff invite token | inline invalid message | REAL |
| `/clinix-ph/portal/join?token=` | portal/join/page.tsx | anyone with valid patient invite token | inline invalid message | REAL |
| `/clinix-ph/portal` | portal/page.tsx | `requireUser` + at least one patient record linked to the user | no records -> redirect `/clinix-ph/app` | REAL |
| `/clinix-ph/open-domain` (route.ts) | clinix-ph/open-domain/route.ts | `requireClinicOwner` | no custom domain -> redirect `/clinix-ph/admin` | REAL |
| `/clinix-ph/app` | clinix-ph/app/page.tsx | `requireActiveClinic` | owner -> `/clinix-ph/admin`; else `/clinix-ph/app/<role>` | REAL (redirect only, no UI) |

### 2.4 Owner console `/clinix-ph/admin/*` (layout: `requireWorkspace` = owner of >=1 clinic; every page repeats its own guard)

| Path | File | Guard in page | Data |
|---|---|---|---|
| `/clinix-ph/admin` | admin/page.tsx | `requireActiveClinicOwner` | REAL (`getOverview`) |
| `/clinix-ph/admin/assistant` | admin/assistant/page.tsx | `requireActiveClinic` then `clinicAiAccess` (reasons: role!=owner, not_granted, patient_data_off). **Page itself does not 404 for non-owners; layout already blocks them** | REAL (LLM) |
| `/clinix-ph/admin/patients` | patients/page.tsx | `requireActiveClinicOwner` | REAL |
| `/clinix-ph/admin/patients/[mrn]` | patients/[mrn]/page.tsx | `requireActiveClinicOwner`; unknown MRN -> 404 | REAL |
| `/clinix-ph/admin/appointments` (`?date=YYYY-MM-DD`) | appointments/page.tsx | `requireActiveClinicOwner` | REAL |
| `/clinix-ph/admin/services` (`?view=archived`) | services/page.tsx | `requireActiveClinicOwner` | REAL |
| `/clinix-ph/admin/recalls` | recalls/page.tsx | `requireActiveClinicOwner` | REAL |
| `/clinix-ph/admin/billing` (`?view=balances`) | billing/page.tsx | `requireActiveClinicOwner` | REAL |
| `/clinix-ph/admin/billing/[number]` | billing/[number]/page.tsx | `requireActiveClinicOwner`; unknown -> 404 | REAL |
| `/clinix-ph/admin/inventory` (`?view=archived`) | inventory/page.tsx | `requireActiveClinicOwner` | REAL |
| `/clinix-ph/admin/claims` | claims/page.tsx | `requireActiveClinicOwner` | REAL |
| `/clinix-ph/admin/reminders` | reminders/page.tsx | `requireActiveClinicOwner` | REAL |
| `/clinix-ph/admin/staff` | staff/page.tsx | `requireActiveClinicOwner` | REAL |
| `/clinix-ph/admin/modules` | modules/page.tsx | `requireClinicOwner` | **MOCK** (`CLINIC_MODULES`; toggles are client state only, nothing saved) |
| `/clinix-ph/admin/subscription` | subscription/page.tsx | `requireWorkspace` | REAL plan card; invoice history is a static "No invoices yet" placeholder |
| `/clinix-ph/admin/import-export` | import-export/page.tsx | `requireActiveClinicOwner` | REAL |
| `/clinix-ph/admin/settings` (`?tab=patient-fields|discounts`) | settings/page.tsx | profile tab `requireWorkspace`; other tabs `requireActiveClinicOwner` | REAL |
| `/clinix-ph/admin/activity` (`?type=`) | activity/page.tsx | `requireActiveClinicOwner` | REAL (`listActivity`, latest 100) |
| `/clinix-ph/admin/feedback` | feedback/page.tsx | `requireClinicOwner` | **MOCK** (form never calls the server; `FEEDBACK_CATEGORIES` from mock-data; submit only sets local `sent` + toast) |

### 2.5 Clinic app `/clinix-ph/app/[role]/*` (layout: `isAppRole` else 404; `requireActiveClinic`; `clinic.role !== role` -> redirect to own home)

| Path | File | Guard | Roles that get content | Data |
|---|---|---|---|---|
| `/clinix-ph/app/<role>` | [role]/page.tsx | `requireActiveClinic` | owner*, assistant ("Today"), practitioner ("My schedule") | REAL |
| `.../queue` | queue/page.tsx | `requireActiveClinic`; practitioner -> 404 | owner, assistant | REAL |
| `.../appointments` | appointments/page.tsx | `requireActiveClinic` | all three (practitioner read-mostly, own chair) | REAL |
| `.../patients` | patients/page.tsx | `requireActiveClinic` | all three (practitioner read-only) | REAL |
| `.../patients/[mrn]` | patients/[mrn]/page.tsx | `requireActiveClinic` | all three (see matrix) | REAL |
| `.../recalls` | recalls/page.tsx | `requireClinicRole(owner,assistant,practitioner)` | all three | REAL |
| `.../billing` | billing/page.tsx | `requireClinicRole(owner,assistant)` | owner, assistant | REAL |
| `.../billing/[number]` | billing/[number]/page.tsx | `requireClinicRole(owner,assistant)` | owner, assistant (void owner only) | REAL |
| `.../claims` | claims/page.tsx | `requireClinicRole(owner,assistant)` | owner, assistant | REAL |
| `.../inventory` | inventory/page.tsx | `requireActiveClinic` | all three (view + "Use"; manage = owner) | REAL |
| `.../patient-fields` | patient-fields/page.tsx | `requireClinicRole(practitioner)` | practitioner only (not in nav for others; owner/assistant get 404) | REAL |
*Owner at `/clinix-ph/app/owner` gets the same floor screens as the assistant plus owner controls, and a "Owner console" link. `/clinix-ph/app` router sends owners to the console, not here, after login; they reach `/app/owner` via the console's "Clinic app" button.

### 2.6 Platform admin `/admin/*` (layout `requirePlatformAdmin`; hosts: admin.databridgesol.space in prod)

| Path | File | Guard | Data |
|---|---|---|---|
| `/admin` | admin/page.tsx | `requirePlatformAdmin` | **MOCK** (KPIs, MRR by tier, needs-attention, tenant activity list, ops tiles) |
| `/admin/assistant` | admin/assistant/page.tsx | `requirePlatformAdmin` (propose/confirm = super_admin) | REAL |
| `/admin/tenants` | admin/tenants/page.tsx | `requirePlatformAdmin` (`canManage` = super_admin) | REAL (`listTenants`) |
| `/admin/billing` | admin/billing/page.tsx | `requirePlatformAdmin` | **MOCK** (`BILLING_KPIS`, `TENANTS` demo list, `LAST_BILLING_EVENT`) |
| `/admin/modules` | admin/modules/page.tsx | `requirePlatformAdmin` | **MOCK** (toggle is client state only) |
| `/admin/support` | admin/support/page.tsx | `requirePlatformAdmin` | **MOCK** (`SUPPORT_TICKETS`, `DELIVERY_KPIS`) |
| `/admin/staff` | admin/staff/page.tsx | `requirePlatformAdmin` (manage = super_admin) | REAL |
| `/admin/feedback` | admin/feedback/page.tsx | `requirePlatformAdmin` | **MOCK** (`TENANT_FEEDBACK`; nothing from clinics' feedback form) |
| `/admin/audit` | admin/audit/page.tsx | `requirePlatformAdmin` | **MOCK** (`COMPANY_AUDIT`) |
| `/admin/ai-settings` | admin/ai-settings/page.tsx | `requireSuperAdmin` | REAL |

### 2.7 API route handlers

| Route | File | Who | Notes |
|---|---|---|---|
| POST `/api/admin/agent` | api/admin/agent/route.ts | platform user (any role; verified) else 404 | body `messages` 1-20 items, each 1-4000 chars, last = user; 30 req / 10 min; `canPropose` only for super_admin; 502 on provider failure |
| POST `/api/admin/agent/confirm` | .../confirm/route.ts | super_admin only, else 404 | `{actionId: uuid, decision: confirm|cancel}`; 30 / 10 min |
| POST `/api/clinic/agent` | api/clinic/agent/route.ts | `getAgentClinic` (any staff) + `clinicAiAccess` (owner only, granted, patient-data allowed) else 404/403 | 30 / 10 min; clinic from session+host |
| POST `/api/clinic/agent/confirm` | .../confirm/route.ts | same | `password?` (<=200), `typed?` (<=40, MRN for archive); httpOnly `agent_unlock` cookie 10 min; 40 / 10 min |
| GET `/api/clinic/export?kind=patients|receipts|inventory|claims` | api/clinic/export/route.ts | owner only (else 404) | CSV download, 20 / hour, logged in activity log; 400 unknown kind |
| GET `/api/clinic/import-template` | api/clinic/import-template/route.ts | anyone (no patient data); owner also gets one column per active custom field | CSV |
| GET `/api/cron/reminders` | api/cron/reminders/route.ts | `Authorization: Bearer $CRON_SECRET`; 503 if unset, 404 if wrong | Vercel cron `0 1 * * *` (vercel.json, region sin1): daily appointment reminders + recalls |
| GET `/api/handoff?token=` | api/handoff/route.ts | only on a sold custom domain | one-time token -> host-only session cookie -> `/clinix-ph/admin` |
| POST `/api/webhooks/[provider]` | api/webhooks/[provider]/route.ts | payment provider, signature checked, 300/min per IP | marks domain order paid -> `fulfillPaidOrder` via `after()` |

---------------------------------------------------------------------------------------------------

## 3. Five-state coverage (summary, then per-screen notes)

| State | What exists in code |
|---|---|
| Loading | `loading.tsx` -> `PageSkeleton` (pulse skeleton, `role=status`) ONLY in 3 segments: `app/admin/`, `app/clinix-ph/admin/`, `app/clinix-ph/app/[role]/`. Button-level pending text on every form ("Saving...", "Sending..."). **Missing**: landing pages, auth, reset, onboarding, invite/join, portal, admin-login (no skeleton; portal runs DB queries with none). |
| Empty | Present on nearly every list (text in a Panel). Exceptions listed per screen. |
| Error | **No `error.tsx` / `global-error.tsx` anywhere** -> Next default error screen for any thrown server error. Form errors are inline (`role=alert`). Unknown routes use Next default 404 (**no `not-found.tsx`**). |
| Offline | (a) `public/sw.js` serves `/offline.html` ("You're offline", Try again, auto-reload on `online`) for any navigation that fails; nothing cached except static assets + icons. (b) `OfflineBanner` ("You're offline. Nothing can be saved until you reconnect.") but only inside `ConsoleShell`, i.e. owner console, platform admin, clinic app. **Missing**: banner on auth, onboarding, join pages, portal, landing. No offline queue (by design). |
| No permission | Implemented as `notFound()` (404) or redirect (see section 1). **No 403 screen, no "you don't have access" message.** In-UI the controls a role may not use are hidden rather than disabled (e.g. Void receipt hidden for assistant; header text "Only the owner can void a receipt."). |

Per-screen state table (E=empty, L=loading, X=error, O=offline, P=no-permission; Y=in code, N=MISSING, -=n/a):

| Area | Screens | E | L | X | O | P |
|---|---|---|---|---|---|---|
| Marketing | `/`, `/clinix-ph` | - | N | N | SW offline page only | - |
| Auth | auth, reset, confirm, admin-login | - | N | N (inline only) | SW only | - |
| Onboarding | wizard | - | N (button pending only) | inline | SW only | redirect |
| Invites | invite, join, portal/join | invalid-token message Y | N | inline | SW only | invalid token = message |
| Portal | portal | Y per section ("No upcoming appointments." etc.) | N | N | SW only, no banner | redirect |
| Owner console | all 19 | Y (see per screen) | Y (shared skeleton) | N | Y banner + SW | 404/redirect |
| Clinic app | all 11 | Y | Y | N | Y banner + SW | 404/redirect |
| Platform admin | all 10 | tenants Y; staff N (always has founder); others mock lists never empty | Y | N | Y banner + SW | 404 |

---------------------------------------------------------------------------------------------------

## 4. Screens in detail

Form-state convention: Server Action returns `FormState {message?, fieldErrors?, values?}` (`src/types/form-state.ts`); success usually closes the dialog and shows a bottom toast (`useToast`, 2.4 s popover); failure shows `role=alert` text under the field / at form bottom and re-fills from `values`.

### 4.1 Marketing

**`/` DataBridgeSol landing** (`components/canvas-landing.tsx`, client)
- Purpose: parent-company site. Sections: hero, products (#products), modular (#modular), security (#security), FAQ (#faq), footer.
- Elements: nav anchor links (from `NAV_LINKS`), theme toggle button, mobile menu button, "Pick the module..." CTA `a[href=#products]`, product cards: Clinix PH (live) -> "Open live demo ->" link to `CLINIX_URL` (env `NEXT_PUBLIC_CLINIX_URL`, default `/clinix-ph`); 5 "Coming soon" cards each with a **disabled** "Notify me" button (no waitlist exists); FAQ accordion; footer `Privacy`, `Terms`, `Data Processing` are `href="#"` (no pages exist).
- States: STATIC; no empty/error.

**`/clinix-ph` Clinix PH landing** (`components/clinix-landing.tsx`, client, 1,635 lines)
- Elements: parent link "DataBridgeSol" -> https://databridgesol.space; nav anchors Why / Features / PH compliance / Pricing / FAQ; theme toggle; "Log in" -> `/clinix-ph/auth`; "Start free"/CTAs -> `/clinix-ph/auth?mode=signup` (nav, hero, pricing tier cta, bottom CTA); hero secondary -> `#features`; specialty tabs (state); pricing: annual/monthly toggle, module add-on toggles (state-only price calculator); FAQ accordion; footer `Privacy`/`Terms`/`Data Privacy Act` = `href="#"` (dead).
- Notes: pricing shown here is marketing copy in the component (not from `src/lib/pricing.ts`'s billing); nothing is saved.

### 4.2 Auth

**`/clinix-ph/auth`** - Log in / sign up in one animated card (`AuthCard`, mode state; md+ slides a brand side panel).
- Header link "Back to Clinix PH" -> `/clinix-ph`. Side panel / mobile banner button toggles mode ("Create an account" / "Log in instead").
- Role switcher links (`RoleLinks`): "Not an owner?" Practitioner · Assistant · Patient -> `/clinix-ph/auth?role=...` (only changes the sub-headline copy and the "<Role> login" label; the role is NOT used for authorization or redirect).
- Social buttons (only providers with both env vars set): "Continue with Google/Apple/Facebook" (login) / "Sign up with ..." -> `socialSignInAction` -> provider redirect; callback `/clinix-ph/app` (login) or `/clinix-ph/onboarding` (signup/new user). Hidden entirely if none configured.
- **Login form** (`loginAction`): Email (required, `z.email`, trimmed, lowercased - message "Enter a valid email address."), Password (required, min 1 - "Enter your password."). Buttons: "Log in" (pending "Logging in..."). Link "Forgot password?" -> `/clinix-ph/auth/reset`. "No account? Sign up" toggles.
  - Success: `redirect('/clinix-ph/app')` -> router -> owner: console, others: role home, patient: portal, none: onboarding.
  - Failure: "Incorrect email or password." (generic); unverified -> "Verify your email first - we've sent you a new link." and `ResendVerification` form appears; 429 -> rate-limit message. Limits: sign-in 30/15 min per IP, 10/15 min per email.
- **Sign-up form** (`signupAction`): Full name (trim, 2-120; "Enter your full name."), Email, Password (8-128; "Use at least 8 characters." / "Use at most 128 characters."). Button "Create account" (pending "Creating account..."). No password-confirm field. Limit 5/hour per IP.
  - Success: card becomes "Check your email" (we sent a verification link to <email>; 15-day trial copy) + `ResendVerification` ("Didn't get it? Check spam, or resend the link", starts on 60 s cooldown, `resendVerificationAction`, "Sent - check your inbox.") + "Already verified? Log in".
  - Failure: "We couldn't create your account. Try again." Same message pattern for existing email (no enumeration).
  - Email link -> better-auth verify -> auto sign-in -> `/clinix-ph/onboarding`.
- States: empty n/a; loading N; error inline; offline SW only; permission: verified session redirects away.

**`/clinix-ph/auth/reset`** - "Forgot your password?" Email field -> `requestPasswordResetAction` (rate 10/h IP, 3/h email). Success (always, for any address): "Check your inbox ... link expires in one hour." Failure: "We couldn't send the reset link. Try again." Link "<- Back to login".

**`/clinix-ph/auth/reset/confirm`** - Three states: (1) `?error` or no token -> "This link has expired" + "Send a new reset link" -> `/clinix-ph/auth/reset`; (2) form "Set a new password": New password (8-128) -> `resetPasswordAction` button "Reset password" (pending "Saving..."); failure "This reset link has expired or was already used. Request a new one."; (3) done: "Password updated" + "Back to login". Limit 10/15 min per IP.

**`/admin-login`** (dark console style) - Brand "DataBridgeSol / Company admin". Fields: Email, Password (`loginSchema`). Button "Sign in" (pending "Signing in..."). `adminLoginAction`: after `signInEmail`, `platformRoleOf` must exist else the session is signed out and the generic "Incorrect email or password." returned. Success `redirect('/admin')`. Link "Forgot your password?" -> `/clinix-ph/auth/reset` (allowed on admin host). Copy: "Team access only. Invited by email? Use your invitation link instead." No sign-up, no social.

### 4.3 Onboarding wizard `/clinix-ph/onboarding`

Header: "Signed in as <email> · Log out" (`SignOutButton` -> `signOutAction` -> `/clinix-ph/auth`). `OnboardingWizard`, step indicator `Clinic · Vertical · Branch · Branding · Staff · Go live`; client-side validation per step with the same `onboardingSchema` the action uses; Back (disabled on step 1) / Continue; last form step button "Create workspace" (pending "Setting up...").

| Step | Heading | Fields / controls | Validation (src/lib/schemas/onboarding.ts) |
|---|---|---|---|
| 1 Clinic | Tell us about your clinic | "Clinic / business name"; "Subdomain" (suffix `.databridgesol.space`; input stripped to `[a-z0-9-]`) | name trim 2-120 ("Enter your clinic or business name."); subdomain trim lower 3-40, `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$` ("Use lowercase letters, numbers and hyphens, not starting or ending with a hyphen."), not in reserved list ("That subdomain is reserved. Try another.") |
| 2 Vertical | What kind of clinic is this? | 4 toggle cards (aria-pressed): Dental / Veterinary / Eye care / Skin-Derma, each lists "Custom fields included for <vertical>" | enum `dental|vet|eye|derma` (default dental) |
| 3 Branch | Your first branch | "Branch name", "City" | name 2-120 ("Enter a branch name."); city 2-80 ("Enter the branch city.") |
| 4 Branding | Make it feel like yours | Main color (swatches `#0f766e #4338ca #be123c #b45309 #047857 #a8791a` + picker), Secondary color (swatches `#e7d9b8 #f4c9d2 #f7ead2 #cbd5e1 #e8dcc4 #f4f1e6`), premium combos, font pairing picker (Modern / Classic / Friendly / Luxury), live brand preview | hex `^#[0-9a-f]{6}$` ("Pick a valid color."); font enum |
| 5 Staff | Invite your first staff | Email (optional), Role select (Practitioner / Assistant), link-button "Skip for now - I'll invite staff later" | email "" or valid; role enum practitioner|assistant |
| 6 Go live | Ready to go live | checklist (profile, vertical fields, branch, invite or "skipped", subdomain reserved), "Your 15-day free trial starts now. No card required." | - |

- Action `completeOnboardingAction` (requireUser; 10/hour): success -> step 6 + `<a>` "Open my console" -> `clinicConsoleUrl(subdomain)` (when subdomains ON) else `/clinix-ph/admin`. Failure: subdomain taken -> field error on step 1 "That subdomain is already taken. Try another."; already owner -> "You already have a clinic workspace - open your console to add branches."; rate limit "Too many attempts. Wait a while and try again." (wizard jumps back to first invalid step). Staff invite email failure does not fail onboarding.
- **Domain offer** card (only if `domainOfferConfig()` non-null) under step 6: "Want your own domain?" search input + Search (`searchDomainsAction`: 2-100 chars; 30/h) -> radio list of domains with `₱x/yr`, provider radios (if >1), price breakdown (first month + 1 year domain = total), "Pay ₱X" (`startDomainCheckoutAction`, 10/h) -> redirect to provider checkout URL. Messages: "Custom domains aren't available yet.", "No available names found. Try another.", "That name was just taken. Pick another.", "That payment method isn't available.", "We couldn't start checkout. Nothing was charged. Try again." Skipping keeps the free subdomain and trial.
- **Branding colors/font are stored (`clinics.brandingPrimaryColor/AccentColor/Font`) and shown in Settings > Clinic profile but are never applied to the console, clinic app, emails or portal** (grep: only `clinic-profile-card.tsx`, onboarding/workspace services read them). Only the wizard preview uses them.
- States: loading N; offline N (no banner).

### 4.4 Invite / join flows (all three share one pattern)

Pattern: server component reads `?token=` (valid if 20-200 chars and an open invite exists), looks up whether a user already exists for the invite email, renders `Form` or the invalid message. Form: hidden token; if no account: "Full name" (required in UI, server min 2: "Enter your full name."); password: label "Choose a password" (new, min 8 max 128, `autocomplete=new-password`) or "Your password" (existing account: must match). Server: IP rate limit 10/hour, invite is **claimed first** (single use), then `acceptWithAccount` creates or signs in the user and grants the role; on API failure the claim is released and message shown: existing -> "That password doesn't match your existing account.", new -> "We couldn't create your account. Try again."; invalid/used -> "This invitation is no longer valid. Ask for a new one." (wording differs per flow). Invite TTL: `STAFF_INVITE_TTL_DAYS = 7`.

| Screen | Title | Heading detail | Submit button | Action | After success |
|---|---|---|---|---|---|
| `/invite` (platform staff) | Join the DataBridgeSol team | "Sign in with your existing password / Create your account to accept the invitation for <email>." | "Accept invitation" (pending "Joining...") | `acceptInviteAction` -> `grantPlatformStaff` | `redirect('/admin')` |
| `/clinix-ph/join` (clinic staff) | "Join <clinic>" | "You're invited as a <front-desk assistant / practitioner / owner> (<email>)." | "Accept invitation" (pending "Joining...") | `acceptStaffInviteAction` -> `joinClinic` | `/clinix-ph/app` if user has >1 membership else `roleHome(role)` = `/clinix-ph/app/assistant` or `/practitioner` |
| `/clinix-ph/portal/join` (patient) | "Your records at <clinic>" | "You can see your appointments and receipts here. It's view-only; the clinic makes any changes." | "Open my records" (pending "Setting up...") | `acceptPatientInviteAction` -> `linkPortalUser` | `/clinix-ph/portal` |

Invalid state: `role=alert` paragraph. Gaps: no loading, no resend-from-page (ask the sender), invited email address is not editable. Note: invite acceptance does not require/verify email (token possession is the credential).

### 4.5 Patient portal `/clinix-ph/portal` (read-only)

- Header "My records" + "Log out" (`signOutAction`). Note "This page is view-only. To change an appointment or your details, contact the clinic."
- One section per linked clinic/patient: clinic name, patient name · MRN; "My details" (non-medical custom fields that have answers; medical fields never sent); "Upcoming" and "Past visits" lists (service, date-time in clinic timezone, status chip Requested/Booked/Waiting/In chair/Done); "Receipts" (invoice number, date, total, "(void)" strikethrough).
- Empty: per section text ("No upcoming appointments.", "No completed visits yet.", "No receipts yet."); "My details" hidden if none. Zero records overall -> redirect.
- No forms, no booking, no payment, no profile edit, no notification settings. Light slate styling (not ConsoleShell, no offline banner, no nav). Patient cannot book (the auth page copy "book visits" for the patient role is not implemented).

### 4.6 Owner console `/clinix-ph/admin/*`

Shell (all pages): `ConsoleShell` brand = first letter + company name, kicker "Owner console"; sidebar `BranchSwitcher` (client-only: switches the label shown in the header "<Branch> · <date>"; **does not filter data**, data is the host's clinic via `requireActiveClinicOwner`; with >1 branch it also adds "All branches" HQ); topbar: search box (opens command palette that only lists nav links, placeholder "Search patients, invoices, services..."), "Quick action" menu (static: New patient -> patients, New invoice -> services, Book appointment -> appointments, Record stock delivery -> inventory; each also fires a toast "Opening ..."), bell (notifications always `[]`; drawer text "You're all caught up. Alerts about your clinic will show up here."), "Clinic app" button -> `/clinix-ph/app/owner`. `SampleDataNotice` banner "Example data..." on pages not in its LIVE list (currently `modules`, `feedback`). Sidebar footer shows static "● Live syncing", theme toggle (cookie `console-theme`, default dark), collapse, Log out.

**Overview `/clinix-ph/admin`** (REAL; `getOverview`)
- Shows: PageHeader "Overview" + "<branch> · <as-of>"; 4 KPI cards with sparkline (Revenue today, Queue / booked, Stock alerts, Payments today); "Today's appointments" card (time, patient, service · practitioner, status pill) with summary pills "N in room / waiting / booked"; "Collections by method (30 days)" meters; "Stock needing attention" list (+ "Open inventory" link); 3 tiles: No-show rate, New patients, Collected (30 days).
- Links: empty queue -> "Book an appointment" -> `/clinix-ph/admin/appointments`; "Open inventory".
- Empty: "Nothing booked today."; "Payments will show here after your first checkout."; "Nothing is low or expiring."

**Assistant `/clinix-ph/admin/assistant`** - In nav only if `aiGrantedFor(account)`. Chat (`AssistantChat`): suggestions "How does today look?", "Appointments tomorrow", "Find Santos", "Add a new patient"; textarea "Ask the assistant" (placeholder "Ask about patients or appointments..."), Send button; usage line "Today: N instant answers (free) · X of Y AI answers"; "Looking that up..." while pending; prepared changes appear as a card with **Confirm** / Cancel (`/api/clinic/agent/confirm`); edits ask for the password (unlock cookie 10 min), archive asks password + typed MRN. Unavailable panels: "The assistant is for the clinic owner." / "The AI assistant isn't switched on for your account. Ask DataBridgeSol to enable it." / "The AI assistant isn't available yet. DataBridgeSol is still confirming how patient data is protected with its AI providers." If no AI key: `aiConfigured=false` (rules-only).

**Patients `/clinix-ph/admin/patients`** (REAL)
- Header "Patients & records" "<n> records at <clinic>."; button "Add patient"; search form (input "Search patients" placeholder "Name, MRN or mobile", `?q=` max 80, button "Search"); toggle "Show archived"/"Back to active" (`?view=archived`).
- Table: Patient (link to chart, sex · age), MRN, Mobile, Coverage (pills PhilHealth / Discount ID), Last visit, actions Edit + Archive/Restore. Limit rows with "Showing the first N of M. Search to narrow down."
- Empty: `No patients match "<q>".` / "No archived patients." / "No patients yet. Add the first one to start the queue."
- **Add/Edit patient drawer** (`PatientDialog`; `addPatientAction` / `updatePatientAction`, owner+assistant): First name* (1-80), Last name* (1-80), Sex* (Female/Male), Birth date (valid, not in future: "Birth date can't be in the future."), Mobile (PH regex `^(\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}$`, "Use a PH mobile number, e.g. 0917 555 4412."), PhilHealth PIN (`^\d{2}-\d{9}-\d$`, "Use the 12-digit PhilHealth PIN, e.g. 12-345678901-2."), Senior (OSCA) ID (<=40), PWD ID (<=40); on add only: the clinic's custom fields (grouped by section, medical ones tagged, required marked `*`) and consent checkbox "The patient has read and agreed to the data privacy notice (RA 10173)." (required: "Confirm the patient agreed to the data privacy notice."). Buttons Cancel / Save (pending "Saving..."). Success toast "<name> added|updated", drawer closes. Failure inline.
- **Archive** (`ArchiveButton` -> `setPatientArchivedAction`, owner+assistant): confirm dialog "They stop appearing in the list and for new bookings. Their record, visits and history are kept." Restore from archived view.

**Patient chart `/clinix-ph/admin/patients/[mrn]`** (REAL; shared `PatientChartView`)
- Back link "All patients"; title name + MRN (+ "Archived" pill); header buttons (non-archived): Edit (PatientDialog), "Add reminder email"/"Reminder email" (`savePatientEmailAction`, owner+assistant, email valid or empty to clear; toast "Reminder email saved/removed"), "Invite to portal" (`invitePatientAction`, owner+assistant, email required; shows "Invitation sent to ..." or "Saved, but the email ... could not be sent."; errors "This patient already has portal access.", "That patient could not be found."; limit 30/h), Archive.
- Panels: Details (Sex, Age, Birth date, Mobile, PhilHealth PIN, Senior (OSCA) ID, PWD ID); "More details" (custom fields; edit dialog "Patient details" -> `savePatientFieldsAction`, toast "Details saved"; hidden/readonly when archived; medical fields only for owner/practitioner); Visits (date-time, practitioner, Walk-in, status pill; "No visits yet."); **Tooth chart** (owner, practitioner write; assistant doesn't see) with Dentition segmented control, Chart/3D view toggle, tooth detail drawer (Record select: Findings/Work done, Surfaces checkboxes, Note <=300, `addChartEntryAction`; "Void entry" with reason >=5 chars `voidChartEntryAction`), "Draft SOAP note" with Copy and "Use as note"; **Treatment plans** ("New treatment plan": Plan name 2-100, Phase names one per line max 8, Notes <=1000 -> `createPlanAction`; per plan: status buttons (draft/proposed/accepted/cancelled via `setPlanStatusAction`), "Add to plan" (Service from price list or custom - custom only owner; Describe the work <=160; Price; Phase 1-8; Quantity 1-32; Tooth permanent/baby; "When done, record on the tooth chart as" code) -> `addPlanItemAction`; item buttons "Mark done"/"Undo"/"Remove" -> `markItemDoneAction`/`markItemNotDoneAction`/`cancelItemAction`; link to Billing); **Clinical notes** ("Add note"; SOAP textareas Subjective/Objective/Assessment/Plan each <=4000, at least one required: "Write something in at least one section."; own note editable 24 h else "Add amendment"; "Void" with reason >=5 -> `saveNoteAction`, `voidNoteAction`; roles owner+practitioner only).
- Shown regardless of clinic vertical: the dental chart/plan panels are rendered for every specialty (no check on `clinics.specialty`), so vet/eye/derma clinics also get the tooth chart. 404 for unknown MRN. Opening a chart writes a "record_viewed" audit entry (`openPatientChart`).

**Appointments `/clinix-ph/admin/appointments`** (REAL)
- "Appointments & queue": "Book, move and cancel visits. Requested bookings wait here for you to confirm." Button "Book appointment". Date nav: Previous day, Next day, "Today", date input + "Go" (`?date=`), long date heading.
- Row: time range, patient link, "service · practitioner · Walk-in", status pill, buttons per state: requested -> Confirm / Cancel; confirmed -> Check in / No-show (+ Reschedule, Cancel); checked_in -> Start / Cancel; in_progress -> Complete (`changeStatusAction`, toast "Updated"). Reschedule dialog (Date, Time step 5 min, Practitioner "Anyone available"; `rescheduleAppointmentAction`; toast "Appointment moved"), Cancel dialog "Cancel <name>'s appointment?" -> `cancelAppointmentAction` toast "Appointment cancelled"; "Keep it" to back out.
- **Book drawer** (`bookAppointmentAction`, owner+assistant): Patient (typeahead >=2 chars via `searchPatientsForBookingAction`, required "Choose a patient."), Service (optional; "No specific service (30 min)"), Practitioner (optional), Date* ("Choose a date."), Time* ("Choose a time."). Submit "Book" disabled until patient chosen; toast "Appointment booked". Server errors (double-booking etc.) inline.
- Empty: "Nothing booked for this day."

**Services `/clinix-ph/admin/services`** (REAL)
- "Services & pricing"; button "Add service"; "Show archived"/"Back to active services".
- Table: Service (+code), Category, Duration, Price, VAT pill (VAT-exempt/VATable), Edit, Archive/Restore ("It stops appearing for new bookings and checkouts. Past invoices still show it.").
- Drawer (`saveServiceAction`, owner): Service name* (2-120), Price (₱)* (0-1,000,000; accepts "1,500"), Duration minutes (optional, 5-600), Category (<=40), Code (<=20), VAT-exempt checkbox. Toast "<name> added|updated".
- Empty: "No services yet. Add the first one, with its price, to start booking and charging." / "No archived services."

**Recalls `/clinix-ph/admin/recalls`** (shared with app) - "Recalls" ("reminders only; nothing is booked or sent unless you choose to"). Button "Add recall" (`addRecallAction`: Patient*, "Due in" 1/3/6/12/24 months, Reason <=80; toast "Recall added"). Table: Patient · MRN, Due, Reason, Status pill (Overdue/Due this week/Later + "Reminded <date>"), Contact, actions "Send reminder" (`sendRecallReminderAction`, owner+assistant, only if patient email) / "Done" / "Dismiss" (`closeRecallAction`). Empty: "No one is due back. Add a recall from a checkout, or here." Daily recall emails also come from the cron.

**Billing `/clinix-ph/admin/billing`** (shared `BillingPage`)
- "Billing": button "New checkout"; stats "On account" and "Overdue installments"; tabs "All receipts" / "On account" (`?view=balances`); receipts table (Receipt link, Patient · MRN, Date, Paid by, Total, Balance, status Paid/On account/Void). Empty: "No receipts yet. Use New checkout when a patient pays." / "Nothing on account. Every receipt is fully paid."
- **Checkout drawer** (`checkoutAction`, owner+assistant): Patient*; treatment-plan items for that patient (checkbox per item grouped by phase); Services with quantity 0-99 each; Discount select (No discount / Senior citizen (20%, VAT-exempt) / PWD (20%, VAT-exempt) / Clinic discount... / Other (write your own)... [owner only]) + ID number (>=4 chars for senior/PWD; "Record the senior or PWD ID number."), custom label (3-60, "Describe the discount, e.g. Employee discount.") + percent/peso value; live totals (Subtotal, Less VAT, Discount, Total; server recomputes); "Paying now (₱)" (empty = pay all) with "Pay later" button; Paid by Cash/GCash/Maya/Card + Reference number (>=4 chars for non-cash); balance banner + Installments (2,3,4,6,10,12,18,24 monthly) + First due (required when installments chosen); optional "Remind them to come back" (1/3/6/12 months, reason default "Cleaning and check-up"). Submit label adapts ("Take payment", "Take ₱X, ₱Y on account", "Put on account"); disabled when nothing chosen ("Add at least one service or plan item."). Success: toast "Receipt <no> issued" and navigate to `/billing/<number>`.

**Receipt `/clinix-ph/admin/billing/[number]`** - Title = invoice number; receipt view (clinic, number, date, status pill, items with tooth and qty, Subtotal, Less VAT (exempt sale), Discount (+ID), VAT included, Total, Paid, Balance, Payments list with receipt numbers/method/ref, Installments with state pills Paid/Part paid/Due today/Overdue/Upcoming; void banner with reason). Buttons: "Record payment" (open invoices; Amount ₱ default = balance, Paid by, Reference; `recordPaymentAction`; toast "Payment <no> recorded"; cannot exceed balance - server), "Void receipt" (owner; reason >=5 chars <=300, `voidInvoiceAction`; toast "<no> voided"; "Refund the patient separately"). 404 if unknown. No print/PDF/send-to-patient button.

**Inventory `/clinix-ph/admin/inventory`** (shared `InventoryPage`)
- Description shows "N items need attention." Owner buttons: "Add item" (`saveItemAction`: Item name* 2-120, SKU <=40, Unit* default "unit" <=20 "Enter a unit, e.g. box.", Reorder level whole number >=0), per row "Use" (`consumeStockAction`: Quantity whole >=1; Note <=120; any staff), "Receive" (`receiveStockAction`: Quantity, Lot number <=40, Expiry date; owner), Edit, Archive/Restore ("Show archived"). Table: Item (+SKU), In stock (unit), Reorder at, Next expiry, Status (In stock / Low / Out / Expiring soon + "N expired" pill).
- `writeOffExpiredAction` exists in `actions/inventory.ts` (owner) but **no UI calls it**.
- Empty: "No items yet. Add the supplies you track, then receive your first delivery." (owner) / "No items yet. The owner adds the supplies the clinic tracks." / "No archived items."

**Claims `/clinix-ph/admin/claims`** (shared `ClaimsPage`) - "Claims & receivables"; button "File a claim"; stats Outstanding, Over 60 days, Denied; table Patient, Payor + (PhilHealth|HMO) pill, LOA/member, Amount, Filed, Age, Status select (Filed, Pending, Approved, Denied, Resubmitted, Paid, Withdrawn - Withdrawn option owner only; closed claims locked; `setClaimStatusAction`, toast "Marked <status>"), Edit (not for paid/withdrawn). Drawer (`saveClaimAction`, owner+assistant): Patient*, Payor type* (HMO/PhilHealth), Payor* (2-80, e.g. Maxicare), Member/policy no. (<=40), LOA number (<=40), Claim amount (₱)* (1-10,000,000), Receipt no. (<=20), Notes (<=500). Toast "Claim filed with <payor>" / "Claim updated". Empty: "No claims yet. File one when a patient's visit is covered by PhilHealth or an HMO."

**Reminders `/clinix-ph/admin/reminders`** (REAL; owner-only page, no assistant page though `sendReminderNowAction` allows assistant) - "Reminders & delivery": "Email reminders the day before an appointment. SMS isn't set up yet." Header toggle button "Turn on/off daily reminders" (`setRemindersEnabledAction`, toast). Stats: Daily reminders On/Off, Sent (30 days), Failed (30 days). Warning if upcoming patients lack email. Table: When, Patient, Service, Email (on file/None), Reminder (Sent/Failed/Not sent), "Send now"/"Retry" (`sendReminderNowAction`, toast "Reminder sent"; inline error). Empty: "No booked appointments from now until the end of tomorrow." Only email exists; SMS/Viber not built.

**Staff `/clinix-ph/admin/staff`** (REAL) - "Staff & roles"; button "+ Invite staff" (`inviteStaffAction`: Email* valid; Role Front-desk assistant | Practitioner; 20/h; "This person already works at the clinic."; toast "Invitation sent to <email>" or "Invite saved but the email failed - use Resend ..."). Table: Name ("Not joined yet" for invites), Email, Role (select Assistant|Practitioner -> `changeRoleAction`, toast "<who> is now <role>"; owner/self shown as pill), Branch, Status (Active / Invited / Deactivated), actions Resend + Revoke (invited; `resendInviteAction`, `revokeInviteAction`) or Deactivate/Restore (`setStaffActiveAction`, toast "Deactivated - their records stay"/"Restored"; owners and self protected: "Owners and your own account can't be changed here."). Only the active clinic's staff are listed.

**Modules `/clinix-ph/admin/modules`** (MOCK) - "Turn features on for your account. Changes are logged." 6 module cards with toggles (6 in `CLINIC_MODULES`), pill Active/Not enabled; toggling shows toast " enabled/disabled" and changes only local state (lost on reload; nothing logged, nothing gated). Banner "Example data".

**Subscription `/clinix-ph/admin/subscription`** (REAL plan) - "Your plan, invoices and branch allowance." Invoice history panel: always "No invoices yet..." (static); Current plan card: Tier N, status (Free trial / Active / Past due / Locked / Canceled) + "N days left, ends <date>", "Branches used X of Y". No upgrade/payment/change-plan/cancel buttons.

**Import / Export `/clinix-ph/admin/import-export`** (REAL) - "Owner-only. Every export is logged in the Activity log." Import patients panel: file input (".csv", aria "Patients CSV file"), link "Download the template" (`/api/clinic/import-template`), buttons "Preview" then "Import N" (`importPatientsAction`, intent preview|import; max 500 rows, 1,000,000 bytes; header requires first_name, last_name, sex; optional birth_date, mobile, philhealth_pin, osca_id, pwd_id + custom field columns; each row validated like Add patient; consent checkbox "These patients agreed to the clinic's data privacy notice (RA 10173)." required to import); preview shows "N ready to add, M with problems (these will be skipped)", per-line problems, recognised/ignored columns; result "Added N patients, skipped M." Export cards: Patients, Receipts, Inventory, Claims each with "Download CSV" (`/api/clinic/export?kind=`). No export for appointments/services/notes; no import for anything but patients.

**Settings `/clinix-ph/admin/settings`** - Tabs (links) "Clinic profile" | "Patient fields" | "Discounts".
- Clinic profile (read-only): for each branch Clinic profile card (Address `<slug>.databridgesol.space`, Vertical, City, Time zone, Primary colour, Accent colour, Font pairing) + Custom domain status card (Awaiting payment / Setting up / Live / Needs attention / Expired). **No edit controls** - profile cannot be changed after onboarding.
- Patient fields (`FieldsManager`, owner): Built-in fields (read-only list), Standard fields table (Field, Type, Section, Flags Required/Medical/Retired, move up/down, Edit, Archive/Restore), "Add field" drawer (`saveFieldAction`: Field name* 2-60; Type: Short text, Long text, Number, Date, Yes / no, Pick one, Pick several; Choices one per line (>=2 for select types, max 30); Section <=40 default "Other details"; Required; Medical ("Only the owner and practitioners see it. Hidden from the front desk and the patient portal.")), suggestions per vertical (`addSuggestedFieldsAction`, toast "Added N fields"), "Use another branch as a template" (`copyFieldsAction`, toast "Copied N fields"/"Nothing new to copy"), Practitioner add-ons table ("No add-ons yet."), Retired fields; max 40 active fields ("A clinic can have up to 40 active fields. Retire one first."); changing type refused if answers won't fit.
- Discounts (`DiscountsManager`, owner): Built-in (Senior citizen 20%, PWD 20%, by law), "Your clinic's discounts" table (Name, Discount, Notes, ID) with Add/Edit drawer (`saveDiscountTypeAction`: Name* 2-60, Type Percent|Peso amount, Percent/Amount*, Notes <=200, "Needs an ID number") and Archive (`setDiscountArchivedAction`). Empty "No clinic discounts yet."

**Activity log `/clinix-ph/admin/activity`** (REAL) - "Who did what, and who opened which record. The latest 100 entries." Filter links Everything / Patients / Appointments / Notes / Billing / Services / Inventory / Claims. Empty "Nothing here yet."

**Send feedback `/clinix-ph/admin/feedback`** (MOCK / non-functional) - Category select (Bug report, Feature request, General feedback, Billing question), Message textarea (required, button disabled when blank), "Send feedback". Submit calls no server action, stores nothing; shows "Sent - Thanks - our team will follow up by email if needed." + "Send another". The company admin Feedbacks page never receives it.

### 4.7 Clinic app by role `/clinix-ph/app/<role>/*`

Shell: brand = clinic initial + clinic name, kicker "<Owner|Front desk|Practitioner> app"; search placeholder "Search patients" (opens the nav-only command palette); Quick action menu empty (`quickActions=[]`); bell empty; ClinicSwitcher (`<details>` list of the user's clinics; only if >1 clinic and subdomains ON; plain link to each clinic's host); owner only: "Owner console" button -> `/clinix-ph/admin`. Mobile: floating bottom bar with first 4 nav items + "More" sheet (theme, Log out).

| Screen | owner | assistant (Front desk) | practitioner |
|---|---|---|---|
| Today (`/<role>`) title | "Today" + "Floor at <clinic>." | same | "My schedule" + "Your patients for today." (own appointments only) |
| Today stats | Booked today, Waiting, In chair, Done | same | same (own) |
| Today queue list | QueueList with StatusButtons; empty "No one is booked or waiting yet. Add a walk-in to start the queue." | same | empty "Nothing on your schedule today." |
| Today actions | "Add walk-in" | "Add walk-in" | none |
| `/queue` | yes | yes | 404 |
| `/appointments` | "Appointments", Book/Reschedule/Cancel | same | "My calendar", status buttons only (Start/Complete etc.), no book/reschedule/cancel |
| `/patients` | list + Add/Edit/Archive | same | list read-only, no Add/Archive/Show archived |
| `/patients/[mrn]` | full chart; clinical notes + tooth chart + plans (write) | chart; **no notes, no tooth chart**; plans visible (agree/bill); invite to portal + reminder email | chart read-only; notes + tooth chart + plans (write); no invite/email/edit/archive |
| `/recalls` | all | all (send reminder) | list, Add, Done, Dismiss (no "Send reminder") |
| `/billing`, `/billing/[n]` | yes (void) | yes (no void; "Only the owner can void a receipt."; no custom discount) | 404 |
| `/claims` | yes (withdraw option) | yes | 404 |
| `/inventory` | manage | view + "Use" | view + "Use" |
| `/patient-fields` | 404 (manages in console Settings) | 404 | yes: standard fields shown, can add/edit/archive own add-ons ("Managed by the owner" on standard fields) |

Walk-in dialog (`addWalkInAction`, any staff but UI only for owner/assistant): Patient* select (or "No patients yet. Add the patient first"), Practitioner (optional), "Chair or room" (<=40). Submit "Add to queue" (pending "Adding..."); toast "Queued as #<n>".
Status buttons call `changeStatusAction` (requireActiveClinic): allowed transitions enforced in service; toast "Updated".

### 4.8 Platform admin `/admin/*`

Shell: brand "D / DataBridgeSol / Company admin", sidebar user name; topbar search (nav-only palette, placeholder "Search tenants, invoices, modules..."), Quick action menu (MOCK: New tenant -> /admin/tenants, Issue refund -> /admin/billing, Enable a module -> /admin/modules, Invite company staff -> /admin/staff; each shows a toast like "Opening new tenant form" but does not open the form), bell shows **4 MOCK notifications** (Metro Derma payment failed etc.) with count badge "4" that is fiction; sidebar badges "2" on Tenants and "1" on Support are hardcoded.

| Screen | What it shows / does | Data |
|---|---|---|
| Overview `/admin` | "Company overview · Sun 20 Sep 2026" (hardcoded date), range tabs Today/7 days/30 days (local state, no effect), KPIs MRR ₱20,660 / Active tenants 24 / Churn 4.1% / Open tickets 2, Tenant activity (8 fictional tenants), MRR by tier, Needs attention (buttons Review/Nudge are toast-only), ops tiles | MOCK |
| Assistant `/admin/assistant` | chat to ask about tenants, revenue, team, domain orders (suggestions "How is the business doing this month?", "Which trials end this week?", "Any tenants past due?", "Are there domain orders that need review?"); super_admin can have it **prepare** changes (invite admin, lock/unlock tenant, tier change, etc.) and Confirm/Cancel via `/api/admin/agent/confirm` | REAL |
| Tenants `/admin/tenants` | "N accounts · M shown"; search input "Search name or email"; status filter (All, Active, Trial, Past due, Cancelled); "+ New tenant"; table Account, Tier, Status, Clinics, MRR, Renews, AI switch, View; row/View opens drawer (MRR, Renews / trial ends, Clinics, Joined, clinic list with subdomains; `actions=[]` -> no actions) | REAL |
| ...New tenant drawer | `createTenantAction` (any platform user; 30/h): Business name* 2-120, Owner's name* 2-120, Owner's email* valid, Subdomain* (onboarding rules), First branch* 2-120, City* 2-80, Specialty (Dental, Veterinary, Eye care, Skin / Derma), Start as (15-day trial | Active (30 days)), Tier (Tier 1-4 · 1-4 clinics). Then sends the owner a password-setup email (reset link). Toast "<company> created - setup link sent" or "...email failed, resend from the owner's login page". Errors: "That subdomain is already taken.", "This person already owns a tenant. Add branches to it instead." | REAL |
| ...AI access switch | `setTenantAiAccessAction` (super_admin only; staff see On/Off pill); toast "AI assistant granted to / revoked for <name>" | REAL |
| Billing `/admin/billing` | KPI tiles (MRR, Past due, Refunded, Trials converting) + Subscriptions table from the 8 fictional tenants; no refund/charge/lock button exists | MOCK |
| Modules `/admin/modules` | 6 platform modules with "tenants" counts and on/off toggles (toast "turned on platform-wide"); client state only | MOCK |
| Support `/admin/support` | delivery KPIs + 5 fictional tickets (no ticket creation, reply, or status change anywhere) | MOCK |
| Staff `/admin/staff` | "Company staff - Everyone with access to this admin." table Name (you), Email, Role (Super admin|Staff), Since, Status (Active/Invited/Deactivated); super_admin: "+ Invite admin" (`inviteAdminAction`: Email*, 20/h, "This person is already on the team.", toast "Invitation sent to <email>"/"Invite saved but the email failed - resend to ..."; link valid 7 days), "Revoke" (`revokeInviteAction`), "Deactivate"/"Restore" for `staff` role only, not self (`setStaffActiveAction`: "That change isn't allowed."). Invitees always become role `staff`; only the founder is `super_admin` | REAL |
| Feedbacks `/admin/feedback` | list of 5 fictional feedbacks, status pills | MOCK |
| Audit log `/admin/audit` | "Every privileged platform action, attributable to a named admin." - 5 fictional entries; real admin actions are not logged here | MOCK |
| AI settings `/admin/ai-settings` (super_admin) | Gemini key card and Claude key card ("Paste key"/"Replace key" password input `required`, 20-300 chars, no whitespace; "Save key" pending "Checking..." -> verifies with provider; messages "Key saved and working." / "Key saved, but the provider couldn't be reached to confirm it works." / "The provider rejected this key..."; "Remove saved key"); status pills "Saved · ...last4" / "Set in the environment" / "Not set"; "Patient data in tenant assistants" card button "I confirm - allow patient data" / "Turn off" (`setPatientDataAiAction`) | REAL |

---------------------------------------------------------------------------------------------------

## 5. Navigation per role (landing page after sign-in)

| Role | Sign-in screen | Landing after login | Menu |
|---|---|---|---|
| Platform super_admin | `/admin-login` (or invite `/invite`) | `/admin` | Overview, Assistant · **Accounts**: Tenants, Billing & revenue · **Platform**: Module marketplace, Support & delivery · **Company**: Company staff, Feedbacks, Audit log, AI settings |
| Platform staff | same | `/admin` | same minus AI settings (menu filtered in layout; page also 404s) |
| Owner | `/clinix-ph/auth` | `/clinix-ph/app` -> `/clinix-ph/admin` (host `<slug>.databridgesol.space` `/` is rewritten to it; with 1 clinic on shared domain auto-forwards to the clinic host) | Overview, Assistant (only if granted) · **Clinical**: Patients & records, Appointments & queue, Services & pricing, Recalls, Billing & receipts · **Operations**: Inventory, Claims & receivables, Reminders & delivery · **Account**: Staff & roles, Modules, Subscription, Import / Export, Settings, Activity log · **Help**: Send feedback. Top-bar button "Clinic app" -> `/clinix-ph/app/owner`. (Seed nav badges 3/2 are stripped in layout.) |
| Owner in clinic app (`/clinix-ph/app/owner`) | - | via "Clinic app" | Today, Queue, Appointments (short "Calendar"), Patients, Recalls, Billing, Inventory, Claims · **Manage clinic** (links back to console): Services & pricing, Staff & roles, Clinic settings |
| Assistant (Front desk) | `/clinix-ph/auth` (?role=assistant just changes copy) | `/clinix-ph/app/assistant` | Today, Queue, Appointments, Patients, Recalls, Billing, Inventory, Claims |
| Practitioner | `/clinix-ph/auth` | `/clinix-ph/app/practitioner` | My schedule ("Today"), My calendar ("Calendar"), Patients, Recalls, Inventory, Patient fields ("Fields") |
| Patient | `/clinix-ph/auth` (?role=patient) after accepting invite | `/clinix-ph/portal` | none (single page: My records + Log out) |
| User with several clinics | - | `/clinix-ph/app` router -> first clinic (host wins when on a subdomain) | ClinicSwitcher in sidebar (only when subdomains ON) |

Mobile: first 4 nav items in the floating bottom bar (use `shortLabel`), the rest under "More". Command palette (Ctrl/Cmd+K) lists nav items only ("Go to <label>"); it does not search patients or records.
Sign-out: `signOutAction` -> `/clinix-ph/auth` (admin host: `/admin-login`).

---------------------------------------------------------------------------------------------------

## 6. Shared components

### 6.1 `src/components/console/*` design system (used by owner console, clinic app, platform admin)

| Component (file) | Purpose | Used in |
|---|---|---|
| `ConsoleShell` (console-shell.tsx) | frame: theme state + cookie, collapsible sidebar, topbar, mobile nav, `ToastProvider`, `OfflineBanner` | `app/admin/layout.tsx`, `app/clinix-ph/admin/layout.tsx`, `app/clinix-ph/app/[role]/layout.tsx` |
| `ConsoleSidebar` / `ConsoleTopbar` / `ConsoleMobileNav` | desktop nav (228 px, collapses to 58 px), search/quick action/bell, bottom bar + "More" sheet | ConsoleShell |
| `CommandPalette`, `QuickActionsMenu`, `NotificationsDrawer` | topbar widgets | ConsoleTopbar |
| `OfflineBanner` | online/offline banner | ConsoleShell |
| `ConsoleButton`, `consoleButtonClass` | variants primary/secondary/danger; sizes md (min-h 44px mobile, 36 desktop) / sm | everywhere |
| `ConsoleDialog` | native `<dialog>`; placements right (drawer), center, bottom, top | all forms/drawers |
| `DrawerHeader`, `FormField` (label, hint, error id `{id}-error`), `console-input.ts` `CONSOLE_INPUT` | form scaffolding | all dialogs |
| `PageHeader`, `Panel/PanelHeader/Kicker`, `StatGrid`, `KpiGrid` (sparklines), `MeterListCard`, `ActionListCard`, `AuditLogList`, `ModuleGrid`, `DetailDrawer`, `Monogram`, `Pill`, `ToggleSwitch`, `RangeTabs` | page building blocks | pages |
| `TableCard`, `Th`, `Td`, `Tr`, `RowActions` (data-table.tsx) | tables | list pages |
| `ArchiveButton` | confirm dialog + action for archive/restore | patients, services, inventory, fields, discounts |
| `PageSkeleton` | loading state | 3 `loading.tsx` |
| `toast.tsx` (`useToast`, `ToastButton`) | popover toast | all client forms |
| `ConsoleIcon` (lucide), `tone.ts`, `read-console-theme.ts` | helpers | shell |

### 6.2 Other shared groups

| Group | Files | Where used |
|---|---|---|
| `src/components/clinic/*` (36) | `PatientChartView`, `PatientsPanel`, `PatientDialog`, `PatientEmailDialog`, `InvitePortalDialog`, `PatientImport`, `AppointmentsBoard`, `BookAppointmentDialog`, `RescheduleDialog`, `CancelAppointmentButton`, `StatusButtons`, `StatusPill`, `AddWalkInDialog`, `QueueList`, `BillingPage`, `CheckoutDialog`, `ReceiptsTable`, `ReceiptView`, `RecordPaymentDialog`, `VoidInvoiceButton`, `ClaimsPage`, `ClaimDialog`, `ClaimStatusSelect`, `InventoryPage`, `InventoryPanel`, `ItemDialog`, `StockDialog`, `RecallsPage`, `RecallActions/RecallDialog`, `NotesPanel`, `NoteDialog`, `VoidNoteButton`, `PatientDental`, `ToothChartPanel`(tooth-chart.tsx), `tooth-chart-3d.tsx`, `tooth-glyph.tsx`, `TreatmentPlansPanel` | owner console pages AND clinic app pages (same components, `canWrite`/role props) |
| `src/components/patient-fields/*` | `FieldsManager`, `FieldDialog`, `PatientFieldsPanel`, `PatientFieldsDialog`, `FieldInput`, `field-controls` (move, suggestions, copy) | console Settings tab, practitioner `/patient-fields`, patient chart |
| `src/components/discounts/*` | `DiscountsManager`, `DiscountDialog` | console Settings > Discounts |
| `src/components/assistant/assistant-chat.tsx` | chat + confirm cards (+password/typed step-up) | `/admin/assistant`, `/clinix-ph/admin/assistant` |
| root `src/components` | `Button`/`buttonClassName` (light pages), `form-controls` (`TextField`, `SelectField`), `PasswordInput`, `SignOutButton`, `PwaRegister` | auth, onboarding, invites, portal; `PwaRegister` in root layout |
| `app/clinix-ph/admin/_components` | `BranchProvider/BranchSwitcher/ActiveBranchName`, `ClinicAppLink`, `LiveQueueCard`, `SampleDataNotice` | owner console |
| `app/clinix-ph/app/[role]/_components` | `ClinicSwitcher`, `ConsoleLink` | clinic app layout |
| `components/` (root) | `canvas-landing.tsx`, `clinix-landing.tsx`, `menu-icon`, `theme-icon` | marketing |

### 6.3 Design tokens (`app/globals.css`, Tailwind v4 `@theme`)

- Brand: `--color-brand: #0f766e` (teal), `--color-brand-700: #0a4f49`. Onboarding overrides `--color-brand` and `--font-heading` live for its preview.
- Console palette, light (`:root` via `@theme`): canvas `#f5f7f6`, panel `#ffffff`, panel-2 `#eef2f1`, line `#e1e7e4`, ink `#0b0f17`, muted `#4b5a55`, subtle `#5c6a65`, accent `#007f5f`, on-accent `#ffffff`, info `#0e7490`, warn `#b45309`, danger `#be123c`.
- Console palette, dark (`.dark` class, toggled by ConsoleShell; default dark unless cookie `console-theme=light`): canvas `#0b0f17`, panel `#111827`, panel-2 `#151e2e`, line `#1e293b`, ink `#f1f5f9`, muted `#94a3b8`, subtle `#8c9bae`, accent `#00f5a0`, on-accent `#0b0f17`, info `#06b6d4`, warn `#f59e0b`, danger `#f43f5e`.
- Page background tokens `--background/--foreground` (white/#171717; dark via `prefers-color-scheme`); `body` font Arial fallback.
- Fonts (next/font): root layout Geist Sans/Mono (`--font-geist-sans/mono` -> `font-sans/mono`); `lib/fonts.ts` `brandFontVariables`: Plus Jakarta Sans 700/800 `--font-heading` -> `font-display`; Inter 400/500/600 `--font-body` -> `font-text`; JetBrains Mono 500/600 `--font-code` -> `font-data` (prices, IDs). Onboarding adds Poppins 600/700 and Playfair Display 700/800. `app/page.tsx` loads its own Plus Jakarta/Inter/JetBrains.
- Radius: **no radius tokens**; components hardcode `rounded-lg` (buttons/inputs), `rounded-xl` (Panel, tables), `rounded-2xl` (light-page cards), `rounded-[10px]` (light inputs/buttons), `rounded-[20px]` (auth card), `rounded-[28px]` (mobile nav). Animation token `--animate-console-slide-in` 240 ms.
- Light pages (auth, onboarding, join, portal, reset) use raw Tailwind `slate-*` + `brand`, not console tokens. Landing pages use scoped CSS classes (`cx-*`, `db-*`) with their own theme toggle.
- Touch targets: `min-h-11` (44 px) on mobile for buttons/links/inputs.
- Meta: theme-color `#0f766e`; viewport-fit cover.

---------------------------------------------------------------------------------------------------

## 7. PWA

| Item | Detail |
|---|---|
| Manifest | `app/manifest.ts` (route `/manifest.webmanifest`), built per host: Clinix host -> name "Clinix PH", short "Clinix"; admin host -> "DataBridgeSol Admin", "DBS Admin". `id:/`, `start_url:/`, `scope:/`, `display:standalone`, `orientation:any`, bg `#f6f8fa`, theme `#0f766e`, categories medical/business/productivity. Icons `/icons/icon-192.png`, `icon-512.png`, `maskable-512.png` (+ `apple-touch-icon.png`, `icon.svg`). `start_url "/"` relies on the proxy rewrite to reach each host's home |
| iOS | `appleWebApp {capable, title:"Clinix", statusBarStyle:default}` in root layout |
| Service worker | `public/sw.js` v1, registered by `PwaRegister` (production only, scope `/`, `updateViaCache:none`); `next.config.ts` serves it no-cache with `Service-Worker-Allowed: /`. Install precaches `/offline.html` + 2 icons, `skipWaiting`, `clients.claim`, deletes old caches. Fetch: GET same-origin only; `/api/*` untouched; navigations are network-first with `/offline.html` fallback (pages never cached - patient privacy RA 10173); `/_next/static/*` and `/icons/*` cache-first. Message `SKIP_WAITING` supported. No push, no background sync, **no offline writes/queue** |
| Offline page | `public/offline.html`: "You're offline", explanation, "Try again" button, auto-reloads on `online` event, privacy note; supports dark scheme |
| Offline banner | `OfflineBanner` in ConsoleShell only (sticky; "You're offline. Nothing can be saved until you reconnect.") |
| Install prompt | none custom (no `beforeinstallprompt` UI) |
| Security headers | CSP (self only; form-action allows Google/Apple/Facebook), HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy (camera/mic/geo/payment denied) |
| Tests | `src/lib/service-worker.test.ts` |

---------------------------------------------------------------------------------------------------

## 8. What is still sample data (MOCK) - complete list

Screens fully MOCK (8): `/admin` overview, `/admin/billing`, `/admin/modules`, `/admin/support`, `/admin/feedback`, `/admin/audit`; `/clinix-ph/admin/modules`, `/clinix-ph/admin/feedback` (non-functional form).
Mock chrome on REAL screens: platform admin sidebar badges (2, 1), quick actions (toast-only), bell (4 invented notifications), hardcoded "Sun 20 Sep 2026" in overview; `ModuleGrid`/`RangeTabs` toggles are decorative; owner console `CLINIX_ADMIN_NAV` lives in mock-data (real hrefs; badges stripped), `CLINIX_QUICK_ACTIONS`/`CLINIX_SEARCH_PLACEHOLDER` come from mock-data; subscription invoice history is a static placeholder.
Unused mock exports in `src/lib/mock-data/clinix-admin.ts` (BRANCHES, KPIs, QUEUE, INVENTORY, CLAIMS, DELIVERIES, PENDING_REQUESTS, CLINIX_ACTIVITY...) are no longer imported by any page except `CLINIX_ADMIN_NAV`, `CLINIX_QUICK_ACTIONS`, `CLINIX_SEARCH_PLACEHOLDER`, `CLINIC_MODULES`, `FEEDBACK_CATEGORIES` (dead code, safe to delete). `src/lib/schemas/patient.ts` (`patientSchema` with age/allergies/notes) is also unused.

## 9. Gaps and surprises (for the blueprint)

1. Tenant suspension/lock/trial-expiry/past-due is **not enforced** anywhere (proxy, auth, layouts). `masterlocked` is settable only through the admin AI assistant, with no effect on access. No billing/payment collection for subscriptions exists (only the one-off custom-domain checkout).
2. Patient role is thin: invite -> read-only portal. Patients cannot book, pay, edit details or change contact. Auth page `?role=patient` copy ("book visits and view your records") overstates. A patient opening `/clinix-ph/admin` or `/clinix-ph/auth` while logged in is bounced to onboarding.
3. No `error.tsx`, `not-found.tsx`, `global-error.tsx`; no 403 page; "no permission" = 404 or redirect.
4. Branding (colors, font) collected in onboarding is never applied; Clinic profile (Settings) is read-only; no way to change clinic name, address, time zone, or add a branch from the UI even though the schema/tier supports multiple clinics ("Branches used X of Y"); onboarding creates exactly one clinic per owner and the owner console `BranchSwitcher` only relabels.
5. Owner console is host-scoped (one clinic per host); `ALL_BRANCHES` "HQ" view exists only as a label.
6. Owner Modules page and clinic Feedback form look functional but persist nothing; company Feedbacks/Support/Audit/Billing/Modules/Overview are fully fictional.
7. Dental tooth chart and treatment plans appear for every vertical (vet/eye/derma included); no vertical-specific screens exist beyond custom-field suggestions.
8. SMS/Viber not built (reminders = email only, via daily cron `0 1 * * *` UTC = 09:00 Manila). Reminders page owner-only though front desk may send reminders by action; assistant has no Reminders menu item.
9. `writeOffExpiredAction` (expired stock write-off) has no UI. No receipt print/PDF/email. No appointments/notes export. No audit log for platform admin actions in the UI.
10. Command palette and "Search patients" placeholders imply record search; they only navigate to menu pages. Patient lookup is only in Patients page search and the booking typeahead.
11. `/admin-login` and `/invite` are reachable on every host (only `/admin/*` is host-restricted). Landing footer links (Privacy, Terms, Data Privacy Act/Processing) are dead `#` links; "Notify me" buttons are disabled stubs.
12. Practitioner can change appointment status (`changeStatusAction` allows any staff); `addWalkInAction` and `consumeStockAction` and `setPlanStatusAction` also allow any staff role (UI hides some of them).
