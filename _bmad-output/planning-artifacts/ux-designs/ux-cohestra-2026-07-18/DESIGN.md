---
name: Cohestra Enterprise
description: Multi-tenant enterprise visual identity — extends Platform 0 Warm Utility (sage/shadcn) with plan, billing, and platform-admin chrome.
status: draft
created: 2026-07-18
updated: 2026-07-18
theme:
  modes: [light, dark, system]
  default: system
  implementation: class-based (.dark on html) via next-themes
sources:
  - {planning_artifacts}/prds/prd-cohestra-enterprise-2026-07-15/prd.md
  - {planning_artifacts}/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md
  - {planning_artifacts}/ux-designs/ux-lead-generation-crm-2026-06-14/DESIGN.md
  - docs/marketing/pricing-tiers.md
inherits_visual:
  - {planning_artifacts}/ux-designs/ux-lead-generation-crm-2026-06-14/DESIGN.md
colors:
  # Inherited Platform 0 brand layer (Warm Utility). Unlisted tokens inherit shadcn.
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
  # Enterprise additions
  plan-basic: '#78716C'
  plan-basic-foreground: '#FFFFFF'
  plan-core: '#2563EB'
  plan-core-foreground: '#FFFFFF'
  plan-pro: '#2D6A4F'
  plan-pro-foreground: '#FFFFFF'
  banner-warn: '#FEF3C7'
  banner-warn-foreground: '#92400E'
  banner-warn-dark: '#422006'
  banner-warn-foreground-dark: '#FDE68A'
  banner-danger: '#FEE2E2'
  banner-danger-foreground: '#991B1B'
  banner-danger-dark: '#450A0A'
  banner-danger-foreground-dark: '#FECACA'
  stub-surface: '#F5F4F1'
  stub-surface-dark: '#1A1F1C'
typography:
  display:
    fontFamily: 'Geist Sans'
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-sm:
    fontFamily: 'Geist Sans'
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  section:
    fontFamily: 'Geist Sans'
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.35'
  public-hero:
    fontFamily: 'Geist Sans'
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.02em
  marketing-display:
    fontFamily: 'Geist Sans'
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.03em
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  public-section: 32px
  public-field-gap: 20px
  admin-row-height: 44px
  admin-sidebar-width: 240px
  banner-padding-y: 12px
  stub-max-width: 640px
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
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
  billing-banner-warn:
    background-light: '{colors.banner-warn}'
    foreground-light: '{colors.banner-warn-foreground}'
    background-dark: '{colors.banner-warn-dark}'
    foreground-dark: '{colors.banner-warn-foreground-dark}'
  billing-banner-danger:
    background-light: '{colors.banner-danger}'
    foreground-light: '{colors.banner-danger-foreground}'
    background-dark: '{colors.banner-danger-dark}'
    foreground-dark: '{colors.banner-danger-foreground-dark}'
  upgrade-panel:
    background-light: '{colors.surface-warm}'
    background-dark: '{colors.card-dark}'
    border-light: '1px solid {colors.border-warm}'
    border-dark: '1px solid {colors.border-warm-dark}'
    radius: '{rounded.lg}'
  stub-shell:
    background-light: '{colors.stub-surface}'
    background-dark: '{colors.stub-surface-dark}'
    maxWidth: '{spacing.stub-max-width}'
    radius: '{rounded.lg}'
---

# Cohestra Enterprise — Design Spine

> Extends Platform 0 **Warm Utility** (`ux-lead-generation-crm-2026-06-14/DESIGN.md`). This file owns enterprise deltas only. Spines win on conflict with mocks.

## Brand & Style

**Cohestra Enterprise** is the multi-tenant SaaS product. Visual posture stays **Warm Utility** — calm community operations, not a sales CRM war room — with clearer **plan and billing** signals so Tenant Admins always know which tier they are on.

Genres in one universe:

| Genre | Feel |
|-------|------|
| Marketing / signup (`cohestra.app`) | Clear freemium ladder; **Start free** is the hero CTA |
| Tenant admin (subdomain) | Same Warm Utility dashboard as Platform 0 + plan badge + billing banners |
| Public tenant home | **Basic stub** (minimal) · **Core fixed SitePage** · **Pro builder** |
| Public registration | Unchanged Platform 0 mobile-first welcome |
| Platform Admin | Sparse ops console — denser tables, muted chrome, no marketing flair |

`[ASSUMPTION]` Enterprise keeps Platform 0 forest-green primary until a dedicated Cohestra brand kit is supplied. Typography uses **Geist Sans** (shadcn default) for display — Platform 0 Inter overrides are **not** carried forward `[ASSUMPTION: refine if brand kit arrives]`.

**Do not** introduce purple/indigo SaaS gradients, terracotta-cream editorial kits, or broadsheet newspaper layouts for v1.

## Colors

Inherited: forest primary, accent green, warm surfaces, Lead Status, WhatsApp — see Platform 0 DESIGN.md.

Enterprise additions:

- **Plan badges** — `{colors.plan-basic}` / `{colors.plan-core}` / `{colors.plan-pro}` — small, quiet, never competing with primary CTAs
- **Billing banners** — warn (PastDue / trial ending) and danger (OnHold / Suspended public maintenance) tokens above
- **Stub surface** — slightly cooler warm canvas than admin cards so Basic public home reads as “simple list,” not a designed site

## Typography

Body/labels inherit Geist Sans from shadcn. Enterprise uses:

- `{typography.display}` / `{typography.display-sm}` — admin titles
- `{typography.public-hero}` — Core/Pro SitePage and registration hero
- `{typography.marketing-display}` — apex marketing only (`cohestra.app`)

Basic stub uses `{typography.display-sm}` for org name — no marketing-display on stub.

## Layout & Spacing

Inherit Platform 0 admin sidebar width and public form max-width.

Enterprise deltas:

- **BillingBanner** — full-bleed under top bar; `{spacing.banner-padding-y}` vertical padding; single line + one CTA on `sm`
- **Stub home** — centered column `{spacing.stub-max-width}`; activity list as plain links, not cards
- **UpgradePanel** — replaces locked modules (campaigns, builder, Team invite on Basic); one headline, one sentence, one primary upgrade CTA

## Elevation & Depth

Inherit Platform 0: light borders, no multi-layer shadows. Billing banners are flat color bands, not floating toasts for PastDue/OnHold (Toast only for transient success/errors).

## Shapes

Inherit `{rounded.md}` buttons and `{rounded.lg}` panels. Plan badges use `{rounded.sm}` (not pill-full) to avoid “feature chip” clutter.

## Components

| Component | Visual contract |
|-----------|-----------------|
| **PlanBadge** | `{components.plan-badge-*}`; shows Basic / Core / Pro / Enterprise next to tenant name in top bar |
| **BillingBanner** | Warn or danger tokens; always includes one text link/button (Customer Portal or upgrade) |
| **UpgradePanel** | `{components.upgrade-panel}`; Admin sees Checkout CTA; Member sees feature-locked copy without billing controls (FR-5) |
| **StubShell** | `{components.stub-shell}`; org display name + published activity links only |
| **SeatGate** | Disabled invite control + short reason; primary CTA “Upgrade to Core” for Tenant Admin |

Platform 0 components (RegistrationForm, ActivityHero, StatusBadge, etc.) unchanged unless plan-gated (hide Campaigns nav on Basic/Core).

## Do's and Don'ts

**Do**

- Show plan + billing state continuously for Tenant Admin
- Keep Basic stub visually quieter than Core SitePage
- Reuse Platform 0 public registration look on all plans

**Don't**

- Put Stripe invoice tables or custom finance UI in-app (Customer Portal only)
- Show upgrade Checkout CTAs to Tenant Members (FR-5)
- Dress Basic stub like a marketing landing page
- Use “club” as a product label — official term is **Community**
