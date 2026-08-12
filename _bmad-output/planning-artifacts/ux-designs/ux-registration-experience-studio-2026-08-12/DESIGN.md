---
name: Registration Experience Studio
description: Community-aware registration theming — presets, brand kits, Midnight Atelier extension
status: final
created: 2026-08-12
updated: 2026-08-12
sources:
  - {planning_artifacts}/prds/prd-registration-experience-studio-2026-08-12/prd.md
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
theme:
  modes: [light, dark, system]
  default: light
  implementation: class-based (.dark on html) via next-themes
colors:
  ink: '#070D12'
  paper: '#FAFBFC'
  paper-warm: '#F3F5F7'
  line: '#E6E9ED'
  lagoon: '#0B6B63'
  lagoon-fg: '#F3FFFC'
  gold-soft: '#F4EEE3'
  warn: '#9A6700'
  danger: '#9B1C1C'
  registration-tint: '#F3F5F7'
  card-elevated: '#FFFFFF'
typography:
  public-hero:
    fontFamily: 'Fraunces'
    fontSize: 36px
    fontWeight: '500'
    lineHeight: '1.12'
  body:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  section:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 13px
    fontWeight: '600'
    letterSpacing: 0.12em
rounded:
  card: 16px
  hero: 12px
  button: 10px
spacing:
  preset-gap: 24px
  hero-compact: 120px
  hero-immersive-min: 40vh
components:
  registration-preset-classic: Hero stack full width; form on {colors.paper}; accent via CSS --primary
  registration-preset-card: Form on {colors.card-elevated} with shadow-md over {colors.registration-tint}
  registration-preset-immersive: Hero min {spacing.hero-immersive-min}; gradient fade ink 0% → transparent
  registration-preset-compact: Hero max {spacing.hero-compact}; form immediately below fold
  community-logo: max-height 48px; object-contain; left-aligned in hero header row
  contrast-warning: {colors.warn} text; icon + "Low contrast on buttons" helper
---

# DESIGN — Registration Experience Studio

Extends Midnight Atelier for **public registration** and **admin Design surfaces**. Platform tokens win for typography and spacing; presets only rearrange layout and elevation.

## Brand & Style

Registration pages feel **program-specific** (community logo + accent + hero) while retaining Cohestra craft: editorial Fraunces titles, lagoon action color, warm paper backgrounds. No custom fonts in v1.

## Colors

- Resolved accent injects `--primary` on the registration root (existing pattern).
- **Card** preset uses `{colors.registration-tint}` page background and `{colors.card-elevated}` form surface.
- **Immersive** preset overlays hero with gradient from `{colors.ink}` at 40% opacity to transparent.
- Contrast warning uses `{colors.warn}` — never block save silently.

## Typography

Hero title: `{typography.public-hero}`. Form labels: `{typography.section}` uppercase tracking. Body copy and intro markdown: `{typography.body}`.

## Layout & Spacing

Preset gap between hero and form: `{spacing.preset-gap}`. Compact hero cap: `{spacing.hero-compact}`. Immersive minimum hero: `{spacing.hero-immersive-min}`.

## Components

### Community Brand Kit (admin)

Mirror activity branding panel: upload + URL paste for default hero, hex + color picker for accent, logo upload (Core+). Logo preview max 48px height.

### Design tab preset tiles

Four selectable tiles with miniature wire thumbnails; selected state: lagoon ring + `{colors.gold-soft}` fill. Basic plan: logo field disabled with upgrade link.

## Do's and Don'ts

**Do:** Reuse `ResponsiveBannerImage`, campaign-asset URLs, and existing form controls.  
**Don't:** Introduce arbitrary CSS, custom font pickers, or layout that breaks mobile-first 44px touch targets.  
**Don't:** Use registration accent for admin chrome — admin stays on platform lagoon/ink tokens.
