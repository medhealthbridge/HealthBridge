# UI_KIT: minimal, aesthetic, mobile and desktop

Companion to `docs/DESIGN_BRIEF.md` (which wins on tokens already built). This file adds the approved free libraries, palettes, font pairings and the minimal rules. Read it when building a new surface; product screens still reuse `src/components/console/*` (AGENTS.md).

Verification status: licenses marked **known** come from the project's published licence as far as I know and **must be confirmed at install** (`npm view <pkg> license`, repo LICENSE file). Items marked **flag** or **unverified** were checked or failed to check in the research session (2026-10-10). Palette contrast was computed (WCAG 2.2) and is exact.

## 1. Why it looked generic, and the fix

Cause: stock shadcn spacing, one typeface, flat white cards, a saturated brand colour used everywhere. Fix: one distinctive font pairing, a quiet neutral ground with one accent, hairline borders, almost no shadow, generous space, one hero moment per page, motion on marketing pages only.

## 2. Minimal rules (apply to every new screen)

1. One accent colour, used for the primary action, links, focus and one data highlight. Everything else is neutral.
2. Surface = border, not shadow. 1px border (`border` token), shadow only on overlays (menus, dialogs).
3. Spacing from a 4/8 scale; sections 48-96 px apart on desktop, 32-48 on mobile; card padding 16 (mobile) / 24 (desktop).
4. Type scale (ratio about 1.2): 12 / 14 / 16 / 20 / 24 / 32 / 48. Body 16 on mobile. Max two families plus one mono. Headings tight (line-height 1.15-1.25), body 1.5-1.7, measure 65-75 ch.
5. Radius: control 8, card 12, sheet 20 (DESIGN_BRIEF section 2). Never mix more than these.
6. Icons: Lucide only, 1.5 px stroke, 16/20 px. No emoji, no illustration filler.
7. Density: product screens compact (table rows 44 px touch / 40 px desktop); marketing screens airy.
8. Mobile first: single column, bottom-bar nav, sheet dialogs, 44 px targets, 16 px gutter. Desktop adds a sidebar and two-column layouts, not new content.
9. Motion: 150-300 ms, opacity and transform only, `prefers-reduced-motion` honoured. Marketing pages may use one scroll or hero effect; product screens use none beyond state transitions.
10. Status never by colour alone (icon + text). Every palette below passes 4.5:1 text, 3:1 control border and focus, in light and dark.
11. Remove before adding: if a section works without the card, the gradient, or the icon, delete it.

## 3. Approved free libraries by category

Install rule: copy-in (shadcn registry) or MIT/Apache npm packages only. Check licence at install. Add a library only to fill a gap in this table. Do not add a second library for a category already filled.

| Category | Use | Licence | Note |
|---|---|---|---|
| Base components | shadcn/ui on Radix or Base UI | MIT (known) | already in repo; restyle with tokens, do not use defaults |
| Headless primitives | Radix UI, Base UI | MIT (known) | accessibility behaviour |
| Icons | Lucide | ISC (known) | only icon set |
| Charts | Recharts via shadcn chart; Tremor charts optional | MIT / Apache-2.0 (known) | Bklit charts are MIT but the Bklit Studio product is proprietary: do not use Studio |
| Tables | TanStack Table | MIT (known) | wrap in `TableCard` |
| Dates | react-day-picker | MIT (known) | shadcn calendar |
| Toasts, sheets, command | Sonner, Vaul, cmdk | MIT (known) | already match console patterns |
| Forms | react-hook-form + Zod | MIT (known) | Zod already the boundary |
| Motion (marketing only) | Motion (framer-motion successor) | MIT (known) | keep to hero and scroll reveals |
| Marketing blocks | Magic UI (copy-in) | MIT (known) | sparing: one or two components per page |
| Marketing blocks, alternative | HeroUI | MIT (known) | do not mix with Magic UI on one page |
| Extra shadcn-style components | Origin UI / coss `apps/origin` and `apps/ui` only | MIT for those two apps | **flag:** the rest of coss.com/ui is AGPLv3; do not copy from it |
| Effects registries | Skiper UI, Vengeance UI, Aceternity UI | **unverified** | licence not stated or page failed to load; do not use until a LICENSE file is read |
| Animated text and backgrounds | React Bits | MIT + Commons Clause | **flag:** Commons Clause restricts selling; legal check before use in a paid SaaS; avoid |
| Theme generator | tweakcn | **unverified** | use only as a visual tool to produce token values; do not copy its code |
| Animmaster | paid | **do not use** | not free |

Not free or not suitable: Animmaster (paid), Bklit Studio (proprietary), React Bits (Commons Clause), coss.com/ui main tree (AGPLv3).

## 4. Recommended combinations

| Surface | Stack |
|---|---|
| Clinic app and owner console (product) | shadcn/ui + Radix + Lucide + TanStack Table + react-day-picker + Recharts + Sonner/Vaul/cmdk. No decorative effects. |
| Patient portal (mobile first) | same base, larger type (16-18), bottom-sheet dialogs via Vaul, one accent, no charts |
| Sales site (DataBridgeSol, Clinix PH) | shadcn base + Magic UI (one hero effect, one logo/marquee at most) + Motion reveals + a serif or display heading from section 6 |
| Company admin | console components, Mono Slate palette (distinct from clinics) |
| Email | plain HTML tables, system fonts, accent colour only |

## 5. Palettes (light / dark, contrast computed)

Tokens per palette: bg, surface, border (control, 3:1 on surface), text, muted, accent, on-accent. All text 12.7:1 or better, muted 5.6:1 or better, accent 4.7:1 or better against bg, on-accent 5.1:1 or better on accent.

| Name and mood | Mode | bg | surface | border | text | muted | accent | on-accent |
|---|---|---|---|---|---|---|---|---|
| **Clinic Sage** (calm, default recommendation) | light | #F6F5F1 | #FFFFFF | #818B7B | #1F2A24 | #55615A | #2F6F5E | #FFFFFF |
| | dark | #0E1512 | #151E1A | #5F6F66 | #E8EEEA | #9DAAA2 | #5FD1A8 | #06130E |
| **Ink & Blue** (neutral, trust) | light | #FFFFFF | #F7F8FA | #8892A0 | #16181D | #545C69 | #2F5FA3 | #FFFFFF |
| | dark | #0B0D12 | #12151C | #5B6577 | #EEF0F4 | #9AA3B2 | #7AA7E8 | #07101E |
| **Warm Paper** (human, friendly) | light | #FAF7F2 | #FFFFFF | #8F8577 | #2E2A24 | #5E574D | #A8552F | #FFFFFF |
| | dark | #14110E | #1C1814 | #6E6558 | #F1ECE4 | #A99F92 | #E39A72 | #1B0E07 |
| **Mono Slate** (admin, serious) | light | #EEF1F4 | #FFFFFF | #7B8794 | #222B33 | #52616F | #1F2937 | #FFFFFF |
| | dark | #0D1114 | #151A1F | #566370 | #E6EAEE | #9AA7B3 | #E6EAEE | #0D1114 |
| **Teal Clinical** (current brand, refined) | light | #F4F8F7 | #FFFFFF | #7E918D | #0B1F1C | #4C605C | #0F766E | #FFFFFF |
| | dark | #0A1211 | #101A19 | #55706B | #E6F2F0 | #97B0AB | #2DD4BF | #04201C |
| **Clay** (warm, vet or dental) | light | #F7F6F4 | #FFFFFF | #8C8780 | #26211D | #5A544D | #B5502A | #FFFFFF |
| | dark | #161210 | #1E1A17 | #6F665D | #F2EDE7 | #AAA196 | #E58A62 | #1C0D06 |
| **Lavender Quiet** (soft, skin or wellness) | light | #F8F7FB | #FFFFFF | #8A86A0 | #1D1B2B | #59566B | #5B4BB7 | #FFFFFF |
| | dark | #100F18 | #17161F | #625F7A | #EDEBF5 | #A19EB5 | #A99BFF | #120D2B |

Rules: one palette per surface; the palette is set in `@theme` tokens, never hard-coded in components. Semantic colours (info, warn, danger, success) stay from DESIGN_BRIEF section 2 in every palette. Per-clinic custom colour stays Later (FR-130). The Lavender dark border is 2.94:1 on its surface: use `#6A6785` (re-check with the contrast script before shipping) if it is used for inputs.

Suggested mapping: clinic app = Clinic Sage or Teal Clinical; vet clinics Clay; skin clinics Lavender Quiet; sales site Warm Paper or Ink & Blue; company admin Mono Slate.

## 6. Font pairings (all Google Fonts, SIL OFL, self-hosted via `next/font`)

Pairings 1 and 2 follow the most-used SaaS fonts found in research (Geist, Inter, DM Sans, Plus Jakarta Sans, Mulish). Pairings 3-6 are my suggestions and were not verified by a source: judge them by eye on a real screen.

| # | Heading | Body | Mono | Feel | Use |
|---|---|---|---|---|---|
| 1 | Geist | Geist | Geist Mono | modern, neutral, product | console default (already loaded) |
| 2 | Plus Jakarta Sans 700/800 | Inter | JetBrains Mono | friendly, clear | current system |
| 3 | Instrument Sans | DM Sans | JetBrains Mono | crisp, editorial, light | sales site |
| 4 | Fraunces (soft serif) | DM Sans | JetBrains Mono | warm, human, premium | sales site with Warm Paper or Clay |
| 5 | Manrope | Inter | Geist Mono | geometric, calm | patient portal |
| 6 | Newsreader (serif) | Geist | Geist Mono | quiet, authoritative | legal pages, long reading |

Rules: load at most 3 families per page; weights 400/500/600 for body, one heading weight; `font-display: swap`.

## 7. Using this with Claude Design and Claude Code

1. Pick a palette and a font pairing per surface; put the choice in `docs/DESIGN_BRIEF.md` change log.
2. Give Claude Design this file plus the brief as the constraint, and ask for variants within it; reject output that adds colours, fonts or libraries outside the tables.
3. Claude Code installs only the libraries in section 3 for that surface, via the shadcn registry where possible, and tests contrast with T-090.
4. Quality checks: new screens use only listed palettes/fonts/libraries; no horizontal scroll at 360-1440; 44 px targets.

## 8. Change log

| Date | Change |
|---|---|
| 2026-10-10 | First version: libraries, palettes, font pairings, minimal rules |
