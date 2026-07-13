---
name: Activity Lead — Website Builder
description: Visual identity extensions for Site Page composer and public homepage runtime render — inherits Activity Lead shadcn brand layer.
status: final
created: 2026-07-06
updated: 2026-07-06
theme:
  modes: [light, dark, system]
  default: system
  implementation: class-based (.dark on html) via next-themes
  inheritance: "{planning_artifacts}/ux-designs/ux-cohestra-2026-06-14/DESIGN.md"
sources:
  - {planning_artifacts}/prds/prd-website-builder-2026-07-06/prd.md
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-07-06/EXPERIENCE.md
colors:
  primary: '#2D6A4F'
  accent: '#40916C'
  site-accent-scope: 'Homepage and login header only — scoped CSS variable override, not global admin'
  draft-pill: '#D97706'
  draft-pill-foreground: '#FFFFFF'
  live-pill: '#2D6A4F'
  live-pill-foreground: '#FFFFFF'
  preview-banner: '#2563EB'
  preview-banner-foreground: '#FFFFFF'
  dirty-pill: '#CA8A04'
typography:
  website-page-title:
    fontFamily: 'Inter'
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.25'
  website-section-label:
    fontFamily: 'Inter'
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.04em
    textTransform: uppercase
  public-hero:
    inherit: public-hero
rounded:
  website-preview-frame: 16px
  section-card: 12px
spacing:
  builder-split-gap: 24px
  preview-padding: 16px
components:
  WebsiteStatusPill: 'Draft | Unsaved | Live — {colors.draft-pill}, {colors.dirty-pill}, {colors.live-pill}'
  PreviewDeviceToggle: 'Segmented control — Phone | Desktop; uses shadcn ToggleGroup'
  SectionListItem: 'Draggable row with grip, section name, enabled switch'
  PublishConfirmDialog: 'shadcn AlertDialog — summarizes domain impact'
  PreviewBanner: 'Full-width bar above preview — {colors.preview-banner}'
---

# Activity Lead — Website Builder (DESIGN.md)

Inherits all tokens from Activity Lead (`ux-cohestra-2026-06-14/DESIGN.md`) unless overridden below. Typography and spacing on public homepage sections remain platform-owned (UX-DR26).

## Brand & Style

Website Builder feels like **editing a community flyer**, not configuring infrastructure. Warm surfaces (`surface-warm`, `border-warm`), same Inter display hierarchy as the existing marketing landing page. Site-level accent applies only to homepage and login header chrome — admin sidebar keeps CreativoRare Activity Lead lockup.

## Colors

- **Site accent** — Operator-chosen hex applied as scoped `--primary` on `/` and login client header only.
- **Status pills** — Draft (amber), Unsaved changes (yellow), Live (green) in builder toolbar.
- **Preview banner** — Blue bar: “Preview — not visible to the public.”

## Typography

- Page title in builder: `website-page-title`.
- Section list labels: `website-section-label` (uppercase, muted).
- Public homepage hero: inherit `public-hero` from parent DESIGN.md.

## Layout & Spacing

- Builder uses **60/40 split** on `lg+`: editor left, preview right.
- Preview frame uses `website-preview-frame` radius and subtle `border-warm` ring.
- On `< lg`, stack editor above preview; preview collapses to phone width by default.

## Components

| Component | Visual |
|-----------|--------|
| **Website builder toolbar** | Sticky top bar: title, status pill, Preview (outline), Save draft (secondary), Publish (primary) |
| **Section list** | Vertical cards with drag handle, enable toggle, chevron to expand fields |
| **Site branding block** | Logo upload dropzone + accent color input (same pattern as ActivityBrandingPanel) |
| **Upcoming activities preview** | Reuses public event card styling from `site-landing-page.tsx` |
| **Powered by footer** | Muted `text-muted-warm`, small — not editable in v1 UI |

## Do's and Don'ts

**Do:** Match ActivityBrandingPanel upload + explicit Save patterns. Use `{colors.primary}` for Publish when draft ≠ published.

**Don't:** Add theme pickers, animation controls, or font selectors. Don't apply site accent globally in admin shell.
