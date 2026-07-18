---
name: Cohestra Enterprise
description: Gathered Clarity — Cohestra multi-tenant brand kit (ink lagoon, teal signal, cool mist). Distinct from Platform 0 forest green.
status: final
created: 2026-07-18
updated: 2026-07-18
theme:
  modes: [light, dark, system]
  default: light
  implementation: class-based (.dark on html) via next-themes
sources:
  - {planning_artifacts}/prds/prd-cohestra-enterprise-2026-07-15/prd.md
  - {planning_artifacts}/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md
  - docs/marketing/pricing-tiers.md
colors:
  # Gathered Clarity — Cohestra brand kit (v1)
  primary: '#143D4A'
  primary-foreground: '#F7FBFC'
  accent: '#0D9488'
  accent-foreground: '#042F2E'
  signal: '#0F766E'
  signal-foreground: '#F0FDFA'
  mist: '#F0F4F7'
  mist-deep: '#E2EAF0'
  ink: '#0C1B24'
  ink-muted: '#5A6B75'
  line: '#C5D0D8'
  surface: '#FFFFFF'
  surface-raised: '#F7FAFB'
  # Dark mode paired tokens
  primary-dark: '#5EEAD4'
  primary-foreground-dark: '#042F2E'
  accent-dark: '#2DD4BF'
  accent-foreground-dark: '#042F2E'
  mist-dark: '#0C1B24'
  mist-deep-dark: '#12263A'
  ink-dark: '#E8F1F5'
  ink-muted-dark: '#94A8B4'
  line-dark: '#2A3F4D'
  surface-dark: '#102029'
  surface-raised-dark: '#163040'
  # Plan + status
  plan-basic: '#64748B'
  plan-basic-foreground: '#FFFFFF'
  plan-core: '#0284C7'
  plan-core-foreground: '#FFFFFF'
  plan-pro: '#0D9488'
  plan-pro-foreground: '#042F2E'
  sponsored: '#7C3AED'
  sponsored-foreground: '#FFFFFF'
  banner-warn: '#FEF3C7'
  banner-warn-foreground: '#92400E'
  banner-warn-dark: '#422006'
  banner-warn-foreground-dark: '#FDE68A'
  banner-danger: '#FEE2E2'
  banner-danger-foreground: '#991B1B'
  banner-danger-dark: '#450A0A'
  banner-danger-foreground-dark: '#FECACA'
  stub-surface: '#F4F7F9'
  stub-surface-dark: '#12263A'
  # Lead status (ops semantics — keep distinct from brand accent)
  status-new: '#0284C7'
  status-new-foreground: '#FFFFFF'
  status-contacted: '#D97706'
  status-contacted-foreground: '#FFFFFF'
  status-active: '#0D9488'
  status-active-foreground: '#042F2E'
  status-inactive: '#64748B'
  status-inactive-foreground: '#FFFFFF'
  whatsapp: '#25D366'
  whatsapp-foreground: '#FFFFFF'
typography:
  display:
    fontFamily: 'Sora'
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.03em
  display-sm:
    fontFamily: 'Sora'
    fontSize: 24px
    fontWeight: '650'
    lineHeight: '1.25'
    letterSpacing: -0.02em
  section:
    fontFamily: 'Sora'
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.35'
  marketing-display:
    fontFamily: 'Sora'
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.08'
    letterSpacing: -0.035em
  public-hero:
    fontFamily: 'Sora'
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.02em
  body:
    fontFamily: 'Source Sans 3'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: 'Source Sans 3'
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.35'
    letterSpacing: 0.02em
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
spacing:
  public-section: 32px
  public-field-gap: 20px
  admin-row-height: 44px
  admin-sidebar-width: 248px
  banner-padding-y: 12px
  stub-max-width: 640px
  marketing-gutter: 24px
components:
  button-primary:
    background: '{colors.accent}'
    foreground: '{colors.accent-foreground}'
    radius: '{rounded.md}'
  button-secondary:
    background: 'transparent'
    foreground: '{colors.primary}'
    border: '1px solid {colors.line}'
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
  sponsored-badge:
    background: '{colors.sponsored}'
    foreground: '{colors.sponsored-foreground}'
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
    background-light: '{colors.surface-raised}'
    background-dark: '{colors.surface-raised-dark}'
    border-light: '1px solid {colors.line}'
    border-dark: '1px solid {colors.line-dark}'
    radius: '{rounded.lg}'
  stub-shell:
    background-light: '{colors.stub-surface}'
    background-dark: '{colors.stub-surface-dark}'
    maxWidth: '{spacing.stub-max-width}'
    radius: '{rounded.lg}'
  marketing-hero:
    background: 'linear-gradient(145deg, {colors.mist} 0%, {colors.mist-deep} 55%, #D5E4EC 100%)'
---

# Cohestra Enterprise — Design Spine

> **Gathered Clarity** — Cohestra’s own brand kit. Not Platform 0 forest green. Spines win on conflict with mocks.

→ Key screens: `mockups/marketing-start-free.html`, `mockups/basic-stub-home.html`, `mockups/admin-dashboard-basic.html`, `mockups/team-seat-gate.html`, `mockups/platform-admin-suspend.html`

## Brand & Style

**Cohestra** gathers community activity into one clear signal. Visual posture: **Gathered Clarity** — cool mist atmosphere, ink lagoon authority, teal action. Feels operational and welcoming; never sales-CRM purple, never cream-and-terracotta editorial, never broadsheet.

| Genre | Feel |
|-------|------|
| Marketing (`cohestra.app`) | Full-bleed mist gradient hero; **Cohestra** as hero-level brand; one headline; Start free primary |
| Tenant admin | Quiet ink chrome; teal primary actions; PlanBadge always visible |
| Basic stub | Minimal list — intentionally quieter than Core SitePage |
| Public registration | Same brand tokens; mobile-first; thumb-friendly |
| Platform Admin | Denser, muted — ops console, not marketing |

**Typography:** **Sora** (display / UI titles) + **Source Sans 3** (body / tables). Do not use Inter, Roboto, or Arial as brand faces.

**Theme default:** Light (marketing-led). Dark + System supported for admin/public app chrome.

## Colors

- **Ink lagoon** `{colors.primary}` — nav active, headings, authority
- **Teal signal** `{colors.accent}` — primary CTAs, focus, success-adjacent actions
- **Cool mist** `{colors.mist}` → `{colors.mist-deep}` — atmospheric canvas / marketing hero gradient
- **Ink / muted** — body and secondary text
- **Plan badges** — Basic slate · Core sky · Pro teal
- **Sponsored** `{colors.sponsored}` — complimentary tenants only (small badge beside PlanBadge)
- **Billing banners** — warn / danger pairs (light + dark)
- Lead Status + WhatsApp tokens remain semantic, not decorative brand accents

Avoid: purple SaaS gradients, glow stacks, terracotta-cream kits, pure black dark mode.

## Typography

| Token | Use |
|-------|-----|
| `{typography.marketing-display}` | Apex hero brand/headline |
| `{typography.display}` / `display-sm` | Admin page titles |
| `{typography.public-hero}` | Stub org name, SitePage hero, registration title |
| `{typography.body}` / `label` | Forms, tables, microcopy |

## Layout & Spacing

- Marketing: one composition first viewport — brand, one headline, one sentence, CTA group, atmospheric plane (no stats strip)
- Admin sidebar `{spacing.admin-sidebar-width}`
- BillingBanner full-bleed under top bar
- Stub max width `{spacing.stub-max-width}`; activity links not cards

## Elevation & Depth

Borders via `{colors.line}`; no multi-layer shadows. Atmosphere from mist gradients, not drop shadows.

## Shapes

`{rounded.md}` controls; `{rounded.sm}` badges (not pill-full clusters); `{rounded.lg}` panels.

## Components

| Component | Contract |
|-----------|----------|
| **PlanBadge** | Visible to Admin and Member (Member read-only) |
| **SponsoredBadge** | When `IsComplimentary`; sits beside PlanBadge |
| **BillingBanner** | Warn/danger; one CTA (Portal or upgrade) |
| **UpgradePanel** | Admin → Checkout; Member → feature-locked, no billing |
| **SeatGate** | Disabled invite + upgrade reason |
| **StubShell** | Org name + published activity links |
| **CaptchaGate** | Google reCAPTCHA on signup (accessible challenge path) |
| **MarketingHero** | `{components.marketing-hero}` full-bleed mist plane |

## Do's and Don'ts

**Do:** Lead with the Cohestra wordmark on marketing; keep Basic stub quiet; show Sponsored + Plan together for comps.

**Don't:** Reuse Platform 0 forest green as the enterprise brand; show Portal to Members; dress stub like a landing page; emoji in product chrome.
