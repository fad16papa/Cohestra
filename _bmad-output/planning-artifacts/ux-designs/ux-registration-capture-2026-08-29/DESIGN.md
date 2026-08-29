---
name: Registration Capture
description: Form-tab slash toolbox and public Capture states — token delta only on Midnight Atelier / Studio
status: final
created: 2026-08-29
updated: 2026-08-29
sources:
  - {planning_artifacts}/prds/prd-registration-capture-2026-08-29/prd.md
  - {planning_artifacts}/prds/prd-registration-capture-2026-08-29/form-component-toolbox.md
  - {planning_artifacts}/epics-registration-capture.md
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  - {planning_artifacts}/ux-designs/ux-registration-experience-studio-2026-08-12/DESIGN.md
theme:
  modes: [light, dark, system]
  default: system
  implementation: class-based (.dark on html) via next-themes
colors:
  # Inherited. Do not add Capture-specific brand colors.
  ink: '#070D12'
  paper: '#FAFBFC'
  lagoon: '#0B6B63'
  warn: '#9A6700'
  danger: '#9B1C1C'
  muted-chip: '#E6E9ED'
typography:
  # Inherit Studio / platform. No custom fonts (NFR-12).
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
  chip: 8px
  palette: 12px
  tap: 10px
spacing:
  field-gap: 20px
  palette-row: 8px
  tap-min: 44px
components:
  slash-palette: Dialog; grouped toolbox rows; selected row {colors.lagoon} tint; Esc closes
  hidden-chip: {colors.muted-chip} pill; text "Hidden · filled from link"; admin preview only
  reason-chip: Full / Closed / Paused / Ended; text + color, never color-only
  piping-cheatsheet: Popover of allowed tokens; Hidden ids omitted
  slot-meter: "n / cap" caption next to save; warn at cap
  plan-locked-row: Muted row + upgrade hint; not an empty hole
  choice-target: min {spacing.tap-min}; large tap, not a tiny radio
  yes-no-pair: Two equal buttons, min {spacing.tap-min}
  step-bucket-chip: Identity / Details / Consent caption on list row
---

# DESIGN — Registration Capture

Extends Midnight Atelier and Registration Experience Studio. **No new brand.** Capture adds Form-tab and public-state components only. Platform tokens win for type and space. Registration accent stays on the public page (Studio); admin chrome stays lagoon/ink.

## Brand & Style

Craft, not a form-builder skin. The Form tab still looks like Activity admin. The public page still looks like the club (Studio presets). Slash-add is a toolbox dialog, not a canvas or a document.

## Colors

All tokens inherited. Palette selection uses `{colors.lagoon}` tint. `{colors.warn}` for contrast/plan-lock hints. `{colors.danger}` only for submit/validation errors already in the platform. Do not introduce a “Tally purple” or Capture accent.

## Typography

`{typography.body}` on public Fields and Closed message. `{typography.section}` on palette group labels and reason chips. No custom fonts, no per-Activity type (UX-DR26).

## Layout & Spacing

Public fields: full width, `{spacing.field-gap}` between Fields (UX-DR9). Public column max 480px at `md+`. Palette: single column of rows, `{spacing.palette-row}` between items. No two-column Form canvas.

## Elevation & Depth

Palette is a modal dialog (platform dialog elevation). Hidden chip and reason chip are flat pills. Do not lift Fields onto a designer board.

## Shapes

`{rounded.palette}` on the dialog. `{rounded.chip}` on chips. `{rounded.tap}` on `choice` / `yes_no` targets.

## Components

- **slash-palette** — Command-style list grouped Always / Core+ (disabled on Basic). Keyboard highlight. Type `<select>` remains visible as fallback.
- **hidden-chip** — Admin preview only. Never on the Participant Form.
- **reason-chip** — Unavailable screen; sits above Closed message.
- **piping-cheatsheet** — Success-copy editor only.
- **slot-meter** — Template picker; Basic 1 / Core 5 / Pro 25.
- **plan-locked-row** — Scale, emergency, extra template slot, steps toggle.
- **choice-target / yes-no-pair** — Public Wave 1 inputs.
- **step-bucket-chip** — Form list editor when Pro steps toggle is on.

Visual specs for ActivityHero, RegistrationForm chrome, and Design presets remain in Studio DESIGN.md.

## Do's and Don'ts

**Do:** Reuse Studio public tokens; keep admin on platform chrome; 44px tap minimum on public Capture controls.

**Don't:** Custom CSS; canvas; registration accent on admin; image-only Closed message; offer Hidden tokens in Participant piping.
