---
name: Cohestra Enterprise
description: Midnight Atelier — premium community-ops product craft. Deep ink, quiet gold, lagoon action, editorial type, photographic soul.
status: final
created: 2026-07-18
updated: 2026-07-20
theme:
  modes: [light, dark, system]
  default: light
  implementation: class-based (.dark on html) via next-themes
sources:
  - {planning_artifacts}/prds/prd-cohestra-enterprise-2026-07-15/prd.md
  - craft_reference: premium SaaS / registration confidence (RegFox polish) + editorial luxury restraint
colors:
  ink: '#070D12'
  ink-soft: '#141C24'
  paper: '#FAFBFC'
  paper-warm: '#F3F5F7'
  stone: '#8B939C'
  line: '#E6E9ED'
  line-strong: '#D0D5DB'
  lagoon: '#0B6B63'
  lagoon-deep: '#08554F'
  lagoon-fg: '#F3FFFC'
  gold: '#A68B5B'
  gold-soft: '#F4EEE3'
  success: '#1F7A5C'
  warn: '#9A6700'
  danger: '#9B1C1C'
  # legacy aliases used by components
  primary: '#070D12'
  primary-foreground: '#FAFBFC'
  accent: '#0B6B63'
  accent-foreground: '#F3FFFC'
  canvas: '#FAFBFC'
  canvas-muted: '#F3F5F7'
  ink-muted: '#8B939C'
typography:
  display:
    fontFamily: 'Fraunces'
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1.08'
    letterSpacing: -0.03em
  display-sm:
    fontFamily: 'Fraunces'
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.15'
    letterSpacing: -0.025em
  marketing-display:
    fontFamily: 'Fraunces'
    fontSize: 64px
    fontWeight: '500'
    lineHeight: '1.02'
    letterSpacing: -0.035em
  public-hero:
    fontFamily: 'Fraunces'
    fontSize: 36px
    fontWeight: '500'
    lineHeight: '1.12'
    letterSpacing: -0.03em
  section:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.12em
  body:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.35'
    letterSpacing: 0.06em
rounded:
  sm: 4px
  md: 10px
  lg: 16px
  xl: 24px
spacing:
  admin-sidebar-width: 240px
  page-gutter: 32px
  section-y: 96px
  hero-gap: 64px
components:
  button-primary:
    background: '{colors.lagoon}'
    foreground: '{colors.lagoon-fg}'
    radius: '{rounded.md}'
    height: 48px
  button-secondary:
    background: 'transparent'
    foreground: '{colors.ink}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.md}'
  button-gold:
    background: '{colors.ink}'
    foreground: '{colors.gold-soft}'
    radius: '{rounded.md}'
  browser-frame:
    radius: '{rounded.xl}'
    border: '1px solid {colors.line}'
    shadow: '0 40px 80px rgba(7, 13, 18, 0.14)'
  hairline-rule:
    color: '{colors.line}'
    thickness: 1px
---

# Cohestra Enterprise — Design Spine

> **Midnight Atelier** — expensive, quiet, human. Soul over chrome. Spines win on conflict.

→ Key screens: `mockups/marketing-start-free.html` · `mockups/basic-stub-home.html` · `mockups/admin-dashboard-basic.html` · `mockups/share-kit.html` · `mockups/team-seat-gate.html`

## Brand & Style

Cohestra is where community activity becomes a lasting relationship. The product should feel like a **private atelier for operators** — considered, calm, costly in the best way — never a commodity admin template.

**Soul:** People gathering. Courts at dusk. Names remembered. Registration as hospitality, not form submission.

**Craft principles**

1. **Editorial type** — Fraunces for voice; Plus Jakarta Sans for instruments.
2. **Restraint** — large quiet fields of paper; fewer elements; one action per region.
3. **Material** — hairline rules, one deep shadow on the product frame only, no glow stacks.
4. **Photography** — real atmosphere (sport / gathering), darkened for type; never stock-collage clutter.
5. **Gold as whisper** — `{colors.gold}` for rare emphasis (eyebrow, hairline accent), not buttons everywhere.
6. **Lagoon as will** — one primary CTA color; earned, not decorative.

| Surface | Expensive feel |
|---------|----------------|
| Marketing | Asymmetric hero, serif brand word, photographic field, product frame as object |
| Admin | Gallery-quiet sidebar, airy metrics, typographic tables |
| Public stub | Hospitality header photo, composed registration options |
| Share kit | Print-quality assets, not “growth hack” chips |

Reject: AI mist orbs, purple SaaS, cream–terracotta kits, Inter/Roboto, emoji, pill clusters, multi-shadow cards, busy feature grids in the first viewport.

## Colors

- **Ink** `{colors.ink}` — near-black navy for authority
- **Paper** `{colors.paper}` / `{colors.paper-warm}` — cool quiet canvas (not yellow cream)
- **Lagoon** `{colors.lagoon}` — sole primary action
- **Gold** `{colors.gold}` / `{colors.gold-soft}` — atelier accent, sparingly
- **Stone** `{colors.stone}` — secondary text

## Typography

| Token | Soul |
|-------|------|
| `{typography.marketing-display}` | Brand / hero — soft weight, optical size |
| `{typography.display}` | Page titles |
| `{typography.section}` | Eyebrows — wide tracking, small |
| `{typography.body}` | Reading text — generous leading |

## Layout & Spacing

- Hero: brand word as art · one line of promise · one sentence · CTA · photographic or product object
- Prefer **asymmetric** columns (5/7) over equal split
- Section rhythm `{spacing.section-y}` — do not pack

## Elevation & Depth

Almost flat. Product frame may use `{components.browser-frame.shadow}`. Elsewhere: border only.

## Shapes

Soft `{rounded.lg}` / `{rounded.xl}` on frames; controls `{rounded.md}`; avoid pill-full.

## Components

| Component | Soul note |
|-----------|-----------|
| **Wordmark** | Fraunces, letter-spaced slightly tight |
| **Eyebrow** | Gold or lagoon, tracked uppercase |
| **PrimaryButton** | Lagoon, 48px, no gradient |
| **BrowserFrame** | Dark chrome optional; feels like an object on a desk |
| **Metric** | Big Fraunces number, quiet label |
| **RegistrationOption** | Hospitality list — name, time, place, Register |

## Motion

1. Hero copy fades up (staggered, slow)
2. Product frame eases in with soft lift
3. Button hover: 1px lift + lagoon deepen — nothing else

## Do's and Don'ts

**Do:** Leave empty space. Use one photograph with meaning. Speak like a host.

**Don't:** Decorate emptiness with gradients. Stack CTAs. Look like a dashboard template generator.
