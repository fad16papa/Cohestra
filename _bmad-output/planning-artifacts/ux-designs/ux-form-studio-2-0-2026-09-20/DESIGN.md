---
title: Form Studio 2.0 — Design tokens
status: final
created: 2026-09-20
colors:
  primary: "{brand.primary}"
  surface: "{surface-warm}"
typography:
  heading: "text-text-warm font-semibold"
  body: "text-text-muted-warm"
spacing:
  blockGap: "space-y-4 sm:space-y-5"
components:
  builderRow: "rounded-lg border border-border-warm bg-card"
---

# DESIGN.md — Form Studio 2.0

## Brand & style

Form Studio 2.0 keeps Cohestra **warm enterprise** aesthetic — calm, Activity-first, not neon SaaS builder.

## Builder chrome

- Composition rows: `{components.builderRow}` with 44px min touch target on handles.
- Palette: grouped labels (uppercase tracking, primary accent).
- Insertion line: 2px primary/40 horizontal rule on drag-over.

## Public design tokens (operator-configurable enums)

Mapped in theme `designTokens` (Architecture AD-7):

| Token group | Options (MVP) |
|-------------|----------------|
| Typography scale | compact / default / spacious |
| Field size | default / comfortable (52–56px public) |
| Field radius | sm / md / lg |
| Button width | auto / full |
| Surface emphasis | flat / soft / elevated (maps Modern/Minimal) |

## Modern vs Minimal (public)

- **Modern:** elevated form surface, richer activity band (Epic 36.5 — absorb post-epic shell work).
- **Minimal:** flat surfaces, typography-led, reduced borders.

## Do's and don'ts

- **Do** keep Preview visually identical to public (minus chrome).
- **Don't** expose hex inputs without contrast validation.
- **Don't** use draggable-only reorder without keyboard parity.
