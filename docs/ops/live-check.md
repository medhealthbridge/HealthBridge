# Live verification: DataBridgeSol / Clinix PH (FR-115, K-603, T-422)

Run in production before the pilot. Record date, who, result and evidence (no secrets, no personal data).

| # | Check | Result | Date | By |
|---|---|---|---|---|
| 1 | `select current_user, rolbypassrls from pg_roles where rolname = current_user` shows `clinix_app`, false (T-412) | not run | | |
| 2 | Tenant isolation suite green against the production role on a staging branch (T-030..T-035) | not run | | |
| 3 | Resend: verification, reset, staff invite, portal invite, reminder arrive from the real sender domain | not run | | |
| 4 | PayMongo: live checkout of the smallest plan, webhook received once, invoice paid, unlock, refund | not run | | |
| 5 | Subscription renewal link email arrives and pays (Mode A) | not run | | |
| 6 | Domain purchase on a test name, or disabled and hidden | not run | | |
| 7 | AI keys: Gemini and Anthropic answers, monthly cap refuses at limit | not run | | |
| 8 | Cron runs at 09:00 Manila, `CRON_SECRET` set, failure alert fires when forced | not run | | |
| 9 | Subdomain host resolves and a staff of another clinic gets 404 | not run | | |
| 10 | Backups: restore drill passed (T-420) | not run | | |
| 11 | Error tracking and uptime alerts fire (T-421) | not run | | |
| 12 | Legal pages and DPO email visible (T-095) | not run | | |
