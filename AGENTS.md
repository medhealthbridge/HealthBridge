<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:cursor-rules-ported -->
# Ported Cursor rules

The rules below were `alwaysApply: true` in `.cursor/rules/*.mdc` and are restated here so they apply the same way under Claude Code. Treat them as binding project conventions, not suggestions.

## Architecture — one Next.js app

HealthBridge is a single Next.js app — no separate backend. Never add NestJS, Express, Fastify, Hono, or a separate API service.

- Mutations: Server Actions by default (`src/server/actions/`).
- `app/api/*` only for webhooks, OAuth callbacks, or non-Next clients.
- Thin actions/handlers: validate with Zod, call a service, shape the response.
- Business logic: plain TypeScript in `src/server/services/` — no Next.js imports.
- Data: Server Components. `'use client'` only on the smallest interactive leaf.
- Never mark a whole page `'use client'` for one button.

Workflow: schema/migration first → Zod contract (shared with the form) → service → action/handler → UI → `revalidatePath`/`revalidateTag` on every mutation → deduplicate before done.

Auth checks live in `src/server/auth.ts`. Middleware is coarse route protection only. ORM: Prisma if already in use; otherwise PostgreSQL + Drizzle, one client in `src/server/db/client.ts`. Auth library: keep **better-auth** (already in the repo); do not switch to Auth.js/Lucia.

## Target source layout

The create-next-app tree currently uses root `app/`. New fullstack code should grow toward:

```
src/
  app/                 # routes; _components/ (+ optional _data.ts) colocated per route
  server/
    actions/           # Server Actions by domain
    db/client.ts
    db/schema.ts
    services/          # framework-agnostic logic
    auth.ts
  lib/
    mock-data/          # static/demo/placeholder content, typed constants — see UI code separation below
    schemas/            # Zod schemas
    constants.ts
    utils.ts
  components/          # shared UI (used by 2+ routes)
  types/
```

Prefer native Next.js (Server Actions, RSC, `revalidatePath`/`revalidateTag`) over new libraries unless native cannot do the job. Do **not** follow `docs/architecture.md`'s Route Handler + TanStack Query request/data-fetching pattern (`src/services/`, `src/hooks/api/`, fetch-based mutations) — Server Actions replace that here. Its general layering principle (small, single-purpose files; nothing duplicated across layers) still applies and is spelled out for UI code below.

## UI code separation

Applies to every page, including marketing/landing pages — a page with no forms or mutations is not exempt from separation.

- **One section, one component.** A page section such as Nav, Hero, Footer, Faq, Pricing, a features grid, a problems grid, a compliance grid, a roles grid, etc. is its own file, colocated under the route's `_components/` folder (e.g. `app/clinix-ph/_components/faq-section.tsx`). A page's top-level file composes sections; it does not render section markup inline.
- **No monolithic page components.** A single component mixing more than one page section (nav + hero + pricing + faq + footer all in one file) must be split, regardless of line count.
- **Mock, placeholder, and demo data lives in its own module** — never inline above a component's function body. Static content (FAQ copy, pricing tiers, feature lists, nav links, per-specialty demo data, testimonials, etc.) goes in `src/lib/mock-data/<domain>.ts`, typed and exported as named constants. Route-specific data that nothing else will ever import may instead live in a colocated `_data.ts` next to that route's `_components/`. Components import from one of these — they don't define the array themselves.
- **DRY across pages, not just within one.** When two pages both need a Nav, Footer, theme toggle, FAQ accordion, CTA band, or pricing card, extract one shared component into `src/components/` on the second use. Do not let a second page grow its own near-duplicate copy under a different class prefix (e.g. `cx-` vs `db-`).

### Styling: Tailwind, not inline stylesheets

- No `<style jsx>` blocks and no hand-rolled CSS custom-property theme objects duplicated per component. If you're reaching for either, that's a signal the section needs Tailwind utility classes and/or extracting into a shared component.
- Shared design tokens (colors, fonts, spacing scale) are defined once — in `globals.css` / `tailwind.config` — not redeclared as `--db-*`-style CSS variables inside each landing page.
- Dark/light theme state is expressed with Tailwind's `dark:` variant (or a single shared theme-context/hook), not a per-component `data-theme` attribute wired to per-component CSS.

## Clean code

- Extract shared validation, query shapes, and UI on the second use — not before. This includes whole page sections (nav, footer, FAQ, pricing card, CTA band) shared across pages/landing sites — see UI code separation above.
- Types from Zod (`z.infer<typeof schema>`) or ORM types. Never duplicate a parallel interface.
- Validate at the Server Action / Route Handler boundary. Services assume validated input.
- Prefer named service functions over inline queries in components.
- No dead code, commented-out blocks, or speculative layers.
- One error style everywhere (typed throws **or** Result) — do not mix in sibling functions.
- TypeScript strict: no new `any`.
- Tests: unit tests for services; integration for actions/handlers; Playwright for critical e2e.

## UI/UX

When designing, building, or reviewing UI, use the `ui-ux-pro-max` skill (`.claude/skills/ui-ux-pro-max/SKILL.md`) and run its search CLI **before** implementing:

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "healthcare SaaS dashboard clinical" --design-system -p "HealthBridge"
python .claude/skills/ui-ux-pro-max/scripts/search.py "accessibility animation form" --domain ux
python .claude/skills/ui-ux-pro-max/scripts/search.py "layout responsive form" --stack nextjs
python .claude/skills/ui-ux-pro-max/scripts/search.py "form table dialog" --stack shadcn
```

Default stack is **nextjs + shadcn**. Product is **healthcare**.

Priority order: (1) Accessibility (4.5:1 contrast, focus rings, labels, aria on icon buttons, keyboard order), (2) Touch (44×44px targets, disable buttons while pending, errors next to the field), (3) Performance (`prefers-reduced-motion`, reserved space, Next/Image), (4) Layout (no horizontal scroll, 16px+ body on mobile, z-index 10/20/30/50), (5) Type/color (line-height 1.5–1.75, 65–75ch), (6) Motion (150–300ms, transform/opacity only, skeletons), (7) Style (one system, Lucide SVG — no emoji icons).

Professional UI checks: `cursor-pointer` on clickable elements; hover via color/opacity, not scale that shifts layout; light mode body text slate-900, muted slate-600 min, borders gray-200 (not white/10); same container max-width; content not hidden behind fixed nav; verify 375 / 768 / 1024 / 1440 before calling UI done.

## Security engineering

Apply to all code, features, fixes, and changes. HealthBridge handles patient data — treat these as non-negotiable.

- **Authn/authz server-side only.** Every Server Action, Route Handler, and data-loading Server Component checks session and role/tenant via `src/server/auth.ts`. Never rely on client-side permission checks or hidden UI; middleware is coarse protection, not authorization.
- **Admin and privileged operations** (company admin, clinic admin portals, role changes, billing) require an explicit server-side role check in the action/handler itself.
- **Tenant isolation:** scope every query by tenant/clinic in the service layer; use and correctly configure Postgres Row-Level Security where applicable (see the `db-schema-architect` skill).
- **Accounts:** enforce email verification where required; passwords are hashed by better-auth (modern KDF) — never store, log, or return plaintext passwords. Don't weaken better-auth's defaults.
- **Tokens and secrets:** never put auth tokens or credentials in `localStorage`/`sessionStorage` — use httpOnly, secure, sameSite cookies. API keys and secrets stay server-side; only intentionally public values get the `NEXT_PUBLIC_` prefix. Never commit `.env` files or secrets.
- **Logging:** never log passwords, tokens, secrets, session cookies, or personal/health data. No raw request bodies in logs.
- **Queries:** use Drizzle's query builder or parameterized `sql` templates. Never build SQL by string concatenation from untrusted input.
- **Input:** validate and sanitize all untrusted input on the server with Zod at the action/handler boundary. Prevent XSS (no `dangerouslySetInnerHTML` with user content), SQL injection, command injection, and open redirects.
- **File uploads:** validate type, size, extension, and actual content (magic bytes) server-side; never trust client-provided filename or MIME type.
- **Webhooks:** verify the signature before parsing or acting on the payload.
- **Rate limiting:** apply to auth, API, upload, webhook, and other abuse-prone endpoints.
- **Configuration:** secure defaults and hardened headers/cookies. No production debugging, verbose errors, stack traces, or dev-only features in production — return generic error messages to clients.
- **Dependencies:** keep them updated; address known vulnerabilities (`npm audit`) rather than ignoring them.
- **Reviews:** follow the Claude Code `security-review` skill when reviewing security-relevant changes.
- **Preserve controls.** Never weaken, bypass, or remove a security measure to make implementation easier.
- **Before implementing a feature**, consider its authentication, authorization, input validation, data access, secrets, logging, file handling, and abuse risks. Follow existing architecture and security patterns; prefer minimal, targeted changes over rewrites.
<!-- END:cursor-rules-ported -->

<!-- BEGIN:project-working-agreement -->
# Working agreement for this repo (read before any change)

These are binding for every session, human or AI. They exist because earlier work skipped them.

## Before you build
1. **Read the skills that apply, every time, not from memory.**
   - Schema, migration, RLS, tenancy, billing, security → `.claude/skills/db-schema-architect/SKILL.md` (its "Security engineering" section applies to *all* code).
   - Any UI → `.claude/skills/ui-ux-pro-max/SKILL.md`; run its search CLI first. The CLI needs Python ≥ 3.12 (`python3.12 .claude/skills/ui-ux-pro-max/scripts/search.py …`); on 3.11 it dies with an f-string SyntaxError.
   - Neon/Postgres operations → `.agents/skills/neon-postgres/SKILL.md`.
2. **Read `node_modules/next/dist/docs/`** for any Next API you haven't used in this repo (proxy, `after`, route handlers, caching) — this is not the Next.js in your training data.
3. Existing console UI (`src/components/console/*`, `ConsoleShell`) is the design system for product screens. Reuse it; the skill's generated "design system" is for new marketing surfaces only.

## Database & tenancy (learned the hard way)
- **Every new table gets RLS in the same migration** or a written reason in the migration comment. No silent exceptions.
- Services reach the database only through `withTenant` / `withAccount` / `withUser` / `withAccountAndClinic` / `withOrder` / `withPlatformAdmin` in `src/server/db/client.ts`. Never import bare `db` in a service for tenant data. `withPlatformAdmin` is for company-admin reads only, after `requirePlatformAdmin()`.
- In policies read settings as `nullif(current_setting('app.x', true), '')::uuid` — a custom setting reads `''` after its transaction ends, and `''::uuid` raises.
- **RLS enforcement:** the restricted `clinix_app` role (no `BYPASSRLS`) exists and was tested (`docs/db-app-role.md`), but RLS is only enforced at runtime once the deployed `DATABASE_URL` uses it. Until that cutover is done the app still connects as `neondb_owner` (which bypasses RLS) and app-level `WHERE clinic_id` filters are the real protection. Never rely on RLS alone, and don't claim data was checked "under RLS" unless the app is on `clinix_app`. Migrations and seeds use `DATABASE_ADMIN_URL`, never the deployed app's URL.
- Money is integer centavos/cents. Statuses are `text` + a `const` tuple + `$type<…>()`; never a parallel hand-written union.
- Patient-record writes and billing-state changes write an `audit_logs` row in the same transaction, from the service.
- Migrations: `drizzle-kit generate`, read the SQL, append hand-written RLS to the same file. The sandbox can't reach Neon from the shell, so apply through the Neon MCP **and** insert the row into `drizzle.__drizzle_migrations` (`hash` = sha256 of the file, `created_at` = the journal's `when`) or the next `drizzle-kit migrate` will re-run it.

## Security defaults
- Authorize on the server in the action/handler/page itself; the layout is not a gate.
- Never trust the request's `Host`, `Origin` or any id in a form for authorization or for building redirect/return URLs — derive them from the session or our own config.
- Webhooks: verify the signature **before** parsing, then re-confirm the fact (e.g. paid amount) with the provider's API, rate-limit the endpoint, and make the handler idempotent with a guarded status update.
- Seeders never put a credential in the repo; passwords come from the environment, and a seeder never overwrites an existing credential.

## Definition of done
- `npx tsc --noEmit`, `npx eslint app src`, `npm test` and `npm run build` all pass.
- Pure logic and every webhook/permission boundary has a unit test next to it (`*.test.ts`, run by Vitest).
- No dead code left behind when a screen moves from mock to real data: delete the mock exports it stops using.
- UI: ≥ 44px targets on touch, ≥ 8px between adjacent targets, labels on every input, errors next to the field, Lucide icons only (no glyph characters), buttons disabled while pending, checked at 375 / 768 / 1024 / 1440.
- Say plainly what was *not* verified (anything that needs real credentials or a browser).
<!-- END:project-working-agreement -->
