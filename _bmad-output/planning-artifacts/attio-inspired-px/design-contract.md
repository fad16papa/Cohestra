---
title: Attio-inspired Cohestra product experience — design contract
status: contract
baseline_ref: origin/release/uat
baseline_sha: 5ba6ddcbf47a3630792ebc3a8779e0dee4a52691
baseline_tree: a82ef9ac3e22f16b9c1bc13a54f44122f20d2518
canonical_brand: docs/DESIGN.md
token_source: web/styles/brand-tokens.css
created: 2026-11-12
---

# Design contract

Cohestra keeps Midnight Atelier: ink, paper, lagoon, and gold from `web/styles/brand-tokens.css`. Attio is a reference for hierarchy, density, and page structure. It is not a palette, a logo, or copy to reuse.

`docs/DESIGN.md` still wins on color, Fraunces versus Plus Jakarta Sans, Epic 35–37 behavior, and motion durations 100 / 160 / 280. This contract wins on layout density and marketing section order for this initiative. It does not change CI, deployment gates, entitlements, or APIs.

## What Attio contributes

Observed from the public homepage and the Attio 101 navigation article on 12 Nov 2026:

- A quiet top bar with one obvious primary action.
- A centered headline, a short value line, then a large product surface.
- Feature chapters that keep one visual anchored while the copy changes.
- A workspace split into a collapsible sidebar and a main panel.
- Search and command access near the top of the workspace.
- Record directories as calm tables, with the record itself carrying identity plus a timeline.

Cohestra does not add Attio objects (deals, sequences, companies-as-CRM, Ask Attio, workspace switcher, or referral). Rooms stay Dashboard, Clients, Activities, Follow-up, Analytics, Cohestra AI, Website, and Campaigns.

## Typography

Application chrome, tables, forms, and navigation use Plus Jakarta Sans only.

| Role | Size | Weight | Tracking | Use |
|------|------|--------|----------|-----|
| Page title | 1.25rem | 600 | -0.02em | One per room |
| Section label | 0.75rem | 600 | 0.04em | Eyebrows. Sentence case. Not gold on paper |
| Body | 0.875rem | 400 | 0 | Tables, forms, panels |
| Meta | 0.75rem | 400 | 0 | Captions, timestamps |
| Control | 0.8125rem | 500 | 0 | Buttons, tabs, filters |

Marketing display stays Fraunces, medium weight. The homepage headline is centered and capped near `clamp(2.5rem, 5vw, 4.25rem)` so the primary action stays in the first 900px viewport. Do not use Fraunces in tables, sidebars, or form labels.

## Space, grid, radius

| Token | Value | Use |
|-------|-------|-----|
| Space unit | 4px | All padding snaps to 4 |
| Page inset | 24px desktop, 16px below 768 | Main panel |
| Section gap | 64–96px marketing, 24px app | Vertical rhythm |
| Content max | 72rem marketing, fluid app | |
| Radius control | 10px (`--radius-md`) | Buttons, inputs, rows |
| Radius frame | 16px (`--radius-lg`) | Cards and product frames |
| Radius pill | 999px | Status and plan locks only |

Borders are 1px `--line`. Shadows stay soft and rare: one frame shadow on the marketing product showcase, none on data rows. Do not introduce Attio black or Attio blue.

## Surfaces

- Marketing is light-locked, as `docs/DESIGN.md` already requires.
- The workspace follows `next-themes` light, dark, and system. Dark mode remaps the same semantic tokens. It does not invent a second palette.
- Tenant brand accent continues to overlay `--primary`, `--accent`, and `--ring` through `web/lib/brand-accent.ts`. Lagoon remains the default.
- Gold is an eyebrow or a dark-band accent. Body text on paper uses `--text-muted` (`#252c33`), not `--gold` or `--stone`.
- Locked rooms stay visible. Website shows Core. Campaigns shows Pro. Enterprise follows the existing `isProPlan` / `isCoreOrAbove` rules.

## Components

| Piece | Rule |
|-------|------|
| Button | One primary per view. Height 40px in the app, 44px minimum on marketing and public forms. Focus ring `--ring` |
| Menu | Existing popover and sheet. Items 36px, label plus optional shortcut. No new command set |
| Dialog | Existing dialog and alert-dialog. Title, body, one primary, one cancel |
| Sidebar | Current rooms and order. Desktop 240px with labels. Icon rail at 64px is allowed below 1024. Collapse does not remove locked rooms |
| Toolbar | Sticky 56px. Breadcrumb or title, search that opens the existing command palette, plan badge, theme, account |
| Table | Row min-height 52px. Avatar, primary text, meta line, status chip. Filters are the real category or status controls, not decorative pills |
| Record | Identity column plus activity timeline. No invented deal score |
| Form | Labels above controls. Errors under the field. Disabled state uses `--text-disabled` |
| Empty | One sentence, the next real action, no illustration library from Attio |
| Skeleton | Pulse of the row shape. Off under reduced motion |

## Motion and accessibility

Durations stay 100 / 160 / 280. `prefers-reduced-motion: reduce` disables marketing lift and route transitions, as `web/app/globals.css` already does. New motion must use that same query.

Targets: 44px on touch, visible focus, text contrast at least WCAG AA on paper and on ink. Status is never color alone. The command palette keeps its keyboard path. Form Studio and Website Studio keep their editor keyboards and preview guarantees.

## Product visuals

Marketing showcases are built from real Cohestra rooms: Follow-up category chips, activity registration, client profile, Form Studio, and Website Studio. Sample rows use roles and the product’s own empty-state captions. They do not use named people, counts, revenue, or testimonials. If a real customer quote does not already exist in the repo, the social-proof section is omitted.

## Screenshot standard

Capture 1440×900, 768×1024, and 390×844. For the workspace, capture light and dark. For marketing, capture light and reduced motion. A shot counts only when the primary action is usable, horizontal scroll is absent, and the plan lock that the screen claims is the lock the code enforces.
