---
title: Cohestra Product Experience 2.0 — component and token inventory
phase: 1
status: phase1-proposed
created: 2026-09-22
updated: 2026-09-22
head_phase0: 5c3fe75d
head_phase0_1: 63fc97fa
canonical_design: docs/DESIGN.md
---

# Cohestra component and token inventory

Evidence from `web/styles/brand-tokens.css`, `web/app/globals.css`, `web/components/**`, and locked UX spines. Values are **OBSERVED** unless marked **INFERRED**.

Protected: Epic 35 shell class maps and experience enums; Epic 36 composition + design-token enums; Epic 37 100 / 160 / 280 + CSS reduced motion.

---

## 1. Token files

| File | Role |
|------|------|
| `web/styles/brand-tokens.css` | Midnight Atelier source (cites `ux-cohestra-2026-07-18/DESIGN.md`) |
| `web/app/globals.css` | `@import` tokens, Tailwind `@theme inline`, motion utilities, PRM |
| `web/app/(platform)/layout.tsx` | Parallel `--plat-*` hexes |
| `web/lib/brand-accent.ts` | Tenant accent overlay on admin `--primary` / `--accent` / `--ring` |

No `--space-*`, `--shadow-*`, or `--duration*` CSS variables.

---

## 2. Color tokens (`:root`)

| Variable | Value | Role |
|----------|-------|------|
| `--ink` | `#070d12` | text |
| `--ink-soft` | `#141c24` | ink variant |
| `--paper` | `#fafbfc` | canvas |
| `--paper-warm` | `#f3f5f7` | card / muted surface |
| `--stone` | `#8b939c` | muted text — **3.00:1 on paper** (AA fail for body) |
| `--stone-cinema` | `#5a636e` | marketing AA muted — **5.88:1 on paper** |
| `--line` | `#e6e9ed` | border |
| `--line-strong` | `#d0d5db` | input border |
| `--lagoon` | `#0b6b63` | action |
| `--lagoon-deep` | `#08554f` | accent |
| `--lagoon-fg` | `#f3fffc` | on-lagoon |
| `--gold` | `#a68b5b` | quiet gold |
| `--gold-cinema` | `#6e5a32` | cinema gold |
| `--gold-soft` | `#f4eee3` | gold wash |
| `--success` | `#1f7a5c` | success |
| `--warn` | `#9a6700` | warn / contacted |
| `--danger` | `#9b1c1c` | danger |

Semantic: `--background`→paper, `--foreground`→ink, `--card`→paper-warm, `--primary`→lagoon, `--muted-foreground`→stone, `--destructive`→danger, `--border`→line, `--ring`→lagoon.

Legacy aliases: `--surface-warm`, `--border-warm`, `--text-warm`, `--text-muted-warm`.

Lead status: `--status-new #2563eb`, `--status-contacted`→warn, `--status-active`→success, `--status-inactive #78716c`.

Messaging (not inverted in `.dark`): `--whatsapp #25d366`, `--viber #7360f2`.

`.dark` inverts ink/paper; lagoon becomes `#12877d`; destructive `#e57373`. WhatsApp/Viber/success/warn/danger raw values are not all redefined.

`.registration-preview-surface` forces light semantic tokens so Form Studio preview matches public (Epic 36 preview parity).

`[data-demo-theme]` remaps muted text to `--stone-cinema` (cinema only).

**Brand accent presets** (`brand-accent.ts`): terracotta `#c45c26`, forest `#2d6a4f`, ocean `#2563eb`, teal `#0d9488`, indigo `#4f46e5`, violet `#7c3aed`, rose `#e11d48`, amber `#d97706`, slate `#475569`. Applied on admin paths only.

**Platform:** `--plat-ink #070D12`, `--plat-lagoon #0B6B63`, `--plat-danger-bg #FDECEC` — duplicate palette, not shared classes.

---

## 3. Typography

Fonts (`web/lib/fonts.ts` + root layout): Plus Jakarta Sans (`--font-jakarta`), Fraunces (`--font-fraunces`), Geist Sans/Mono, unused `--font-inter`.

| Utility | Spec |
|---------|------|
| `text-display` | Fraunces 48 / 500 / 1.08 / -0.03em |
| `text-display-sm` | Fraunces 32 / 500 / 1.15 / -0.025em |
| `text-marketing-display` | Fraunces clamp 3.5–4rem |
| `text-marketing-hero` | Fraunces clamp 3.75–5.75rem |
| `text-marketing-section` | Fraunces clamp 2–2.75rem |
| `text-public-hero` | Fraunces 36 |
| `text-section` | Jakarta 13 / 600 / uppercase / 0.12em — used as **admin chrome h1** |
| `text-label` | Jakarta 12 / 600 / 0.06em |

DESIGN.md body 16 / 1.6 is **not** a CSS utility (**INFERRED** as `text-base`).

---

## 4. Radius, spacing, elevation

Radius: `--radius-sm 4px`, `--radius-md 10px`, `--radius-lg 16px`, `--radius-xl 24px`, `--radius` = md.

Spacing: **no brand scale**. DESIGN `page-gutter: 32px` vs admin `p-4 sm:p-6`. Local dashboard vars: `--dashboard-panel-row-height: 4.5rem`, `--dashboard-table-row-height: 3rem`.

Elevation: **no `--shadow-*`**. Mix of Tailwind `shadow-xs`…`2xl` and one-offs (`0 20px 40px rgba(7,13,18,0.05)` auth; `0 22px 46px` marketing). DESIGN “almost flat + one deep product-frame shadow” is not a single implementation.

---

## 5. Motion tokens (Epic 37 — protected)

| Token | Class | Duration | Properties |
|-------|-------|----------|------------|
| Press | `.motion-press` | **100ms** ease-out | color, bg, border, shadow, opacity, transform |
| Local | `.motion-local` | **160ms** ease-out | color, bg, border, shadow (no transform) |
| Route enter | `.animate-page-enter` | **280ms** | opacity + `translateY(0.375rem)` |
| Builder context | `.builder-context-enter` | 180ms | opacity + 0.25rem Y |
| Builder tab | `.builder-tab-enter` | 120ms | opacity |
| Builder presence | `.builder-presence-enter` | 140ms | opacity |
| Builder selection | `.builder-selection` | 150ms | shadow, border, bg |

TS: `ADMIN_ROUTE_ENTER_DURATION = "0.28s"` (`web/lib/admin-route-motion.ts`). Pathname-only key. `shouldKeepBuilderPreviewMounted(): false`.

Wrappers: `AdminRouteTransition` (admin `<main>` only), `BuilderSurface` (Website + Form studios).

**Reduced motion (SSR-safe CSS):** `@media (prefers-reduced-motion: reduce)` zeros page-enter, builder, press/local, slotted dialog/sheet/popover, listed marketing classes. **Do not** JS-gate route enter (AD-4).

**Outliers (not Epic 37 tokens):** dialog overlay 150ms, dialog content 200/150, popover 100, client profile 200, marketing 0.25s–28s, campaign custom overlays (none).

Tests: `admin-route-motion.test.ts`, `builder-motion.test.ts`, `motion-polish.test.ts`.

---

## 6. Theme

`next-themes` `attribute="class"` `storageKey="cohestra-theme-operator"` `enableSystem` `disableTransitionOnChange`. Public paths: sessionStorage `cohestra-theme-public-session` + `forcedTheme`. Marketing apex light-locked. Platform light-only. Registration preview light-reset.

---

## 7. Primitives (shadcn / Base UI)

`web/components.json`: style `base-nova`, **Base UI** (not Radix).

| File | Notes |
|------|-------|
| `ui/button.tsx` | variants default/outline/secondary/ghost/destructive/link; sizes xs–lg + icons; default **h-8**; `motion-press` |
| `ui/input.tsx` | h-9, `rounded-lg`, `motion-local` |
| `ui/label.tsx` | text-sm font-medium |
| `ui/card.tsx` | rarely used vs custom bordered cards |
| `ui/dialog.tsx` / `alert-dialog.tsx` / `sheet.tsx` / `popover.tsx` | slotted; PRM via `data-slot` |
| `ui/toast-provider.tsx` | custom; 6s / 12s action; hard red/emerald |
| `ui/filter-select.tsx` | muted pill, not Input |
| `ui/responsive-banner-image.tsx` | image caps |

**Missing shadcn files:** no `table`, `textarea`, `select`, `checkbox`, `tabs`, `skeleton`, `badge`. Those patterns are hand-rolled.

### Shared product primitives

| File | Usage |
|------|-------|
| `shared/page-header.tsx` | `h2.text-display-sm` + actions |
| `shared/product-empty-state.tsx` | dashed card + icon + two links |
| `shared/product-error-state.tsx` | destructive analog |
| `shared/list-skeleton.tsx` / `profile-skeleton.tsx` | `motion-safe:animate-pulse` |
| `shared/person-avatar.tsx` | CRM |
| `shell/upgrade-panel.tsx` | plan lock |
| `shell/plan-badge.tsx` / `plan-limit-alert.tsx` / `limit-meter.tsx` / `billing-banner.tsx` / `sponsored-badge.tsx` | entitlements |

---

## 8. Domain families

Paths under `web/components/`.

| Family | Count (approx) | Anchor files |
|--------|----------------|--------------|
| Dashboard | 25 | `dashboard-page-client.tsx`, follow-up queue, intelligence brief, view switcher, onboarding |
| Clients | 22 | list, profile, lead queue, follow-up date; **unused** `client-follow-up-panel.tsx` |
| Activities / Form Studio | 44 | list/detail, `activity-form-tab`, `form-composition-builder`, experience + design-token controls |
| Registration | 21 | `PublicRegistrationOpen`, shells, composition renderer, success |
| Website | 21 | `website-builder-page`, toolbar, live preview, tour |
| Settings | 20 | own header/rails/tabs |
| Billing | few | checkout, in-app panel, Paddle return |
| Campaigns | few | list, compose, preview, QR |
| Reports | few | charts, filter bar, upgrade |
| Platform | few | `--plat-*` console |
| Marketing | 44 | home, cinema, pricing, docs — **outside Epic 37** |
| Motion / layouts / auth / legal / team | supporting | `admin-route-transition`, `dashboard-layout` |

---

## 9. Protected Epic 35 / 36 tokens (not CSS variables)

### Experience enums (`web/lib/registration-experience.ts`)

- layout: `centered | split | poster | immersive | card`
- style: `modern | minimal | editorial | bold | soft` — Studio offers **modern/minimal** only
- flow: `single-page | sections | step-by-step | conversational`
- heroDisplay: `cover | contain | full-bleed | split | background | hidden`

Studio-exposed (`registration-experience-studio.ts`): Modern Centered Basic; Split/Poster Core; Conversational Pro.

### Shell class maps (do not reopen)

| Shell | Observed constraints |
|-------|----------------------|
| Modern Centered | page max 720; activity band 680; form 520; modern `rounded-2xl shadow-sm`; minimal flatter |
| Split Event | full-bleed `lg:grid-cols-[2fr_3fr]`; stacks on small |
| Event Poster | max 480; form `rounded-xl` |
| Conversational | question progress + Continue/Back |
| Card / immersive / compact | additional shells in `public-registration-open.tsx` |

One renderer: `PublicRegistrationOpen`. Preview: `RegistrationPublicPreviewShell` `variant="preview"`.

### Epic 36 composition

`FormCompositionNode` kinds: `fieldRef | section | columns | content | domain`. Domain: `activityDetails | communityIdentity | capacityStatus`. `fields[]` = validation/submit truth. Content/structure/domain **not submitted**.

Design tokens (`registration-design-tokens.ts`) — **enums, not raw CSS**:

| Group | Values | Basic lock |
|-------|--------|------------|
| `typographyScale` | compact / default / spacious | spacious Core+ |
| `fieldSize` | default / comfortable | comfortable Core+ |
| `fieldRadius` | sm / md / lg | lg Core+ |
| `buttonWidth` | auto / full | — |
| `surfaceEmphasis` | flat / soft / elevated | elevated Core+ |

Builder chrome (Form Studio DESIGN.md class strings): `builderRow` `rounded-lg border border-border-warm bg-card`; 44px handle **specified**, **not** implemented (see PX2-TOUCH-002).

---

## 10. Duplicated / inconsistent patterns

| Pattern | Canonical | Drift locations |
|---------|-----------|-----------------|
| Empty | `ProductEmptyState` | dashboard dashed chart empties; communities/categories `td`; invoices/support one-liners; platform `--plat-stone`; `MarketingEmptyState` |
| Error | `ProductErrorState` | inline “Could not load…” on campaigns/reports/website |
| Page header | `PageHeader` | communities/categories/reports/create-activity inline h2; Settings/Team/Billing h1; dashboard greeting; website toolbar |
| Button | `Button` h-8 | public min-h-12; platform native min-h-11; marketing `.marketing-atelier-btn`; register gradient; toast raw button |
| Card | rarely `Card` | custom `rounded-xl\|2xl border border-border-warm bg-card/80 shadow-sm` |
| Table | none | HTML table, CSS grid, `role="row"`, `PlatformDataTable`, `DashboardScrollTable` |
| Dialog | `ui/dialog` | email-preview, insert-qr, palette, command palette, calendar popout, cookie banner |
| Input | `ui/input` | auth underline inputs; website `builder-field-utils.ts` duplicated Input CSS (no `motion-local`); public `min-h-11` / `min-h-[3.25rem]` |
| Radius | `--radius-md 10px` | Input `rounded-lg`; Button `rounded-lg`; filter `rounded-xl`; platform `rounded-[10px]` |

---

## 11. Existing DESIGN / EXPERIENCE spines

| Path | Status |
|------|--------|
| `ux-cohestra-2026-07-18/DESIGN.md` + `EXPERIENCE.md` | final — Midnight Atelier + enterprise IA |
| `ux-website-builder-2026-07-06/*` | final |
| `ux-form-experience-system-2026-09-18/EXPERIENCE.md` | no YAML status — Epic 35 |
| `ux-form-studio-2-0-2026-09-20/DESIGN.md` + `EXPERIENCE.md` | final — Epic 36 |
| `ux-cohestra-2026-08-31/*` | final — cinema |
| `ux-in-app-billing-2026-08-09/EXPERIENCE.md` | final, no DESIGN |
| Epic 37 | architecture spine only — no ux-designs folder |

**Phase 1:** `docs/DESIGN.md` is authored (D13). This inventory remains the **shipped** catalog. Target tokens and governance are §13.

---

## 12. Phase 0.1 token / primitive notes (evidence, not implementation)

| Decision | Planning note | LIVE |
|----------|---------------|------|
| D5 `--text-muted` | New semantic token ≥4.5:1. Do not globally reuse `--stone-cinema`. | `--stone` on `--paper` measured **3.00:1**; `--gold` **3.13:1** |
| D6 density | 40 desktop / 44 touch / 48 public | Button default 32; public Join 48; mobile chips 32 |
| D8 overlays | Shared `ui/dialog` + 160ms local; press 100 | Campaign preview + command palette remain custom |
| D10 platform | Inherit semantic tokens gradually | `--plat-*` still on `/platform` |

Canonical closure table: `cohestra-ux-audit.md` Phase 0.1 closure.

---

## 13. Phase 1 semantic-token and component-governance strategy

Planning only. Implementation starts in Epic 38.4 / 38.6 / 39.4 — not this PR.

### 13.1 Token strategy

| Today (shipped) | Phase 1 contract (`docs/DESIGN.md`) |
|-----------------|-------------------------------------|
| `--muted-foreground` → `--stone` `#8b939c` (3.00:1 on paper) | New `--text-muted` ≥4.5:1 on `--paper` and `--paper-warm`. Recommended seed `#5a636e`. **Do not** globally alias `--stone-cinema`. |
| `--stone` / `--gold` used as helper text | Atmosphere / eyebrow only. Gold is 3.13:1 — illegal as body. |
| Toasts `red-*` / `emerald-*` | `--danger` / `--success` |
| No `--space-*` / `--shadow-*` | 4–64 spacing scale; one overlay shadow; gutters 16/24/32 |
| Button default `h-8` (32px) | ~40 desktop / ≥44 touch / 48 public (D6) |
| `--plat-*` hex duplicates | Migrate to shared semantic tokens (D10); sparse layout may remain |
| Dialog 150/200ms; profile 200ms | Overlays 160ms local via slotted primitive (D8) |

`--stone` is **not** deleted. It stops being the default metadata color.

Dark mode must re-prove `--text-muted` ≥4.5:1. Tenant accent must not replace muted text or drop primary-button contrast.

### 13.2 Primitive strategy

| Concern | Canonical target | Adopt in |
|---------|------------------|----------|
| Dialog / sheet / alert-dialog | `web/components/ui/*` only | 38.6, then 41.3 leftovers |
| Skip link + one `main` + one `h1` | Shell + page header | 38.5, 39.4 |
| Page header | Shared `h1` + one primary action | 39.4 |
| Empty / error | `ProductEmptyState` / `ProductErrorState` | 40–43 sweep |
| Permission denied | New shared primitive | 43.2 |
| Upgrade | `UpgradePanel` + lock in nav | 39.3 |
| Data table | New shared table | 40.3, 41.1, 43.4 |
| App Router error / 404 | `error.tsx` / `not-found.tsx` | 39.5 |
| Toast | Token-mapped | 38.4 |

Missing shadcn files (table, textarea, select, checkbox, tabs, skeleton, badge) are created **once**, not per epic.

### 13.3 Exception process

Copied from DESIGN.md §19: a one-off ships only if the story names it, it does not violate D5–D9 / D11 / Epic 35–37, a follow-up in Epic 43 retires it, and code review records it. Unreviewed custom `role="dialog"` or second `<main>` is a defect.

### 13.4 D-decision → inventory note

| D | Inventory implication |
|---|------------------------|
| D5 | Add `--text-muted`; stop teaching `--stone` as `{colors.ink-muted}` for body |
| D6 | Button/input size scale in `ui/button` + `ui/input`; public 48px stays Epic 35 |
| D7 | Form Studio grid breakpoints documented here stay `xl` until story 42.2 |
| D8 | Campaign + palette dialogs leave “duplicated patterns” once migrated |
| D9 | `PageHeader` must become `h1`; Settings loses inner `<main>` |
| D10 | Platform section §2 `--plat-*` becomes deprecated aliases |
| D11 | §7 “Missing App Router files” becomes a 39.5 story, not a permanent gap |
| D13 | This file is history + shipped catalog; DESIGN.md is law |
