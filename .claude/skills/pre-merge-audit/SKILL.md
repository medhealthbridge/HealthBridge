---
name: pre-merge-audit
description: "Run before declaring any HealthBridge/Clinix change done, and when asked to audit or review work. Walks the db-schema-architect and ui-ux-pro-max checklists plus this repo's working agreement (AGENTS.md) against the diff and reports gaps honestly. Use after adding tables, actions, webhooks, admin pages, seeders or any UI."
---

# Pre-merge audit

1. `git diff origin/main --stat`, then read each changed file you didn't just write.
2. Open `.claude/skills/db-schema-architect/SKILL.md` and tick its **Pre-merge checklist** and **Security engineering** list against the diff. Open `.claude/skills/ui-ux-pro-max/SKILL.md` for any UI. Do not answer from memory.
3. Check, in order:
   - **Tenancy:** new table → clinic_id, index, RLS in the same migration; every query goes through a `with*` helper; admin cross-tenant reads use `withPlatformAdmin` only.
   - **Authz:** each action/handler/page checks the session and role itself; no authorization from Host/Origin/form ids.
   - **Webhooks/payments:** signature before parse, provider re-confirmation, rate limit, idempotent guarded transitions, amounts as integer centavos.
   - **Secrets/logging:** nothing sensitive in repo or logs; seeders take credentials from env.
   - **Code rules:** logic in services (no Next imports), Zod at the boundary, types from Zod/ORM, no dead code, no duplicated shapes, mock data in `src/lib/mock-data/`.
   - **UI:** the Definition-of-done UI line in AGENTS.md.
   - **Tests:** pure logic + permission/webhook boundaries have `*.test.ts`.
4. Run `npx tsc --noEmit && npx eslint app src && npm test && npm run build`.
5. Report: what passed, what you fixed, and — separately and plainly — what you could not verify (real credentials, browser, production data). Never write "verified" for something you only type-checked.
