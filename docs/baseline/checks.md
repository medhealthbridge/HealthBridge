# Quality baseline - /home/claude/work/hb (healthbridge, Next.js 16, npm)
Date: 2026-10-10. Node v22.22.0, npm 10.9.4. No tracked file edited, nothing committed.

## HEADLINE: steps 1-6 could NOT be run
The sandbox egress policy blocks registry.npmjs.org. Direct DNS fails (ENOTFOUND) and the agent proxy
answers 403 to CONNECT registry.npmjs.org:443 (policy denial, recorded in /__agentproxy/status).
I did not route around the policy. Without dependencies installed, tsc/eslint/vitest/next cannot run.
node_modules is a partial, unusable tree (no tsc/eslint/vitest/next in node_modules/.bin).

## 1. npm ci
Command: `npm ci`  Exit: 1
First lines: `npm error Exit handler never called!` (npm internal error after every tarball fetch failed with
`ENOTFOUND registry.npmjs.org`, 3 attempts each; log /home/claude/.npm/_logs/2026-10-10T00_36_45_948Z-debug-0.log)
Fallback: `npm install --no-audit --no-fund`  Exit: 1, same error and cause.
Result: FAIL (environment), 0 packages installed.

## 2. npx tsc --noEmit        NOT RUN (no dependencies; npx would also need the blocked registry)
## 3. npx eslint app src      NOT RUN (same)
## 4. npm test (vitest run)   NOT RUN (same). Static counts only, see step 8.
## 5. npm run build           NOT RUN (same). No dummy env needed or used.
## 6. npm audit --omit=dev    NOT RUN (audit endpoint is on the blocked registry; no severity counts available)

## 7. Secret scan (static, `git ls-files -z | xargs -0 grep -InE ...`)
Patterns: sk-, re_, AIza, postgres(ql)://user:pass@, BEGIN [RSA|EC|OPENSSH] PRIVATE KEY, API_KEY=/SECRET= with
value, ghp_, AKIA, npg_.  Exit: 0.
Matches (2, both test fixtures, not credentials):
- src/server/services/secret-box.test.ts:9  - string starting "AIza" passed to encryptSecret (fake key, test fixture)
- src/server/services/secret-box.test.ts:12 - same fixture, asserted on decrypt
No other matches: no private keys, no DB URLs with embedded passwords, no sk-/re_/ghp_/AKIA/npg_ values.
.env.example: every variable has an empty value, except non-secret defaults (BETTER_AUTH_URL, EMAIL_FROM,
USD_PHP_RATE=60, DOMAIN_MARGIN=0.1, AGENT_DAILY_AI_LIMIT=100). No real-looking secrets.
Caveat: working-tree scan only; git history was not scanned.

## 8. Tests (static count; nothing executed)
- Test files (*.test.ts/tsx tracked): 34
- it()/test() call sites: 153 (approximate; excludes dynamically generated cases)
- Pass/fail: unknown (not run)
src/server/services files with NO *.test.ts neighbour (35 of 53 non-test files):
access, agent-actions, agent-usage, ai-access, billing, clinic-agent-actions, clinic-staff, clinical-notes,
custom-domains, dental-chart, discount-types, domain-offer, domain-orders, email-layout, email-templates, email,
exports, onboarding, patient-portal, payments/crypto, payments/index, payments/paymongo, payments/types,
payments/xendit, platform-secrets, platform-settings, platform-staff, price-list, rate-limit, reminders,
tenant-admin, tenants, tokens, treatment-plans, workspace.
(payments/webhooks.test.ts exists and may cover paymongo/xendit indirectly; src/lib/dental-chart.test.ts exists
but not alongside services/dental-chart.ts.)
Notable untested: access, tenants, tenant-admin, tokens, rate-limit, billing, platform-secrets, patient-portal.

## 9. Tracked files
`git ls-files | wc -l` -> 561
.env* tracked: only `.env.example`. No .env, .env.local etc. tracked.

## To finish the baseline
Allow registry.npmjs.org in the egress policy (or provide a mirror/pre-populated node_modules), then rerun steps 1-6.
