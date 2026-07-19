---
name: Cohestra Enterprise
description: Modern event-ops product craft (RegFox-caliber) — clean white, ink navy, teal action. Cohestra brand; not Platform 0 forest green.
status: final
created: 2026-07-18
updated: 2026-07-19
theme:
  modes: [light, dark, system]
  default: light
  implementation: class-based (.dark on html) via next-themes
sources:
  - {planning_artifacts}/prds/prd-cohestra-enterprise-2026-07-15/prd.md
  - docs/marketing/pricing-tiers.md
  - visual_reference: RegFox product craft (clean SaaS + registration confidence) — craft only, not feature parity
colors:
  # Cohestra × RegFox-caliber craft
  primary: '#0B1F2A'          # ink navy — headlines, nav active
  primary-foreground: '#F8FAFC'
  accent: '#0F9F8A'           # action teal — primary CTAs only
  accent-foreground: '#042F2E'
  accent-hover: '#0B8A77'
  canvas: '#FFFFFF'
  canvas-muted: '#F4F6F8'
  ink: '#0B1F2A'
  ink-secondary: '#334155'
  ink-muted: '#64748B'
  line: '#E2E8F0'
  line-strong: '#CBD5E1'
  success: '#059669'
  success-soft: '#ECFDF5'
  warn: '#B45309'
  warn-soft: '#FFFBEB'
  danger: '#B91C1C'
  danger-soft: '#FEF2F2'
  # Dark
  primary-dark: '#5EEAD4'
  primary-foreground-dark: '#042F2E'
  canvas-dark: '#0B1F2A'
  canvas-muted-dark: '#122636'
  ink-dark: '#F1F5F9'
  ink-muted-dark: '#94A3B8'
  line-dark: '#1E3A4C'
  # Plan badges (quiet)
  plan-basic: '#64748B'
  plan-basic-foreground: '#FFFFFF'
  plan-core: '#0284C7'
  plan-core-foreground: '#FFFFFF'
  plan-pro: '#0F9F8A'
  plan-pro-foreground: '#042F2E'
  sponsored: '#6D28D9'
  sponsored-foreground: '#FFFFFF'
typography:
  display:
    fontFamily: 'Sora'
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-sm:
    fontFamily: 'Sora'
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.03em
  section:
    fontFamily: 'Sora'
    fontSize: 18px
    fontWeight: '650'
    lineHeight: '1.3'
  marketing-display:
    fontFamily: 'Sora'
    fontSize: 56px
    fontWeight: '700'
    lineHeight: '1.05'
    letterSpacing: -0.045em
  public-hero:
    fontFamily: 'Sora'
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.03em
  body:
    fontFamily: 'Source Sans 3'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.55'
  label:
    fontFamily: 'Source Sans 3'
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: 0.04em
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
spacing:
  admin-sidebar-width: 232px
  admin-row-height: 48px
  page-gutter: 24px
  section-y: 72px
  stub-max-width: 480px
components:
  button-primary:
    background: '{colors.accent}'
    foreground: '{colors.accent-foreground}'
    radius: '{rounded.md}'
    height: 44px
  button-secondary:
    background: '{colors.canvas}'
    foreground: '{colors.primary}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.md}'
  browser-frame:
    background: '{colors.canvas-muted}'
    border: '1px solid {colors.line}'
    radius: '{rounded.xl}'
    chrome-height: 36px
  data-table:
    row-height: '{spacing.admin-row-height}'
    border: '1px solid {colors.line}'
    header-background: '{colors.canvas-muted}'
  plan-badge-basic:
    background: '{colors.plan-basic}'
    foreground: '{colors.plan-basic-foreground}'
    radius: '{rounded.sm}'
  plan-badge-core:
    background: '{colors.plan-core}'
    foreground: '{colors.plan-core-foreground}'
    radius: '{rounded.sm}'
  plan-badge-pro:
    background: '{colors.plan-pro}'
    foreground: '{colors.plan-pro-foreground}'
    radius: '{rounded.sm}'
  sponsored-badge:
    background: '{colors.sponsored}'
    foreground: '{colors.sponsored-foreground}'
    radius: '{rounded.sm}'
---

# Cohestra Enterprise — Design Spine

> **Craft target:** RegFox-caliber modern product SaaS — clean, confident, registration-grade.  
> **Brand:** Cohestra (ink navy + teal action). Spines win on conflict with mocks.

→ Key screens: `mockups/marketing-start-free.html` · `mockups/basic-stub-home.html` · `mockups/admin-dashboard-basic.html` · `mockups/share-kit.html` · `mockups/team-seat-gate.html` · `mockups/platform-admin-suspend.html`

## Brand & Style

**Posture:** Professional event-ops product. White canvas, ink headlines, one teal CTA. The hero shows a **real product surface in a browser frame**, not decorative mist.

Inspired by RegFox’s product confidence (builder clarity, attendee trust, clean marketing) — **craft only**. Cohestra remains the operator stack killer (CRM after QR), not a RegFox ticketing clone.

| Surface | Feel |
|---------|------|
| Marketing | White, bold type, product screenshot as visual anchor |
| Tenant admin | Dense, tool-like — tables, clear hierarchy, minimal decoration |
| Public stub / register | Branded header band + clear register actions (conversion-first) |
| Platform Admin | Utility console — muted, data-forward |

**Typography:** Sora (display) + Source Sans 3 (UI/body). No Inter / Roboto / Arial as brand faces.

**Motion (intentional, 2–3):** (1) hero product frame subtle lift on load, (2) CTA hover lift, (3) table row highlight. No ambient particle/grid drift.

## Colors

- **Ink navy** `{colors.primary}` — wordmark, H1, sidebar
- **Teal action** `{colors.accent}` — only primary buttons / key links
- **White / muted canvas** — marketing + admin backgrounds
- **Slate text** — secondary / muted
- **Hairline borders** `{colors.line}` — structure without card-shadow stacks

Avoid: purple SaaS glow, cream–terracotta editorial, mist-orb heroes, multi-layer shadows, emoji.

## Typography

| Token | Use |
|-------|-----|
| `{typography.marketing-display}` | Marketing H1 |
| `{typography.display}` / `display-sm` | Admin titles |
| `{typography.public-hero}` | Stub / SitePage / register titles |
| `{typography.body}` / `label` | UI copy, tables |

## Layout & Spacing

- Marketing first viewport: **brand · one headline · one sentence · CTA group · product frame** (full-bleed or edge-dominant). No stats strip in hero.
- Admin: fixed sidebar `{spacing.admin-sidebar-width}`; content on white; tables preferred over card grids.
- Public: header brand band → activity list / form; thumb-friendly CTAs.

## Elevation & Depth

Almost flat. Separation via border + background shift (`canvas` / `canvas-muted`). Browser frame may use a single soft shadow for product realism — nowhere else by default.

## Shapes

`{rounded.md}` controls; `{rounded.xl}` browser frame; badges `{rounded.sm}` (not pill clusters).

## Components

| Component | Contract |
|-----------|----------|
| **BrowserFrame** | Fake macOS/chrome dots + URL bar; contains live-looking product UI |
| **DataTable** | Dense rows, sticky header, status chips |
| **PlanBadge / SponsoredBadge** | Quiet, uppercase micro labels |
| **PrimaryButton** | Teal, 44px height, high contrast |
| **SetupChecklist** | Numbered steps in a single panel — not gamified cards |
| **ShareKit** | OG preview + copy fields + QR — ops tool, not social collage |

## Do's and Don'ts

**Do:** Show the product. Use real activity/client copy. Keep one accent. Match RegFox-level polish on registration confidence.

**Don't:** Abstract gradient playgrounds, “Before/After” pastel cards as hero, purple glows, inventing RegFox features (marketplace fees, badge printing) into Cohestra v1.
