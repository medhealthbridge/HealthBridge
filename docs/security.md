# Security model (short)

## Who can become what

| Role | How it is granted | What cannot grant it |
|---|---|---|
| Company admin (`platform_admins`) | `scripts/seed-super-admin.mjs` run with the owner DB URL, or a single-use emailed invite from the super admin (always the `staff` role) | Sign-up, the auth API, any form field |
| Clinic owner | Completing onboarding (each user owns only the clinic they create) | Staff invites (only practitioner or assistant are invitable) |
| Practitioner / assistant | A single-use invite from that clinic's owner; the role comes from the invite row on the server | Anything the invitee sends |
| Patient (portal) | A single-use invite from the clinic | Sign-up |

Every protected page and action re-reads the role from the database (`requireClinicRole`, `requirePlatformAdmin`,
`requireSuperAdmin`); nothing trusts a role sent by the browser.

## The auth API is closed to direct calls

`/api/auth/*` (better-auth) only answers the email links and OAuth callbacks listed in `src/lib/auth-routes.ts`.
Sign-up, sign-in, update-user, sessions and every other endpoint return **404** to Postman, curl or scripts on
every host. The app calls them from its own Server Actions instead, which add the checks above (for example, the
admin sign-in signs out anyone who isn't DataBridgeSol staff). Adding a client-side better-auth call means adding
its path to that allowlist on purpose.

## Unverified accounts belong to nobody

Anyone can type any email into sign-up, so an account that hasn't been verified is not trusted. When the real owner
of the address shows up, their password replaces whatever was set before (`replaceUnverifiedPassword`):
a new sign-up for that email does it, and so does accepting an emailed invite (which also verifies the address).
This stops "register the dentist's email first, then sign in after they verify it". An invite never changes a
clinic owner's role, and an owner can't be edited or deactivated by anyone.

## Other protections

- Email verification is required before any signed-in page; sign-up and reset never reveal whether an email exists.
- Rate limits on sign-in, sign-up, reset, invites, exports, the AI assistant and every clinic write.
- A password reset signs out every device (`revokeSessionsOnPasswordReset`).
- Tenant isolation: every query filters by clinic, and Postgres row-level security backs it up once the app runs as
  `clinix_app` (docs/db-app-role.md). That role cannot hard-delete money or clinical rows.
- Money and clinical rules are also CHECK constraints in the database (migration 0021).
- Strict security headers (CSP, HSTS, frame-ancestors none, nosniff) in `next.config.ts`; CSV exports neutralise formulas.
- Cron needs `CRON_SECRET` (constant-time compare); payment webhooks verify the signature and re-check with the provider.

## Still on the owner's list

1. Set `BETTER_AUTH_SECRET` (long random) in Vercel production; it signs session cookies.
2. Switch `DATABASE_URL` to `clinix_app` so row-level security applies to the app.
3. Rotate the Neon and Resend credentials that were exposed earlier.
4. Consider two-factor sign-in for company admins (better-auth `twoFactor` plugin).
