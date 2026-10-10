# Clinix PH: server layer and permissions as implemented

Repo `/home/claude/work/hb` (read-only inventory, 2026-10-10). Line numbers refer to the files as read. Items marked (unverified) could not be confirmed from source alone (no node_modules, no DB, no running app).

Abbreviations used in all tables
- O = owner, A = assistant (shown as "Front desk"), P = practitioner, PT = patient. PA = any active `platform_admins` row, SA = `platform_admins.role = 'super_admin'`.
- `RCR(...)` = `requireClinicRole(...)` (auth.ts:272). `RAC` = `requireActiveClinic()` (auth.ts:224, any active staff of the host's clinic). `RACO` = `requireActiveClinicOwner()` (auth.ts:265, RAC + `role==="owner"` else 404). `RW` = `requireWorkspace()` (owner of at least one clinic, auth.ts requireClinicOwner). `PUB` = no session (token or credentials are the proof).
- `CW120` = rate bucket `clinic-write` 120/h per user id (`consumeRateLimit`, fixed window, Postgres `rate_limits`, key = sha256(bucket:subject)). `CW200`, `CW240` likewise.
- `APP` = `revalidatePath("/clinix-ph/app","layout")`. `ADM(x)` = `revalidatePath("/clinix-ph/admin/x")`, `ADM(x,L)` same with "layout". `LAND` = `/clinix-ph` layout.
- Audit = a row in `audit_logs` written from the service in the same transaction. `audit_logs.clinic_id` is NOT NULL (schema/audit.ts:15), so nothing platform-level (no clinic) can be audited there.

---
## 1. Auth

Config: `src/server/auth.ts` (better-auth ^1.7.5, Drizzle adapter, tables `user, session, account, verification`). Route `app/api/auth/[...all]/route.ts` exposes every better-auth endpoint. `proxy.ts` is coarse routing only (admin host allow-list, subdomain rewrite), not authorization.

| Topic | Implementation |
|---|---|
| Sign-up | `signupAction` -> `auth.api.signUpEmail` (name 2-120, email, password 8-128) then `sendVerificationEmail`. `emailAndPassword.requireEmailVerification: true` (auth.ts:107) so no session until the emailed link is opened; same response for new and existing email (anti-enumeration). `autoSignInAfterVerification: true`, `sendOnSignIn: true` (auth.ts:119). Email via Resend HTTP API (`services/email.ts`), sent inside `after()`. Callback after verify: `/clinix-ph/onboarding`. |
| Login | `loginAction` -> `signInEmail`; callback `/clinix-ph/app`. Wrong password and unknown email give "Incorrect email or password."; unverified gives a resend notice. Social: google/apple/facebook, each enabled only if `<P>_CLIENT_ID`+`_SECRET` env set (auth.ts:25-34). Platform admin: separate `adminLoginAction` (below). |
| Logout | `signOutAction` -> `auth.api.signOut`; redirect to `/admin-login` on admin host else `/clinix-ph/auth`. Single session only; no "sign out everywhere". |
| Password reset | `requestPasswordResetAction` -> `auth.api.requestPasswordReset` (redirectTo `/clinix-ph/auth/reset/confirm`); `resetPasswordAction` -> `auth.api.resetPassword` (password 8-128). UI says link lasts 1 hour, single use (reset/confirm/page.tsx). `revokeSessionsOnPasswordReset` is not set in config (library default, believed false; unverified), so existing sessions survive a reset. Tenant owners created by a platform admin have no password; `createTenantAction` fires `requestPasswordReset` as their set-password link. |
| Email verification | Required for every `requireUser()` (`current.user.emailVerified`, auth.ts:159), `getAgentClinic`, platform admin API routes. Invitees get `emailVerified=true` set directly after holding the emailed link (`invitee-auth.ts`, `platform-staff.grantPlatformStaff`). `createTenant` inserts the owner `user` row with `emailVerified: true` and no password. |
| Staff invites | Owner invites role `practitioner` or `assistant` only (`INVITABLE_STAFF_ROLES`, constants.ts). `createStaffInvite`: 256-bit token (`tokens.ts newSecretToken`), only SHA-256 stored in `staff_invites.token_hash`; TTL 7 days (`STAFF_INVITE_TTL_DAYS`); re-inviting the same email revokes the earlier pending one; refuses an already-active member. Link `<clinic origin>/clinix-ph/join?token=...`. Accept (`acceptStaffInviteAction`, PUB): claim (pending->accepted, single use, guarded UPDATE) -> `acceptWithAccount` (existing account must sign in with its own password; new account is created with chosen password, marked verified, signed in) -> `joinClinic` (inserts or re-activates `clinic_staff` with invited role) -> on any API failure the invite is released back to pending. Invites can also be created during onboarding (`createClinicWorkspace`). |
| Patient-portal invites | NOT OTP. Roadmap says "invite by email/OTP"; code is an emailed single-use token link, same mechanics as staff invites (hashed token, 7-day TTL reusing `STAFF_INVITE_TTL_DAYS`, previous pending invite for that patient revoked). Accept (`acceptPatientInviteAction`, PUB): claim -> `acceptWithAccount` -> `linkPortalUser` (sets `patients.portal_user_id`, refuses if already linked or archived) -> redirect `/clinix-ph/portal`. A patient is identified only by `patients.portal_user_id = user.id` (`hasPortalAccess`, `getPortalRecords`); there is no `patient` role string. One user can be linked to patient rows in several clinics [CORRECTION 2026-10-10 from doc review: NOT true as built; migration 0000 creates a global unique index `patients_portal_user_id_idx` on `portal_user_id`, so one login links to one patient row in the whole database. Target change: SCHEMA MG-04]. |
| Platform admin | Team table `platform_admins(userId, role 'super_admin'|'staff', isActive)`. Login `/admin-login` -> `adminLoginAction`: normal `signInEmail`, then `platformRoleOf(user.id)` must be non-null and active, else the just-created session is signed out and the generic bad-login message returned. Invites (`platform_invites`, 7-day TTL, hashed token) only by SA; accept creates role `staff`. `super_admin` is created only by `scripts/seed-super-admin.mjs`. No MFA/step-up for platform admins. |
| Session | better-auth defaults for lifetime (not overridden; believed 7 days, refreshed daily; unverified). `session.cookieCache` 5 min (auth.ts:139). Staff membership/role and platform role are re-read from the DB on every request (`listActiveMemberships`, `platformRoleOf`), so deactivation is immediate despite the cookie cache. With `clinicSubdomainsEnabled()` the cookie domain is `.databridgesol.space` (auth.ts:133); custom domains get a session via `oneTimeToken` (hashed, expires 1 min, server-initiated only) at `/clinix-ph/open-domain` -> `/api/handoff`. |
| Rate limits (auth) | `hooks.before` (auth.ts:~80) covers HTTP and direct `auth.api.*` calls, per IP (`getIP`) and per lower-cased email: `/sign-in/email` 30/15min IP + 10/15min email; `/sign-up/email` 5/h IP; `/sign-in/social` 30/15min IP; `/send-verification-email` 10/h IP + 3/h email; `/request-password-reset` 10/h IP + 3/h email; `/reset-password` 10/15min IP. Invite acceptance also passes through these (sign-in/sign-up). Everything else falls to better-auth's built-in limiter (memory, production only per comment). Extra per-action limits: staff/patient/platform invite accept 10/h per IP (first `x-forwarded-for` value); `agent-step-up` 5/15min per user. |
| Step-up (password re-entry) | `services/step-up.ts`. Used ONLY by the clinic AI assistant confirm path (`app/api/clinic/agent/confirm`, `clinic-agent-actions.ts`). `STEP_UP = {create:none, edit:unlock, delete:password+typed}`. "unlock" = httpOnly `agent_unlock` cookie (HMAC of `userId.expires` with key derived from BETTER_AUTH_SECRET, 10 min, sameSite strict, path `/api/clinic`) or a password in the request; "delete" (archive_patient, archive_service) = password every time + typing the MRN/service name. No server action of the normal UI uses step-up. |

---
## 2. Roles

| Role string | Defined | Resolved from |
|---|---|---|
| `owner`, `practitioner`, `assistant` | pg enum `staff_role` (db/schema/staff.ts:19), TS `StaffRole` (clinic-app.ts:5), `STAFF_ROLES` (lib/clinic-app-nav.ts:4); label "Front desk" for assistant | `clinic_staff` row where `user_id`, `is_active`, `deleted_at is null` (`listActiveMemberships`, access.ts:17, via `withUser`+`member_read` RLS) -> `describeStaffClinics` -> `StaffClinic{id, accountId, staffId, role, name, subdomain, timezone}`. Active clinic = subdomain slug of Host (`tenantSlugFromHost`) or custom-domain lookup; must be one of the user's own memberships else 404; on hosts with neither (local/preview/vercel.app) the user's first clinic is used silently (auth.ts:235,260). A user can hold different roles in different clinics. Owner-ness for the console layout = any owner membership (`requireClinicOwner`, `ownedClinicIds`). |
| `super_admin`, `staff` (platform) | `PLATFORM_ROLES` (db/schema/staff.ts, `platform_admins.role` text) | `platformRoleOf(userId)` (access.ts:7), active rows only. Gates: `requirePlatformAdmin` (any), `requireSuperAdmin` (SA only). |
| patient | no role string | `patients.portal_user_id`; read via `getPortalRecords(userId)` using RLS `patient_self_read`. |
| invitable roles | `INVITABLE_STAFF_ROLES = [practitioner, assistant]`; owner cannot be invited, changed, or deactivated through the UI (`editableMember`, clinic-staff.ts:146), and nobody can change themself. One owner per account (`accounts.owner_user_id` unique); no ownership transfer. |

Role-based UI routing: `/clinix-ph/app/[role]` layout redirects to your own role home if the URL role differs (`app/clinix-ph/app/[role]/layout.tsx`). Owner also uses `/clinix-ph/admin` console.

---
## 3. Server action catalog (74 exported `"use server"` actions)

Tenant scoping for all clinic actions: `clinic.id` comes from `requireActive*/requireClinicRole` (session + Host), never from the form; queries run in `withTenant(clinic.id)` (sets `app.current_clinic_id`, RLS) and also carry `WHERE clinic_id`. Composite FKs `(clinic_id, x_id)` make cross-tenant ids fail at the DB. Per-action exceptions are in the "scoping" column.

### 3.1 Auth and onboarding

| # | action | file | input | role check | services | tables written | audit | scoping | RL | revalidate |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | loginAction | actions/auth.ts:36 | loginSchema {email, password} | PUB | auth.api.signInEmail | session | no | n/a | hook 30/15m IP, 10/15m email | LAND layout, redirect app |
| 2 | signupAction | auth.ts:60 | signupSchema {name 2-120, email, password 8-128} | PUB | signUpEmail, sendVerificationEmail | user, account, verification | no | n/a | hook 5/h IP; send-verif 10/h IP, 3/h email | none |
| 3 | resendVerificationAction | auth.ts:91 | {email} | PUB | sendVerificationEmail | verification | no | n/a | 10/h IP, 3/h email | none |
| 4 | socialSignInAction | auth.ts:116 | socialSignInSchema {provider google/apple/facebook, intent login/signup} (`.parse`, throws on bad input) | PUB | signInSocial | session/account | no | n/a | 30/15m IP | redirect |
| 5 | requestPasswordResetAction | auth.ts:132 | {email} | PUB | requestPasswordReset | verification | no | n/a | 10/h IP, 3/h email | none |
| 6 | resetPasswordAction | auth.ts:156 | resetPasswordSchema {token, password 8-128} | PUB | resetPassword | account | no | n/a | 10/15m IP | none |
| 7 | signOutAction | auth.ts:178 | none | none checked (signOut is a no-op without session) | signOut | session | no | n/a | none | LAND layout |
| 8 | completeOnboardingAction | actions/onboarding.ts:26 | onboardingSchema {clinicName, subdomain (3-40, reserved list), specialty dental/vet/eye/derma, branchName, branchCity, primaryColor, secondaryColor, font, staffEmail|"", staffRole} | requireUser (any verified user; one account per owner enforced by unique) | createClinicWorkspace, emailStaffInvite | accounts, subscriptions (trialing, tier_1, slots 1, trial 15d), clinics, domain_lookups, clinic_staff (owner), staff_invites | NO | ids generated server-side | onboarding 10/h user | ADM layout |

### 3.2 Clinic staff and invites (actions/clinic-staff.ts)

| # | action | input | role check | services | tables | audit | RL | revalidate |
|---|---|---|---|---|---|---|---|---|
| 9 | inviteStaffAction (:42) | inviteStaffSchema {email, role practitioner/assistant} | RACO | inviteStaffAndEmail -> createStaffInvite, emailStaffInvite | staff_invites | yes staff_invite create | clinic-invite 20/h owner | ADM(staff) |
| 10 | resendInviteAction (:63) | {inviteId} | RACO | getInvite, inviteStaffAndEmail | staff_invites | yes | clinic-invite (shared bucket) | ADM(staff) |
| 11 | revokeInviteAction (:76) | {inviteId} | RACO | revokeStaffInvite | staff_invites | yes (delete) | none | ADM(staff) |
| 12 | changeRoleAction (:102) | changeRoleSchema {staffId, role practitioner/assistant} | RACO | changeStaffRole (not owner, not self) | clinic_staff | yes staff update | none | ADM(staff) |
| 13 | setStaffActiveAction (:109) | setActiveSchema {staffId, active} | RACO | setStaffActive (not owner, not self) | clinic_staff.is_active | yes (delete on deactivate) | none | ADM(staff) |
| 14 | acceptStaffInviteAction (:119) | joinSchema {token 20-200, name <=120, password 8-128} | PUB (token) | findOpenStaffInvite, claimStaffInvite, acceptWithAccount, joinClinic, releaseStaffInvite | staff_invites, user/account/session, clinic_staff | yes staff create (actor = joining user) | staff-invite-accept 10/h IP + auth hooks | redirect |

### 3.3 Platform (company admin) actions

| # | action | file | input | role check | services | tables | audit | scoping | RL |
|---|---|---|---|---|---|---|---|---|---|
| 15 | inviteAdminAction | platform-staff.ts:43 | inviteAdminSchema {email} | SA | inviteAndEmail | platform_invites | no | global | platform-invite 20/h |
| 16 | revokeInviteAction | :63 | {inviteId} | SA | revokePlatformInvite | platform_invites | no | global | none |
| 17 | setStaffActiveAction | :71 | staffChangeSchema {userId, active} | SA | setPlatformStaffActive (not self, only role=staff rows) | platform_admins | no | global | none |
| 18 | acceptInviteAction | :88 | acceptInviteSchema {token, name, password} | PUB (token) | claimInvite, acceptWithAccount, grantPlatformStaff | platform_invites, user/account, platform_admins(role staff) | no | global | 10/h IP |
| 19 | adminLoginAction | :133 | loginSchema | PUB, then platformRoleOf active else signOut | signInEmail | session | no | global | auth hooks |
| 20 | createTenantAction | tenants.ts:19 | newTenantSchema {companyName, ownerName, ownerEmail, subdomain, branchName, branchCity, specialty, tier tier_1..4, plan trial/active} | PA (any platform role, including `staff`) | createTenant, auth.api.requestPasswordReset | user (new, verified, no password), accounts, subscriptions (active => 30-day period), clinics, domain_lookups, clinic_staff, audit_logs | yes (entity account) | ids server-generated | tenant-create 30/h |
| 21 | setTenantAiAccessAction | tenants.ts:56 | {accountId uuid, enabled} | SA | setTenantAiAccess | accounts.ai_assistant_enabled | no | accountId from client (SA only) | none |
| 22 | saveKeyAction | ai-settings.ts:19 | saveKeySchema {name gemini_api_key/anthropic_api_key, key 20-300 no spaces} | SA | verifyProviderKey (external call), saveSecret (AES via secret-box) | platform_secrets | no | global | ai-settings 20/h |
| 23 | removeKeyAction | :35 | removeKeySchema {name} | SA | removeSecret | platform_secrets | no | global | none |
| 24 | setPatientDataAiAction | :44 | {allow} | SA | setSetting | platform_settings (allow_patient_data_ai) | no | global | none |

Revalidates: 15-17 `/admin/staff`; 20-21 `/admin/tenants`; 22-24 `/admin/ai-settings`.

### 3.4 Patients, appointments, notes

| # | action | file | input | role check | services | tables | audit | RL | revalidate |
|---|---|---|---|---|---|---|---|---|---|
| 25 | addPatientAction | clinic-app.ts:46 | newPatientSchema {firstName, lastName, sex F/M, dateOfBirth, phone (PH mobile), philhealth (NN-NNNNNNNNN-N), oscaId, pwdId, consent="on"} + `cf.<key>` custom fields (validated, only fields `visibleTo(role)`) | RCR(O,A) | createPatient | patients (MRN, dataPrivacyConsentAt) | yes patient create | CW120 | APP |
| 26 | addWalkInAction | :71 | walkInSchema {patientId, practitionerStaffId|"", chairOrRoom <=40} | RAC (any staff incl. P) | addWalkIn | appointments | yes | CW120 | APP |
| 27 | changeStatusAction | :90 | statusChangeSchema {appointmentId, to confirmed/checked_in/in_progress/completed/cancelled/no_show} | RAC; P limited to own `practitioner_staff_id` | changeAppointmentStatus | appointments.status | yes | none | APP |
| 28 | updatePatientAction | :115 | editPatientSchema (8 fields) + id | RCR(O,A) | updatePatient | patients | yes (diff tagged `via:"assistant"` even for form edits, clinic-app.ts:529) | CW120 | APP, ADM(patients,L) |
| 29 | setPatientArchivedAction | :137 | {id, archived true/false} | RCR(O,A) | setPatientArchived | patients.deleted_at | yes (delete/update, also tagged `via:"assistant"` :545) | none | APP, ADM(patients,L) |
| 30 | bookAppointmentAction | appointments.ts:41 | bookAppointmentSchema {patientId, serviceId|"", practitionerStaffId|"", date, time} | RCR(O,A) | bookAppointment (assertPractitionerFree) | appointments (status confirmed, source phone) | yes | CW120 | APP, ADM(appointments) |
| 31 | rescheduleAppointmentAction | :66 | {appointmentId, practitionerStaffId|"", date, time} | RCR(O,A) | rescheduleAppointment | appointments | yes | CW120 | APP, ADM(appointments) |
| 32 | cancelAppointmentAction | :90 | {appointmentId} | RCR(O,A) | changeAppointmentStatus(to cancelled) | appointments | yes | none | APP, ADM(appointments) |
| 33 | searchPatientsForBookingAction | :106 | query 2-60 | RCR(O,A) | listPatients | none (read) | no (read) | none | none |
| 34 | saveNoteAction | clinical-notes.ts:27 | clinicalNoteSchema {subjective, objective, assessment, plan each <=4000, at least one non-empty, appointmentId|""} + raw patientId, noteId, amendsNoteId | RCR(O,P) | createClinicalNote / updateClinicalNote | clinical_notes | yes | CW120 | APP, ADM(patients,L) |
| 35 | voidNoteAction | :52 | voidNoteSchema {noteId, reason 5-300} | RCR(O,P) + author-only in service | voidClinicalNote | clinical_notes.deleted_at + data.voidReason | yes (delete) | none | APP, ADM(patients,L) |

### 3.5 Billing, claims

| # | action | file | input | role check | services | tables | audit | RL | revalidate |
|---|---|---|---|---|---|---|---|---|---|
| 36 | checkoutAction | billing.ts:38 | checkoutSchema {patientId, appointmentId|"", lines[{serviceId, quantity 1-99}] max 30, planItemIds max 60, discount{type none/senior_citizen/pwd/saved/custom, savedId, idNumber, label, customKind, customValue}, payNow (pesos|empty = all), method cash/gcash/maya/card, referenceNumber, installmentCount 0-24, firstDueOn, recallMonths 0-24, recallReason}; prices re-read server-side | RCR(O,A); custom one-off discount O only (billing.ts:91) | checkout | invoices, invoice_line_items, payments, invoice_installments, treatment_plan_items.invoice_id, recalls | yes invoice create | CW120 | APP, ADM(billing,L), ADM(patients,L) |
| 37 | recordPaymentAction | :82 | recordPaymentSchema {invoiceId, amount>0, method, referenceNumber (>=4 chars if not cash)} | RCR(O,A) | recordPayment | payments, invoices | yes | CW120 | same |
| 38 | voidInvoiceAction | :101 | voidInvoiceSchema {invoiceId, reason 5-300} | RCR(O) | voidInvoice | invoices (status void), treatment_plan_items.invoice_id=null | yes (delete) | none | same |
| 39 | saveDiscountTypeAction | :117 | discountTypeSchema {name 2-60, description, kind percent/fixed, value, requiresId} + id | RACO | saveDiscountType | discount_types | yes | none | ADM(settings) |
| 40 | setDiscountArchivedAction | :134 | {id, archived} | RACO | setDiscountArchived | discount_types.archived_at | yes | none | ADM(settings) |
| 41 | saveClaimAction | claims.ts:24 | claimInputSchema {patientId, payorType hmo/philhealth, payorName 2-80, memberOrPolicyNumber, loaNumber, claimAmountCents (pesos 1-10,000,000), receiptNumber, notes} + id | RCR(O,A) | createClaim / updateClaim | hmo_claims | yes | CW120 | APP, ADM(claims) |
| 42 | setClaimStatusAction | :46 | claimStatusSchema {id, status} | RCR(O,A); status `withdrawn` O only (claims.ts:51) | setClaimStatus | hmo_claims | yes (delete for withdrawn) | none | APP, ADM(claims) |

### 3.6 Dental (actions/dental.ts)

| # | action | input | role check | services | tables | audit | RL |
|---|---|---|---|---|---|---|---|
| 43 | createPlanAction (:43) | planInputSchema {patientId, title 2-100, notes, phaseLabels (lines, max 8)} | RCR(O,P) | createPlan | treatment_plans | yes | CW200 |
| 44 | addPlanItemAction (:58) | planItemSchema {planId, serviceId|"", description, price, phase 1-8, tooth, surfaces, chartCode, quantity 1-32} | RCR(O,P); custom work + price override O only (service layer) | addPlanItem | treatment_plan_items, plan status refresh | yes | CW200 |
| 45 | setPlanStatusAction (:75) | planStatusSchema {planId, status draft/proposed/accepted/cancelled} | RAC; A allowed only `proposed`,`accepted` (dental.ts:80) | setPlanStatus | treatment_plans | yes (delete when cancelled) | none |
| 46 | markItemDoneAction (:103) | itemIdSchema {itemId} | RCR(O,P) | markPlanItemDone | treatment_plan_items, dental_chart_entries (if tooth+chartCode), plans | yes | none |
| 47 | markItemNotDoneAction (:106) | {itemId} | RCR(O,P) | markPlanItemNotDone | treatment_plan_items, dental_chart_entries (voided) | yes | none |
| 48 | cancelItemAction (:109) | {itemId} | RCR(O,P) | cancelPlanItem | treatment_plan_items | yes (delete) | none |
| 49 | addChartEntryAction (:115) | chartEntrySchema {tooth (FDI via isTooth), code (CHART_CODES), surfaces, note <=300, occurredOn} + patientId | RCR(O,P) | addChartEntry | dental_chart_entries | yes | CW200 |
| 50 | voidChartEntryAction (:133) | chartVoidSchema {entryId, reason 5-300} | RCR(O,P) | voidChartEntry | dental_chart_entries.voided_at | yes (delete) | none |
| 51 | addRecallAction (:149) | recallInputSchema {patientId, months 1-24 (default 6), reason <=80} | RCR(O,A,P) | createRecall | recalls | yes | none |
| 52 | closeRecallAction (:158) | {id, outcome completed/cancelled} | RCR(O,A,P) | closeRecall | recalls | yes (delete if cancelled) | none |
| 53 | sendRecallReminderAction (:172) | {id} | RCR(O,A) | sendRecallReminder | recalls (notified), email out | yes | recall-send 60/h |

All 11 call `refresh()` = APP, ADM(patients,L), ADM(recalls) (dental.ts:18). Tenant scoping: clinic.id via RCR/RAC; `patientId` etc. client-supplied but looked up with `clinic_id =` and composite FKs (createRecall/createClinicalNote rely on the FK only).

### 3.7 Domain, inventory, fields, import, portal, reminders, services

| # | action | file | input | role check | services | tables | audit | RL | revalidate |
|---|---|---|---|---|---|---|---|---|---|
| 54 | searchDomainsAction | domain.ts:22 | query 2-100 | RW (owner of any clinic) | searchDomains (registrar API) | none | no | domain-search 30/h | none |
| 55 | startDomainCheckoutAction | :41 | {domain 4-253, provider} | RW | startDomainCheckout (price re-read server-side, payment provider checkout) | domain_orders | yes (entity domain_order) | domain-checkout 10/h | none; clinic = `workspace.clinics[0]` (domain.ts:49) not the host's clinic |
| 56 | saveItemAction | inventory.ts:27 | itemInputSchema {name 2-120, sku <=40, unit <=20, reorderThreshold} + id | RACO | createItem/updateItem | inventory_items | yes | CW240 | APP, ADM(inventory) |
| 57 | setItemArchivedAction | :47 | {id, archived} | RACO | setItemArchived | inventory_items.deleted_at | yes | none | same |
| 58 | receiveStockAction | :63 | receiveStockSchema {itemId, quantity 1-100000, lotNumber, expiresOn} | RACO | receiveStock | inventory_batches | yes (inventory_item update) | CW240 | same |
| 59 | consumeStockAction | :81 | useStockSchema {itemId, quantity, reason <=120} | RAC (any staff) | consumeStock | inventory_batches | yes | CW240 | same |
| 60 | writeOffExpiredAction | :99 | {id} | RACO | writeOffExpired | inventory_batches (qty 0) | yes only if batches affected | none | same |
| 61 | saveFieldAction | patient-fields.ts:38 | fieldDefinitionInputSchema {label 2-60, type, options (>=2 for select), required, medical, section} + id | RCR(O,P) + `canManageField` (P only own add-ons) | create/updateFieldDefinition | patient_field_definitions | yes | CW200 | ADM(settings), APP, ADM(patients,L) |
| 62 | setFieldArchivedAction | :67 | {id, archived} | RCR(O,P) + canManageField | setFieldArchived | patient_field_definitions | yes | none | same |
| 63 | moveFieldAction | :80 | {id, direction} | RCR(O,P) + canManageField | moveField | patient_field_definitions | yes | none | same |
| 64 | addSuggestedFieldsAction | :93 | label[] max 30 | RACO | addSuggestedFields | patient_field_definitions | yes | none | same |
| 65 | copyFieldsAction | :107 | {sourceClinicId} | RACO; source must be another clinic where caller is owner (from session list) | copyFieldsFromClinic | patient_field_definitions | yes | none | same |
| 66 | savePatientFieldsAction | :122 | {patientId} + `cf.<key>` | RAC (any staff; A only non-medical fields) | savePatientCustomFields | patients.custom_fields | yes (field keys only) | CW200 | same |
| 67 | importPatientsAction | patient-import.ts:24 | CSV file <=1MB, <=500 rows, intent preview/import, consent="on" | RACO | parsePatientImport, createPatient per row | patients | yes per row | clinic-import 20/h (preview counts) | APP, ADM(patients) |
| 68 | invitePatientAction | patient-portal.ts:26 | invitePatientSchema {patientId, email} | RCR(O,A) | createPatientInvite, emailPatientInvite | patient_invites | yes (patient update `portalInvite`) | patient-invite 30/h | none |
| 69 | acceptPatientInviteAction | :47 | joinSchema | PUB (token) | claimPatientInvite, acceptWithAccount, linkPortalUser | patient_invites, user/account, patients.portal_user_id | yes (actor = patient user) | 10/h IP + hooks | redirect |
| 70 | setRemindersEnabledAction | reminders.ts:14 | {enabled} | RACO | setRemindersEnabled | clinics.reminders_enabled | yes (entity account) | none | ADM(reminders) |
| 71 | sendReminderNowAction | :24 | {appointmentId} | RCR(O,A) | sendReminder | reminder_log | yes if actor | reminder-send 60/h | ADM(reminders) |
| 72 | savePatientEmailAction | :38 | patientEmailSchema {patientId, email|""} | RCR(O,A) | inline `withTenant` UPDATE + audit inside the action file (layering deviation) | patients.contact_email | yes (diff only "set"/"cleared"; does not exclude archived patients) | none | APP, ADM(patients,L) |
| 73 | saveServiceAction | services.ts:21 | serviceInputSchema {name 2-120, code, category, durationMinutes 5-600, priceCentavos (0-1,000,000 pesos), vatExempt} + id | RACO | createService/updateService | services | yes | CW120 | ADM(services) |
| 74 | setServiceArchivedAction | :43 | {id, archived} | RACO | setServiceArchived | services.deleted_at | yes | none | ADM(services) |

### 3.8 Non-action entry points (route handlers, cron, AI)

| Route | Auth | Notes |
|---|---|---|
| `GET /api/clinic/export?kind=patients|receipts|inventory|claims` | getAgentClinic, role owner only | CSV, formula-injection escaped (csv.ts:6), audit row (entity export, action view), RL 20/h. `patients` export uses `listPatients` and is capped at 200 rows (clinic-app.ts:212,237; exports.ts:23). |
| `GET /api/clinic/import-template` | none required (custom columns only if owner) | no patient data |
| `POST /api/clinic/agent` | getAgentClinic + `clinicAiAccess` (owner AND account.ai_assistant_enabled AND platform setting allow_patient_data_ai) | RL 30/10min |
| `POST /api/clinic/agent/confirm` | same + step-up | RL 40/10min; 16 action kinds: create_patient, update_patient, archive_patient, restore_patient, book_appointment, reschedule_appointment, create_service, update_service, archive_service, restore_service, create_item, receive_stock, use_stock, file_claim, set_claim_status (not withdrawn), change_appointment_status (confirmed/cancelled/no_show). Risk create 60/day, edit 40/day, delete 5/day per clinic; proposals expire in 10 min, bound to user+clinic, claimed with guarded UPDATE. Rows in `agent_actions`; underlying services write the normal audit rows. |
| `POST /api/admin/agent`, `/confirm` | PA to ask, SA only to propose/confirm (re-checked at confirm) | 5 kinds: invite_admin, set_staff_active, set_tenant_status (masterlocked/active), set_tenant_ai_access, change_tenant_tier. TTL 15 min. RL 30/10min. |
| `GET /api/cron/reminders` | `Authorization: Bearer $CRON_SECRET`, timing-safe compare, 503 if unset | runs `runDailyReminders` then `runDailyRecalls` for clinics with `reminders_enabled`; no RL |
| `POST /api/webhooks/[provider]` | provider signature verified before acting (`parseWebhook`), then `confirmPaid` against provider API, guarded status updates | RL 300/min per IP |
| `GET /api/handoff`, `GET /clinix-ph/open-domain` | one-time token session handoff to a sold custom domain | |

---
## 4. Implemented permission matrix (code) vs docs/real-data-roadmap.md section 2

C/R/U/D; "D" = archive/void/cancel (no hard deletes exist). "-" = none. Reads are decided by pages (`app/clinix-ph/...`) and components, since services do not check roles; this is a server-side page gate (404/redirect), not a client-only check.

### Services and prices
| Role | Code | Roadmap | Difference |
|---|---|---|---|
| O | CRUD+restore (actions 73-74, console page RACO) | CRUD | match |
| A | R (checkout and booking pages list services); no console page | R | match |
| P | R only inside the treatment-plan picker (patient-dental.tsx:16); no price-list page | R | code allows less (no price list view) |
| PT | - | R | code allows less |

### Patients
| Role | Code | Roadmap | Difference |
|---|---|---|---|
| O | C,R,U,D(archive), CSV import, custom fields | CRUD | match (+import/export) |
| A | C,R,U,D(archive), set contact email, portal invite; custom fields non-medical only | CRUD | match |
| P | R all clinic patients (not only own), no archived view (patients/[mrn]/page.tsx:17); no demographic edit; may write custom fields incl. medical for ANY patient (action 66) | R; U contact only for own | code allows less on contact edit (none); allows more on custom-field write and R scope (all patients, not own) |
| PT | R own: name, MRN, non-medical custom fields only (no DOB, phone, IDs) | R own | code allows less |
| All | Opening a chart writes audit `view` (clinic-app.ts:686); patient list and notes list reads are not audited | every view audited | gap |

### Appointments
| Role | Code | Roadmap | Difference |
|---|---|---|---|
| O, A | C (book), C (walk-in), U (reschedule, status), D (cancel), R all | CRUD | match |
| P | R own (calendar filtered by staffId); status change on own only (actions/clinic-app.ts:96 passes `onlyPractitionerStaffId`; services/clinic-app.ts:412 enforces); can create walk-ins for any patient/practitioner (action 26, RAC) | R own, U status/notes on own | code allows more (walk-in creation, assigning other practitioners); cancel own also possible (status cancelled) |
| PT | R own upcoming/past (portal) | R own | match |

### Clinical notes
| Role | Code | Roadmap | Difference |
|---|---|---|---|
| O | C (actions 34-35 allow owner), R all notes of patient, U/D only own authored notes | R only | code allows more (owner writes notes) |
| A | - (chart page hides notes: patients/[mrn]/page.tsx:21) | - | match |
| P | C own, U own within 24h (strict `<`), amend any time (new note with `amendsNoteId`), D = void own with reason, R all notes of that patient by any author | CRU own, amend after 24h, void | match; R scope wider (other authors' notes visible) |
| PT | - (portal excludes notes explicitly) | R own summary | code allows less |

### Invoices and payments (receipts)
| Role | Code | Roadmap | Difference |
|---|---|---|---|
| O | C (checkout), R, add payment, void; one-off custom discount; no edit of an issued invoice | CRUD (void) | match; no U exists for anyone |
| A | C, R, add payment; statutory + saved discounts allowed; cannot void; cannot give one-off discount | CRU (void needs owner) | match |
| P | - (billing pages RCR(O,A)); plan page hides billing link | R own patients' | code allows less |
| PT | R own receipts: number, date, total, status (no lines/payments), `paid/open/void` | R own receipts | match (reduced) |
| Discount types (saved discounts) | O CRUD/archive | not in roadmap | extra |

### Inventory
| Role | Code | Roadmap | Difference |
|---|---|---|---|
| O | CRUD(archive), receive stock, write-off expired, record use, R | CRUD | match |
| A | R, record use | R, record use | match |
| P | R, record use | R, record use | match |
| PT | - | - | match |

### Claims (not in roadmap table)
| Role | Code |
|---|---|
| O | C,R,U (open claims), status changes, withdraw (= delete) |
| A | C,R,U, status changes except withdrawn |
| P, PT | - |

### Staff and roles
| Role | Code | Roadmap | Difference |
|---|---|---|---|
| O | R staff page, invite practitioner/assistant, resend, revoke, change role (non-owner), deactivate/reactivate (non-owner, not self) | CRUD (deactivate) | match; cannot add/transfer owner |
| A, P, PT | - | - | match |

### Settings
| Role | Code | Roadmap | Difference |
|---|---|---|---|
| O | R settings page; U only: reminders toggle, discount types, patient fields, custom-domain purchase. NO action edits clinic name, address, phone, timezone, hours, branding, logo, or adds a branch (`update(clinics)` only at reminders.ts:117) | U | code allows less |
| A, P, PT | A/P: - ; P manages own patient-field add-ons only | - | P has extra (add-on fields) |

### Subscription
| Role | Code | Roadmap | Difference |
|---|---|---|---|
| O | R subscription page only (current plan card, invoice history table is trial placeholder); only mutation is the one-time domain+first-month payment (actions 54-55 -> webhook) | U | code allows less (no upgrade, cancel, renew, payment method) |
| PA/SA | SA: lock/unlock, change tier (via AI assistant confirm only, no UI action); PA: create tenant | n/a | |

### Tenants (platform)
| Role | Code |
|---|---|
| SA | create tenant, invite/deactivate team, change tier, lock/unlock, grant AI, AI keys and settings |
| PA staff | read admin pages (tenants, billing, audit, support, modules, feedback, assistant ask) and **create tenant** (action 20 uses `requirePlatformAdmin`, not SA) |

### AI settings
| Role | Code |
|---|---|
| SA | save/remove provider keys, set `allow_patient_data_ai`, grant per-tenant AI (actions 21-24) |
| O (tenant) | may use clinic assistant only if account granted AND platform flag on (`ai-access.ts clinicAiAccess`) |
| others | - |

### Reminders
| Role | Code |
|---|---|
| O | toggle on/off, R stats, send now, edit patient email |
| A | send now, edit patient email, R candidates only if page reachable (reminders page is RACO, so effectively none) |
| P, PT | - |

### Import / export
| Role | Code |
|---|---|
| O | import patients (CSV, preview then import), export patients/receipts/inventory/claims CSV (audited) |
| A, P, PT | - |

### Dental chart (tooth chart)
| Role | Code |
|---|---|
| O, P | C, R, D(void with reason); no edit (void and re-add) |
| A | - (chart hidden: patient-dental.tsx:13-18) |
| PT | - |

### Treatment plans
| Role | Code |
|---|---|
| O | C plan, C item (service price override and custom work), R, status changes, mark done/not done, cancel item, cancel plan |
| P | same except custom work/price override |
| A | R; status only `proposed`/`accepted` (dental.ts:80); cannot create, reopen, cancel |
| PT | - |

### Recalls
| Role | Code |
|---|---|
| O, A | C, R, close (completed/cancelled), email reminder |
| P | C, R, close; cannot email (recalls-page.tsx:14) |
| PT | - |

### Patient portal
| Role | Code |
|---|---|
| O, A | invite patient (action 68) |
| P | cannot invite (chart `canInvite = role !== "practitioner"`) |
| PT | R own: clinic name, MRN, name, upcoming visits, last 20 completed visits, last 50 receipts (number/date/total/status), non-medical custom fields. No writes (no actions exist for PT). |

Summary of differences vs roadmap
- Code allows MORE: owner can write clinical notes; practitioner creates walk-ins (any patient/practitioner), writes custom fields on any patient, sees all patients and all authors' notes; any staff can run `changeStatusAction` within role limits; platform `staff` can create tenants.
- Code allows LESS: practitioner has no invoice access and no contact edit; patient sees no notes summary, limited demographics; owner cannot edit clinic profile/branding/timezone/hours or manage subscription; practitioner has no price-list page.
- Roadmap says "invite by email/OTP"; implemented as link token + password, no OTP.
- Roadmap says senior/PWD maths in `pos-totals.ts`; the maths actually used is `invoice-totals.ts invoiceTotalsFor` (see section 6). `posTotals()` is not called anywhere (only `VAT_RATE`, `STATUTORY_DISCOUNT_RATE` are imported).
- Roadmap says "every patient-record view writes audit_logs": only the chart open and CSV export do.

---
## 5. Subscription, billing, Masterlock

Data: `subscriptions(accountId unique, tier tier_1..4|enterprise, billingInterval, status trialing|active|past_due|masterlocked|canceled, clinicSlotLimit, trialEndsAt, currentPeriodEndsAt, stripe ids unused)`. `TRIAL_DAYS = 15` (constants.ts:29).

| Concern | Where / what exists | Missing |
|---|---|---|
| Trial start | `createClinicWorkspace` (onboarding.ts:64-75): status `trialing`, tier_1, slots 1, `trialEndsAt = now+15d`. `createTenant` (tenant-admin.ts:52-60): `plan:"trial"` same; `plan:"active"` => status active, `currentPeriodEndsAt = now+30d`. | |
| Trial expiry | Display only: `daysLeft()` in workspace.ts:32 and `tenants.ts` (admin list shows "Trial"/renews date). | **No enforcement and no job** that flips `trialing` to anything when `trialEndsAt` passes; cron only does reminders/recalls. |
| Lock (Masterlock) | Setter only: `setTenantSubscriptionStatus(accountId, "masterlocked"|"active")` (tenant-admin.ts:91), reachable only through the SA AI assistant confirm (`agent-actions.ts set_tenant_status`). Tool text claims "Locking blocks login" (agent/admin-tools.ts:108). | **Status is never read by any auth or access function** (`requireUser`, `requireActiveClinic`, `getAgentClinic`, services, proxy.ts). A locked tenant keeps full access. Only `tenants.ts` maps masterlocked to the label "Past due" and current-plan-card shows "Locked". |
| Unlock by payment | `fulfillPaidOrder` (domain-orders.ts:~195-205) sets status `active`, `trialEndsAt=null`, `currentPeriodEndsAt=now+30d` unconditionally, even for a masterlocked tenant. Only automated path to `active`. | Not a renewal system; one 30-day period per domain purchase. |
| Tier / clinic limit | `changeTenantTier` (tenant-admin.ts:99) refuses a tier whose slots < existing clinics (`TierTooSmallError`); `SLOTS = {1,2,3,4}`. | **No enforcement at clinic creation** (no add-branch action exists at all; onboarding allows exactly one workspace). `clinicSlotLimit` is otherwise unused. |
| MRR / status labels | `tenants.ts TIER_MRR` (1490, 2690, 3690, 4590 PHP), `STATUS` map. | |
| Renewals, invoices, dunning | none. `invoice-history-table.tsx` is a placeholder. | Renewal charge, recurring billing (stripe fields unused), `past_due` transition, grace period, cancellation, upgrade/downgrade by owner, proration, receipts for subscription payments, email reminders for trial end. |
| Audit | `createTenant` writes an audit row; tier change, lock/unlock, AI grant write none (no clinic id). | |

---
## 6. Business rules (testable)

### Money and discounts (`src/lib/invoice-totals.ts`, `discounts.ts`, `installments.ts`, `pos-totals.ts`)
- Constants: `VAT_RATE = 12`, `STATUTORY_DISCOUNT_RATE = 20` (pos-totals.ts:2-3). All money integer centavos.
- `invoiceTotalsFor(lines, rule)`: per line `gross = unitPriceCents*quantity`; `subtotal = sum(gross)`; `vatInside = line.vatExempt ? 0 : gross - round(gross/1.12)`.
  - `none`: `vat = sum(vatInside)`, `total = subtotal`, discount 0, vatExempt 0.
  - `statutory` (senior_citizen or pwd), per line: `base = gross - vatInside`; `discount = round(base*20/100)`; `vatExemptCents += vatInside`; `total += base - discount`. Example: 100000c VATable line -> vatInside 10714, base 89286, discount 17857, total 71429, vatExempt 10714. VAT-exempt (service flag) line 100000 -> base 100000, discount 20000, total 80000, vatExempt 0. `vatCents` stays 0 for statutory.
  - `percent`: `wanted = round(subtotal*clamp(percent,0,100)/100)`; `fixed`: `max(0,cents)`; `discountTotal = min(wanted, subtotal)`; spread over lines by gross weight with floor then remainder +1 from the first positive-weight line (`spread`), `vatCents = sum(round(vatInside*after/gross))` (0 if gross 0); `total = subtotal - discountTotal`.
- `parseDiscountAmount`: percent must be a whole integer 1-100; fixed pesos >0 and <=1,000,000 -> centavos.
- `posTotals(prices, senior)` (pos-totals.ts:25): float math, no rounding, not used by any code path.
- Checkout (`billing.ts:98`): patient must exist and not be archived; each `serviceId` must be live in this clinic else `InvalidServiceError`; plan items must belong to this patient, `invoice_id is null`, item status != cancelled, plan status not cancelled and not draft (so `proposed`/`accepted`/`in_progress`/`completed` plans are billable; done status NOT required), locked `FOR UPDATE`; prices come from `services` and plan item rows, never the form. `payNow` empty = full total; `payNow > total` -> error; `balance = total - payNow`; status `paid` if balance 0 else `open`; `payNow = 0` allowed (no payment row, method not required); payment row only if `payNow > 0`; non-cash needs `referenceNumber` >= 4 chars (schema). Discount: senior/PWD need `idNumber` >= 4 chars (schema; not checked against the patient's stored OSCA/PWD ID); `saved` must be non-archived in this clinic, `requiresId` => idNumber >= 4; `custom` O only.
- Installments: `installmentCount` 0-24; requires balance > 0 and `firstDueOn >= clinic-local today`; `buildInstallments`: equal floor parts, last takes remainder; `dueOn = addMonths(firstDueOn, i)` clamped to month end. `installmentStatuses`: down payment = `total - sum(installments)`; money paid beyond it fills installments oldest first; state paid/partial/due (due today)/overdue (past)/upcoming. Installments never create payments or reminders themselves.
- Receipt numbering: `OR-` + 6-digit zero pad of `count(invoices for clinic)+1` (billing.ts:61,65-70); payments `PR-` + 6 digits of `count(payments)+1`; computed inside the transaction after `pg_advisory_xact_lock(hashtext("<kind>:<clinicId>"))`. Voided invoices keep their number and still count.
- Record payment (`:208`): row locked; void -> `InvoiceAlreadyVoidError`; needs status `open` and balance > 0; `amount <= balance`; adds payment `PR-`; `status = paid` when `paidCents >= total`.
- Void invoice (`:330`): owner only; allowed from any non-void status including `paid`; sets status `void`, `voidReason`, `voidedAt`; plan items billed on it get `invoice_id = null` (billable again); payments and installments rows stay; list summary shows balance 0 for void; no refund record; linked claims untouched. Audit action `delete`.
- Recall at checkout: `recallMonths > 0` inserts a `recalls` row due `addMonths(today, months)`.

### Appointments (`clinic-app.ts`)
- Transition table `NEXT_STATUS`: requested -> confirmed|cancelled; confirmed -> checked_in|no_show|cancelled; checked_in -> in_progress|cancelled; in_progress -> completed; completed, cancelled, no_show terminal. Action schema excludes `requested` as a target. Row locked `FOR UPDATE`; practitioner role passes `onlyPractitionerStaffId` (else NotFound).
- Booking: start earlier than now-5min -> Error "That time has passed."; status `confirmed`, source `phone`; length = service `durationMinutes` or 30 (`WALK_IN_MINUTES`); patient must be live; service must be live.
- Practitioner-busy (`assertPractitionerFree`, :553): skipped if no practitioner; conflict if another non-deleted appointment of that practitioner has status in `requested, confirmed, checked_in, in_progress, completed` and `existing.start < newEnd AND existing.end > newStart` (back-to-back allowed; completed still blocks); reschedule ignores itself. Walk-ins do NOT run this check; booking does not verify the practitioner is active or has role owner/practitioner (only the composite FK to this clinic).
- Reschedule: only `requested|confirmed`; keeps duration; new start also must not be in the past (5 min grace); audit before/after.
- Walk-in: patient live, practitioner (if given) active, status `checked_in`, source `walk_in`, start now, 30 min, `queueNumber = max(queue_number among today's appointments, clinic-local day) + 1`.
- Patient create: MRN `MRN-` + 5-digit pad of `count(all patients incl. archived)+1+attempt`, up to 4 attempts on unique violation; `dataPrivacyConsentAt = now`; archive = `deleted_at` (never hard delete); edits only on non-archived rows.

### Clinical notes (`clinical-notes.ts`)
- Edit window `EDIT_WINDOW_HOURS = 24`: `now - createdAt < 24h` (strict). Edit: author only (`authorStaffId == clinic.staffId`), not voided, inside window, else `NoteLockedError`/`NotAuthorError`. After 24h the only path is a new note with `amendsNoteId` (not validated to exist, same patient or same author). Void: author only, any time, reason 5-300 chars, soft (`deleted_at` + `data.voidReason`); owner cannot edit or void others' notes. All changes audited (update stores before/after text).

### Inventory (`inventory.ts`)
- Batch per delivery (`receiveStock`): quantity 1-100000, optional lot and `expiresOn`; item must be live.
- Consume: only batches with `qty > 0` and (`expiresOn is null` or `>= today`); order `expiresOn asc nulls last`, then `receivedAt asc` (FEFO), rows locked; if sum < requested -> `InsufficientStockError(available)` and nothing changes; takes across batches; audit lists batches taken.
- Write-off: sets qty 0 on batches with `expiresOn < today`; audit only if any; item must be live.
- `stockStatus(onHand, reorderThreshold, nextExpiry, today)`: `onHand <= 0` out; `onHand <= threshold` low; `nextExpiry <= today+30d` expiring (`EXPIRY_WARNING_DAYS = 30`); else ok. `onHand` counts only non-expired batches; expired qty reported separately. Archive hides item but keeps batches; SKU unique among active items (DuplicateSkuError, also on restore).

### Claims (`claims.ts`, schemas/claim.ts)
- Statuses: filed, pending, approved, denied, resubmitted, paid, withdrawn. New claim: `filed`, `filedAt = now`. **No transition graph is enforced**: `setClaimStatus` accepts any status for any non-closed claim; closed = `paid` or `withdrawn` (immutable; edits and status changes throw `ClaimClosedError`). Side effects: `resolvedAt = now` when new status in approved/denied/paid/withdrawn else null; `resubmitted` resets `filedAt = now`. `withdrawn` requires owner (action) and is audited as `delete`.
- Open (receivable) statuses: filed, pending, approved, resubmitted. Age = `floor((now - filedAt)/86400000)` days; "over sixty" = open and age > 60. Amount 1-10,000,000 pesos. `receiptNumber` upper-cased and must exist in this clinic else `UnknownReceiptError`; claim patient is not required to match invoice patient.

### Recalls (`recalls.ts`)
- Create: due = `addMonths(today, months)` (months 1-24, default 6) in clinic time; status `pending`; type `dental_recall` always. Statuses pending -> notified (email sent) -> completed|cancelled; closing only from pending/notified (else `RecallNotFoundError`); completed stamps `completedAt`. Timing: overdue if `due < today`, soon if `due <= today+30`, else later.
- Send: needs patient email; email failure leaves status; success sets `notified`, `notifiedAt`; may be re-sent while still notified (no once-only guard). Daily job: clinics with `reminders_enabled`; recalls `pending` with `due <= today+7` (includes overdue), max 100 per clinic per run.

### Reminders (`reminders.ts`)
- Kind `day_before`, channel email. Candidates: appointments `requested|confirmed` starting from now until before the day-after-tomorrow (clinic time). Daily job sends only those starting within tomorrow's clinic-local day, with email and not already `sent`, max 200 per clinic. `sendReminder` skips if no email, status not requested/confirmed, or start in the past. Idempotency: unique `(appointment_id, kind, channel)` row in `reminder_log` claimed by upsert whose `setWhere` is `status = 'failed'` (reminders.ts:63); the in-flight placeholder is itself `status 'failed', error 'sending'`, so a concurrent second runner can claim it as well (possible duplicate send; unverified under real concurrency). Failed sends may be retried.

### Treatment plans (`treatment-plans.ts`, `lib/plan-totals.ts`)
- Plan statuses: draft, proposed, accepted, in_progress, completed, cancelled. Item statuses: planned, done, cancelled.
- Manual targets: draft, proposed, accepted, cancelled. `canSetPlanStatus`: same status ok; cancelled -> only draft; in_progress or completed -> only cancelled ("Undo the finished items to change its status"); cancelling requires no item with status `done`. `acceptedAt` set whenever status set to accepted. Assistant may only set proposed/accepted.
- Automatic (`nextPlanStatus` after any item change): cancelled stays; no active items -> completed becomes draft else unchanged; all active items done -> completed; any done -> in_progress; else completed/in_progress fall back to accepted; otherwise unchanged. Estimate excludes cancelled items.
- Items: add blocked when plan cancelled or completed; with service: price = service price unless owner passes an override, `vatExempt` copied from service; without service: owner only, description >= 3 chars, price required. Mark done: item must be `planned`, plan not cancelled; if tooth and `chartCode` present a chart entry is inserted in the same transaction. Not done: item must be `done`; linked chart entries (by `plan_item_id`) are voided with a fixed reason. Cancel item: not billed (`invoice_id` null), not done. Billing an item sets `invoice_id`; voiding the receipt clears it.

### Patient fields, import
- Max 40 active custom fields per clinic (`MAX_ACTIVE_FIELDS`); key slug from label with `_2` suffixes; type change refused if stored values do not fit; archive is soft; owner manages all, P only own add-ons; A never sees `medical` fields (`visibleTo`). Import: header must contain first_name, last_name, sex; <= 500 rows; <= 1 MB; each row validated like add-patient; preview writes nothing; import requires consent flag; rows inserted one transaction each (partial import possible on failure mid-way).

---
## 7. Security observations

Severity: H high, M medium, L low/quality. File:line as read.

| # | Sev | Observation | Location |
|---|---|---|---|
| 1 | H | Masterlock, trial expiry and `past_due` are not enforced anywhere; locked or expired tenants keep full access; the admin tool text claims "Locking blocks login". | grep: subscription `status` read only in workspace.ts:84-100 and tenants.ts; auth.ts has no check; agent/admin-tools.ts:108 |
| 2 | H | Tier clinic limit not enforced on clinic creation (no add-branch action); `clinicSlotLimit` only used by `changeTenantTier`. | tenant-admin.ts:99; onboarding action.ts:43 mentions branches that cannot be added |
| 3 | M | `fulfillPaidOrder` forces `status: "active"` on any account (also unlocks a masterlocked tenant) with a fresh 30 days. | domain-orders.ts:202 |
| 4 | M | RLS is only a backstop until `DATABASE_URL` uses `clinix_app`; per docs the app still connects as owner (BYPASSRLS). Real isolation = `WHERE clinic_id` + composite FKs. Not verifiable here. | docs/db-app-role.md; AGENTS.md |
| 5 | M | Step-up limiter counts every call, including correct passwords: 5 confirmations per 15 min per user lock the owner out of agent confirms. | step-up.ts:38 (limit consumed before verify) |
| 6 | M | Possible duplicate reminder email under concurrency (in-flight claim row is `status failed`, claim predicate is `status = failed`). | reminders.ts:63 |
| 7 | M | Destructive/sensitive UI actions need no re-auth while the AI path demands password (+typed MRN for archive): `setPatientArchivedAction`, `voidInvoiceAction`, `changeRoleAction`, `setStaffActiveAction`, `setServiceArchivedAction`, `setClaimStatusAction(withdrawn)`. Inconsistent protection. | clinic-app.ts:137; billing.ts:101; clinic-staff.ts:102,109; claims.ts:46 |
| 8 | M | Session cookie scoped to `.databridgesol.space` (all tenants and any sibling app on that domain, e.g. nlminventory named in `RESERVED_SUBDOMAINS`). | auth.ts:133; constants.ts reserved-list comment |
| 9 | M | Password reset does not explicitly revoke other sessions (option absent; library default). No "sign out everywhere". | auth.ts:104-110 (unverified default) |
| 10 | M | IP rate limits trust the first `x-forwarded-for` value (spoofable unless the edge overwrites it; Vercel does). | actions/clinic-staff.ts:126, patient-portal.ts:54, platform-staff.ts:100, webhooks route :18 |
| 11 | M | Platform-level changes have no audit trail (audit_logs requires clinic_id): tenant lock/unlock, tier change, AI grant, secrets, platform staff invites/deactivation, key save/remove. Onboarding workspace creation, login/logout and password reset also unaudited. Only AI-path actions leave `agent_actions` rows. | schema/audit.ts:15; tenant-admin.ts:91-118; platform-staff.ts; ai-settings.ts; onboarding.ts:55 |
| 12 | M | Platform `staff` (non-super) can create tenants (and thus accounts, subscriptions, owner users) because the action uses `requirePlatformAdmin`. Confirm intended. | tenants.ts:20 |
| 13 | M | Patient export is silently capped at 200 rows (`PATIENT_LIMIT`), so a clinic with more patients gets an incomplete export (data-portability gap); console patient list also capped at 200. | clinic-app.ts:212,237; exports.ts:23 |
| 14 | L | Audit mislabel: `updatePatient` and `setPatientArchived` always record `via: "assistant"` even for manual form edits. | clinic-app.ts:529,545 |
| 15 | L | Client-supplied ids used without extra validation (DB composite FK is the only guard, giving 500 instead of a clean error): `practitionerStaffId` in book/reschedule (not checked active/role, :606,643), `amendsNoteId` and `appointmentId` in notes, `appointmentId` in checkout (billing.ts:156), claim `patientId` vs invoice patient, `createRecall` patientId (recalls.ts:50). No tenant id is taken from client input for authorization; `copyFieldsAction.sourceClinicId` is validated against the caller's owned clinics (patient-fields.ts:107-113); `setTenantAiAccessAction.accountId` is SA-only (tenants.ts:56). |
| 16 | L | Senior/PWD discount ID number is only length >= 4, not matched to the patient's `oscaId`/`pwdId`; any O/A can apply the statutory discount. | schemas/invoice.ts discountSchema; billing.ts:78-81 |
| 17 | L | Practitioner can create walk-ins for any patient/practitioner and write custom fields (incl. medical) on any patient. | clinic-app.ts:71; patient-fields.ts:122 |
| 18 | L | Void invoice allowed on already-paid receipts with no refund record; payments remain with `paid_cents` intact. | billing.ts:330-346 |
| 19 | L | `socialSignInAction` uses `.parse` (throws -> 500) on tampered input; no rate limit on action itself beyond the hook. | auth.ts:117 |
| 20 | L | Multi-clinic user on a host without a tenant subdomain (local/preview/vercel.app) silently acts on `clinics[0]`; domain checkout always uses `workspace.clinics[0]` regardless of host. | auth.ts:235,260; actions/domain.ts:49 |
| 21 | L | `savePatientEmailAction` contains query and audit logic in the action (violates "thin action" rule) and updates archived patients. | actions/reminders.ts:38-52 |
| 22 | L | Tests cover pure logic only (34 `*.test.ts`); there are no permission tests per role and no action tests, although AGENTS.md requires them. | repo |

Server actions with NO role/auth check at all: only the intentionally public ones (1-6, 14, 18, 19, 69) and `signOutAction` (7). No clinic action lacks a role gate. `searchPatientsForBookingAction` (33) has a role gate but no rate limit.

Actions without any rate limit (by number, excluding the auth ones covered by the better-auth hook): 7, 11-13, 16, 17, 21, 23, 24, 27, 29, 32, 33 (read), 35, 38-40, 42, 45-48, 50-52, 57, 60, 62-65, 70, 72, 74. Highest-risk of these: 29 (archive patient), 38 (void receipt), 42 (claim status/withdraw), 12-13 (role change/deactivate), 72 (email edit).

Mutating actions without an audit row: 1-8 (auth, onboarding), 15-19, 21-24 (platform), 54 (read-only search), 33 (read). All clinic writes in sections 3.2, 3.4-3.7 write audit rows.

Tenant id from client input: none used for authorization in clinic actions. Platform actions take `accountId` from the form but are SA-only.
