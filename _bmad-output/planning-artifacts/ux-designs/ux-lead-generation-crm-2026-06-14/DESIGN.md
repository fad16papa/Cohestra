---
name: Activity Lead Engine
description: Warm, community-grounded visual identity for operator dashboard and per-activity public registration — shadcn/ui brand layer with light, dark, and system themes.
status: final
created: 2026-06-14
updated: 2026-06-14
theme:
  modes: [light, dark, system]
  default: system
  implementation: class-based (.dark on html) via next-themes
  persistence:
    admin: user account preference (synced to Settings)
    public: localStorage per browser
  no-flash: inline script resolves theme before first paint
sources:
  - {planning_artifacts}/prds/prd-cohestra-2026-06-14/prd.md
  - {planning_artifacts}/briefs/brief-cohestra-2026-06-14/brief.md
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-06-14/.decision-log.md
colors:
  # Brand overrides on shadcn defaults. Unlisted tokens inherit shadcn (background,
  # foreground, muted, card, popover, border, input, ring, destructive).
  primary: '#2D6A4F'
  primary-foreground: '#FFFFFF'
  accent: '#40916C'
  accent-foreground: '#FFFFFF'
  primary-dark: '#52B788'
  primary-foreground-dark: '#081C15'
  accent-dark: '#74C69D'
  accent-foreground-dark: '#081C15'
  surface-warm: '#FAFAF8'
  surface-warm-dark: '#1A1F1C'
  border-warm: '#E8E4DF'
  border-warm-dark: '#2D3330'
  text-warm: '#1A1714'
  text-warm-dark: '#F2F0EC'
  text-muted-warm: '#6B6560'
  text-muted-warm-dark: '#A8A29E'
  background-light: '#FFFFFF'
  background-dark: '#121816'
  card-light: '#FAFAF8'
  card-dark: '#1E2421'
  status-new: '#2563EB'
  status-new-foreground: '#FFFFFF'
  status-contacted: '#D97706'
  status-contacted-foreground: '#FFFFFF'
  status-active: '#2D6A4F'
  status-active-foreground: '#FFFFFF'
  status-active-dark: '#52B788'
  status-active-foreground-dark: '#081C15'
  status-inactive: '#78716C'
  status-inactive-foreground: '#FFFFFF'
  status-inactive-dark: '#57534E'
  status-inactive-foreground-dark: '#F2F0EC'
  whatsapp: '#25D366'
  whatsapp-foreground: '#FFFFFF'
typography:
  # Body, label, caption inherit shadcn (Geist Sans). Display + section titles overridden.
  display:
    fontFamily: 'Inter'
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-sm:
    fontFamily: 'Inter'
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  section:
    fontFamily: 'Inter'
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.35'
  public-hero:
    fontFamily: 'Inter'
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.02em
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
spacing:
  public-section: 32px
  public-field-gap: 20px
  admin-row-height: 44px
  admin-sidebar-width: 240px
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
  button-whatsapp:
    background: '{colors.whatsapp}'
    foreground: '{colors.whatsapp-foreground}'
    radius: '{rounded.md}'
  status-badge-new:
    background: '{colors.status-new}'
    foreground: '{colors.status-new-foreground}'
    radius: '{rounded.full}'
  status-badge-contacted:
    background: '{colors.status-contacted}'
    foreground: '{colors.status-contacted-foreground}'
    radius: '{rounded.full}'
  status-badge-active:
    background: '{colors.status-active}'
    foreground: '{colors.status-active-foreground}'
    radius: '{rounded.full}'
  status-badge-inactive:
    background: '{colors.status-inactive}'
    foreground: '{colors.status-inactive-foreground}'
    radius: '{rounded.full}'
  activity-card:
    background-light: '{colors.surface-warm}'
    background-dark: '{colors.card-dark}'
    border-light: '1px solid {colors.border-warm}'
    border-dark: '1px solid {colors.border-warm-dark}'
    radius: '{rounded.lg}'
  public-form-shell:
    background-light: '{colors.surface-warm}'
    background-dark: '{colors.card-dark}'
    border-light: '1px solid {colors.border-warm}'
    border-dark: '1px solid {colors.border-warm-dark}'
    maxWidth: 480px
    radius: '{rounded.lg}'
  data-table-row:
    minHeight: '{spacing.admin-row-height}'
  theme-toggle:
    radius: '{rounded.md}'
    icon-size: 18px
---

## Brand & Style

The Activity Lead Engine is a **community operations hub**, not an enterprise CRM. Visual posture is **Warm Utility**: calm, trustworthy, and human — the operator feels in control on Monday morning; the participant feels welcomed when scanning a QR at the court.

The product serves two genres in one universe:

- **Public registration** — spacious, thumb-friendly, one clear action per screen. Feels like joining an activity, not submitting to a database.
- **Operator dashboard** — medium density, scannable tables, confident operational tone. Feels like a focused workspace, not a sales war room.

`[ASSUMPTION]` No client brand assets exist at UX time. Platform uses forest-green primary (growth, community, outdoor activities). Per-activity public pages may override **accent color** and **hero image** only — typography and spacing stay on platform tokens until client supplies brand kits.

Inherits **shadcn/ui** on Tailwind. This DESIGN.md specifies brand-layer deltas only. Customizing shadcn primitives beyond listed tokens is out of brand discipline for MVP.

**Theme support:** Light, Dark, and System (follow OS `prefers-color-scheme`). Every surface — admin and public — must render correctly in both resolved appearances. System is the default for first-time users.

## Theme & Appearance

| Mode | Behavior |
|------|----------|
| **Light** | Warm off-white canvas (`{colors.surface-warm}`), `{colors.text-warm}` body text |
| **Dark** | Deep forest charcoal canvas (`{colors.background-dark}`), warm off-white text (`{colors.text-warm-dark}`) — not pure black |
| **System** | Follows OS setting; updates live when OS theme changes without page reload |

**Implementation contract (for architecture/dev):**

- Use shadcn `darkMode: ['class']` + **next-themes** with `attribute="class"`, `defaultTheme="system"`, `enableSystem={true}`.
- Map brand tokens to CSS variables in `:root` and `.dark` — components reference semantic vars (`--background`, `--foreground`, `--primary`, custom warm tokens), never hard-coded hex in JSX.
- **No flash of wrong theme:** blocking inline script in document `<head>` reads stored preference before paint.
- **Persistence:** Admin preference saved to operator account (Settings) and mirrored to localStorage for instant load. Public registration uses localStorage only (no participant account).
- **QR codes:** Always render on white background in download PNG regardless of UI theme — scannability over aesthetic consistency.

**Theme control placement:**

- **Admin:** `ThemeToggle` in top bar (cycles icon: sun / moon / monitor) + full **Appearance** section in Settings (segmented control: Light · Dark · System).
- **Public:** Compact `ThemeToggle` in page footer (icon + label on `sm+`); same three options in a popover — not buried in Settings.

## Colors

- **Forest Primary** — light: `{colors.primary}` · dark: `{colors.primary-dark}` with matching foreground tokens. Primary buttons, active nav, links, success confirmations.
- **Accent Green** — light: `{colors.accent}` · dark: `{colors.accent-dark}`. Secondary highlights and activity performance chips. Not used for Lead Status.
- **Warm Surfaces** — light: `{colors.surface-warm}` / `{colors.border-warm}` · dark: `{colors.card-dark}` / `{colors.border-warm-dark}`. Canvas and dividers. Avoid cold blue-gray in either mode.
- **Text** — light: `{colors.text-warm}` / `{colors.text-muted-warm}` · dark: `{colors.text-warm-dark}` / `{colors.text-muted-warm-dark}`.
- **Lead Status semantics** — dedicated tokens, never repurposed:
  - **New** — `{colors.status-new}` (blue: untouched pipeline)
  - **Contacted** — `{colors.status-contacted}` (amber: outreach started)
  - **Active** — `{colors.status-active}` light / `{colors.status-active-dark}` dark
  - **Inactive** — `{colors.status-inactive}` light / `{colors.status-inactive-dark}` dark
- **WhatsApp action** — `{colors.whatsapp}` exclusively on WhatsApp click-to-message buttons. Never used for generic primary actions.
- **All other tokens** inherit shadcn defaults.

Avoid: gradient hero backgrounds, more than one accent per screen, using status colors decoratively, red/green alone for non-status meaning (accessibility).

## Typography

Body, labels, and table text inherit **Geist Sans** from shadcn. Brand overrides:

- **`display` / `display-sm`** — dashboard page titles, report headers
- **`section`** — card titles, sidebar section labels
- **`public-hero`** — activity name on public registration hero only

Public forms use **`body-md`** (inherited) at 16px minimum. No secondary display font in MVP.

## Layout & Spacing

**Admin shell:** Left sidebar `{spacing.admin-sidebar-width}`; content area `max-w-7xl` with 24px padding. Desktop-first; sidebar collapses to icon rail below `768px`, then `Sheet` navigation.

**Public shell:** Single column, centered, `{components.public-form-shell.maxWidth}`. Minimum 20px side margins on mobile. Vertical rhythm `{spacing.public-section}` between hero, form, and footer.

**Spacing scale:** Tailwind 4-based steps (4, 8, 12, 16, 20, 24, 32, 48, 64). Public tap targets ≥ 48px height.

## Elevation & Depth

Depth via **tonal layering**, not heavy shadows. Shadow tokens must invert appropriately per theme.

- **Light cards:** `{colors.surface-warm}` on `{colors.background-light}`, 1px `{colors.border-warm}` border
- **Dark cards:** `{colors.card-dark}` on `{colors.background-dark}`, 1px `{colors.border-warm-dark}` border
- **Hover lift (light):** `0 1px 3px rgba(26, 23, 20, 0.08)`
- **Hover lift (dark):** `0 1px 3px rgba(0, 0, 0, 0.35)` — subtle, never glow
- Modals/dialogs: shadcn overlay adapts via `--background` / `--foreground`; `rounded.lg` constant
- Public form shell: border only in both themes; no drop shadow
- Sidebar (admin): one step darker than content well in dark mode (`{colors.background-dark}` vs `{colors.card-dark}`)

## Shapes

Base radius `{rounded.md}` (8px). Cards and public shell use `{rounded.lg}`. Status badges `{rounded.full}`. Inputs `{rounded.sm}`. Avoid pill-shaped primary buttons — community tool, not consumer social app.

## Components

### Layer 1 — shadcn primitives (inherited, lightly themed)

`Button`, `Input`, `Select`, `Checkbox`, `Label`, `Textarea`, `Dialog`, `Sheet`, `Tabs`, `Toast`, `Badge`, `Card`, `Separator`, `DropdownMenu`, `DataTable` (TanStack Table).

### Layer 2 — domain components

| Component | Visual spec |
|-----------|-------------|
| **StatusBadge** | Maps Lead Status → status-badge-* tokens. Always text + color; never icon-only. |
| **ActivityCard** | `{components.activity-card}`. Activity name (`section`), community tag, registration count, status pill. Hover lift shadow. |
| **ClientRow** | DataTable row. Name semibold, status badge, last activity caption, chevron. |
| **RegistrationForm** | Renders from Activity JSON schema. Public variant: full-width fields, `{spacing.public-field-gap}`. Admin preview variant: bordered preview card. |
| **ActivityHero** | Public only. Optional cover image (16:9, max 50kb `[ASSUMPTION]`), activity title (`public-hero`), schedule/location meta, hosted-by line. |
| **TimelineEvent** | Left border accent `{colors.primary}`, timestamp muted, event type label caps. |
| **MetricTile** | Large number (`display-sm`), label caption, optional trend — dashboard only. |
| **QrPanel** | QR image centered, copy-link button, download PNG button. |
| **ConsentBlock** | Board Game template only. Bordered card, checkbox required, `{colors.border-warm}` default / `{colors.primary}` when checked. |
| **WhatsAppButton** | `{components.button-whatsapp}` + WhatsApp icon. Full width on mobile client profile. Brand green unchanged in both themes. |
| **ThemeToggle** | Ghost icon button in admin top bar; footer control on public. Popover or dropdown with Light / Dark / System segmented options. Active mode visually indicated. |

### Layer 3 — page shells

| Shell | Rules |
|-------|-------|
| **DashboardLayout** | Sidebar nav, top bar with page title + "Updated {time}" + **ThemeToggle**, content well uses semantic `{colors.background-*}` / `{colors.card-*}` |
| **PublicFormLayout** | No nav, no auth chrome, centered column, footer with **ThemeToggle** + "Powered by Creativorare" `[ASSUMPTION]` |

Shells do not share navigation components. Public routes must never render admin sidebar.

## Do's and Don'ts

**Do**

- Use action-oriented button labels: "Join activity", "Save activity", "Copy registration link"
- Keep public pages to one primary CTA visible at all times
- Show Lead Status color + text together
- Allow per-activity hero image and accent override on public pages only
- Ship complete light and dark token sets — test both before marking any screen done
- Default new users to **System** theme; respect OS preference without forcing light

**Don't**

- Hard-code hex colors in components — always semantic CSS variables
- Partial dark mode (some screens light-only) — both shells must support all three modes
- Drag-and-drop form builder UI, inline table editing, skeleton loaders on every widget
- "Submit form", "CRM", or enterprise jargon on participant-facing copy
- Charts beyond simple bar summaries on dashboard/reports in MVP
- Bleed admin chrome into public registration URLs
