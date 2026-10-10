# DESIGN_BRIEF: DataBridgeSol / Clinix PH

The product already has a design system (the console components). This brief records it as the standard, fixes its known drifts, and specifies what new screens must reuse. Component and token inventory: `docs/baseline/screens.md` section 6 (cite BS-6). Screen behaviour is in `docs/APP_FLOW.md`. The `ui-ux-pro-max` skill is used only for new marketing surfaces (AGENTS.md); product screens reuse `src/components/console/*`.

## 1. Product feel

Calm, clinical, trustworthy, fast. Dense enough for a busy front desk, readable on a mid-range Android phone under clinic lights. Teal brand, green accent for primary actions, no decorative motion. Voice: plain English, short sentences, say what happened and what to do next; Philippine context (PHP, Manila time, GCash, PhilHealth, BIR receipt). Never blame the user; never expose stack traces.

## 2. Design tokens (single source `app/globals.css` `@theme`)

| Token group | Values (existing) | Change |
|---|---|---|
| Brand | `--color-brand #0f766e`, `--color-brand-700 #0a4f49` | none |
| Console light | canvas `#f5f7f6`, panel `#ffffff`, panel-2 `#eef2f1`, line `#e1e7e4`, ink `#0b0f17`, muted `#4b5a55`, subtle `#5c6a65`, accent `#007f5f`, on-accent `#ffffff`, info `#0e7490`, warn `#b45309`, danger `#be123c` | verify every text/background pair >= 4.5:1 (T-090); fix failures |
| Console dark | canvas `#0b0f17`, panel `#111827`, panel-2 `#151e2e`, line `#1e293b`, ink `#f1f5f9`, muted `#94a3b8`, subtle `#8c9bae`, accent `#00f5a0`, on-accent `#0b0f17`, info `#06b6d4`, warn `#f59e0b`, danger `#f43f5e` | same check |
| Fonts | Geist Sans and Geist Mono (root), Plus Jakarta Sans 700/800 headings, Inter 400/500/600 body, JetBrains Mono 500/600 for prices and IDs | none; do not add families |
| Radius | none defined | **add** `--radius-control` (8px), `--radius-card` (12px), `--radius-sheet` (20px); replace hardcoded `rounded-[..]` values |
| Spacing | Tailwind scale | 4/8 px rhythm; 16 px page gutter on mobile |
| Control borders | existing `line` (#e1e7e4 on white 1.25:1; dark #1e293b on #111827 1.21:1) is decoration only | **add** `--color-console-border-strong` giving >= 3:1 against its background in both themes; inputs, selects, checkboxes and buttons use it (WCAG 1.4.11) |
| Touch | `min-h-11` (44 px) on mobile, 8 px gap between targets | enforce on all new controls |
| Motion | 150-300 ms, transform/opacity only; `prefers-reduced-motion` respected | audit |

Rule: the light pages (auth, onboarding, join, portal, reset) move from raw `slate-*` to the same tokens so that dark/light behave the same everywhere (Wave 5 task); landing pages' scoped `cx-*`/`db-*` CSS is replaced by shared components per AGENTS.md when touched (FR-001 changes).

## 3. Layout

- Shell: `ConsoleShell` (sidebar 228 px, collapses to 58 px; topbar; mobile bottom bar with first four items, rest in More). Used by S-20..S-50 and S-60..S-68.
- Page: `PageHeader` (title, one-line purpose, primary action right) > content in `Panel`s. Max content width 1200 px; tables scroll inside their card, never the page.
- Breakpoints verified: 360, 375, 390, 768, 1024, 1440. No horizontal page scroll at any width.
- Locked, error and legal screens use the light centered layout (single column, max 480 px for messages, 720 px for legal text, line length 65-75 ch).

## 4. Components

Reuse (exists): ConsoleShell, ConsoleButton (primary/secondary/danger; md/sm), ConsoleDialog (right/center/bottom/top), FormField + CONSOLE_INPUT, PageHeader, Panel, StatGrid/KpiGrid, TableCard + Th/Td/Tr/RowActions, Pill, ToggleSwitch, RangeTabs, ArchiveButton, PageSkeleton, toast, OfflineBanner, CommandPalette.

New shared components (create once, reuse; IDs for tasks):

| ID | Component | Purpose | Used by |
|---|---|---|---|
| C-01 | `StatePanel` | one component for empty / error / no-permission / locked messages: icon, title, one sentence, optional action | all screens (FR-116) |
| C-02 | `StatusChip` | consistent colour + text + icon for statuses (never colour alone) for subscription, invoice, appointment, claim, domain order | S-34, S-62, S-63, S-27, S-48, S-41 |
| C-03 | `PlanCard` | tier, price, interval, status, period, clinics and AI usage meters | S-34, S-62 detail |
| C-04 | `InvoiceTable` | subscription invoices with pay/receipt actions | S-34, S-63 |
| C-05 | `ConfirmReasonDialog` | destructive or privileged action with required reason field (5-300 chars) | S-62 controls, void receipt, write-off |
| C-06 | `LegalLayout` | legal page frame with last-updated and contact | S-75..S-77 |
| C-07 | `TrialBanner` | days left / past due / on hold, sticky under topbar, one action | shell for R-03 and others |
| C-08 | `GuardianBlock` | animal and guardian header and form | S-23, S-44, patient dialog |
| C-09 | `PrintReceipt` | print stylesheet for S-28/S-47 | receipts |
| C-10 | `MeterBar` | used / cap meter with text label | AI usage, clinic slots |
| C-11 | `ErrorBoundaryView` | `error.tsx` and `global-error.tsx` content with reference id | S-74 |

## 5. The five states (required on every screen)

| State | Standard |
|---|---|
| Loading | `loading.tsx` with `PageSkeleton` in every route segment (add to landing-adjacent, auth, onboarding, join, portal, legal); buttons show pending text and are disabled |
| Empty | `StatePanel` saying what is missing and the single next action; no blank panels |
| Error | inline error beside the field for form errors (`role=alert`, id `{field}-error`); page-level `error.tsx` with Try again and reference id; never a stack trace |
| Offline | `OfflineBanner` on every authenticated shell and every light page; actions that need network are disabled with the reason; form input is kept (X-01) |
| No permission | 404 when existence must not be revealed; otherwise 403 `StatePanel` "You do not have access to this page" with a link home by role; hidden controls are not a substitute for server checks |

## 6. Content rules

- Buttons say the action: "Pay now", "Add clinic", "Void receipt" (never "Submit" or "OK").
- Errors: what happened, what it means, what to do. Example: "We could not start the payment. Nothing was charged. Try again."
- Destructive actions name the object and consequence; where data is kept, say so ("Your records are safe and will not be deleted.").
- Money "PHP 1,490.00" via one formatter from centavos; dates "10 Oct 2026"; times "2:30 pm" in clinic time; MRN and receipt numbers in the data font.
- No emoji, no glyph characters as icons; Lucide icons only, each icon-only button has `aria-label`.
- Locked/past-due/trial copy is in APP_FLOW section 4 and is tested verbatim.
- Words used consistently: "clinic" (not branch, except UI of multi-clinic switcher "Clinic"), "receipt" (BIR official receipt), "patient" (vet clinics show "Patient" with the animal name and species), "owner" is the clinic owner role; the vet animal's human is always "guardian" in this product (never "owner") to avoid role confusion.

## 7. Accessibility (WCAG 2.2 AA, NFR-10)

Contrast 4.5:1 text and 3:1 UI/borders; visible focus ring on every control (2 px, offset); keyboard order matches reading order; dialogs trap focus, close on Escape, return focus; every input has a visible label; errors tied with `aria-describedby`; tables have headers and captions where non-obvious; status never by colour alone; `lang="en"`; skip link on shells; route change moves focus to the page heading; reduced-motion honoured; zoom to 200 percent without loss; target size 44 px (mobile) and at least 24 px with spacing on desktop.

## 8. Marketing and legal surfaces

Landing pages keep current copy; remove "Notify me" stubs and unverifiable claims (FR-026); pricing section reads from `PLAN_LIMITS` so price changes happen once (OQ-04); footer has Terms, Privacy, Data Processing, contact. Legal pages are plain, scannable, with headings and a table of contents when over 1,500 words.

## 9. What this brief does not decide

Branding application (custom primary colour and logo per clinic, FR-130) is Later. Illustration, photography, and a new logo are outside this release.

## 10. Change log

| Date | Change |
|---|---|
| 2026-10-10 | First version |
