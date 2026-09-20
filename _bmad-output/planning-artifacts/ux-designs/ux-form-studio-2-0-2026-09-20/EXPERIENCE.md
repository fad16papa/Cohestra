---
title: Form Studio 2.0 — Experience
status: final
created: 2026-09-20
---

# EXPERIENCE.md — Form Studio 2.0

## Foundation

- **Form factor:** Web operator console (Activity → Form tab); public registrant mobile-first.
- **UI system:** Cohestra warm surfaces + shadcn primitives (existing Activity workspace).
- **Visual identity:** See `DESIGN.md` in this folder.

## Information architecture (operator)

Top-level Activity tabs unchanged (**Overview, Form, Design, …**).

**Form tab** modes:

1. **Build** — three-pane workspace (≥1024px):
   - **Left:** Block palette (grouped: Input, Content, Structure, Activity)
   - **Center:** Composition list/canvas (ordered blocks, drop targets, section nesting)
   - **Right:** Inspector for selected block
2. **Preview** — existing shell + viewport toggle (**Desktop / Tablet / Mobile**)

Design tab retains **Experience** (layout, flow, style) + **Brand** + expanded **Design tokens** (Phase 1 baseline in Story 36.5).

Do **not** add five top-level studio tabs; use Build sub-navigation (Fields | Structure) if palette grows.

## Component patterns

### Block insertion

- Palette click **or** “+ Add block” at insertion line inserts at focus index.
- New input block creates `fields[]` entry + `fieldRef` node atomically.

### Selection

- Single selection; inspector shows block type badge + settings.
- Locked when Activity published? — fields editable per current product rules; composition edits follow same save/dirty pattern.

### Reorder

- **Drag handle** on each row (pointer).
- **Keyboard:** focus row → Alt+↑ / Alt+↓ (or visible Move up/down buttons) — mandatory alternative to DnD.
- Screen reader announces position “3 of 12”.

### Sections

- Add **Section** block → inline title/description in inspector.
- Children indented in list; drag constrained within section until moved out.

### Columns

- Add **2-column row** → two drop zones; each accepts fieldRef or content blocks.
- Mobile Preview: columns stack **single column, source order left then right**.

## State patterns

| State | Behavior |
|-------|----------|
| Empty form | Palette CTA “Start with template” (optional Phase 3) or “Add first field” |
| Dirty | Activity shell unsaved indicator; Preview still updates from draft |
| Save error | Inline banner; composition preserved |
| Plan locked block | Palette item disabled + upgrade tooltip |

## Preview

| Viewport | Width |
|----------|-------|
| Desktop | 720px (centered) / 960px (split) — match `registration-public-preview-shell` |
| Tablet | 768px |
| Mobile | 390px |

Toggle persists per session. Preview uses **simulated submit** only.

## Key flows

**Priya — compose event form (climax: Preview mobile matches expectation)**  
1. Opens Form → Build.  
2. Inserts Activity Details domain block.  
3. Adds Section “About you”, drags Email below Name.  
4. Adds 2-column row for First/Last name.  
5. Preview → Mobile → verifies no overflow.  
6. Saves → publishes.

## Accessibility floor

- Builder: focus trap only in modals; list roving tabindex.
- Public: unchanged Epic 35 a11y requirements + heading order from content blocks (`h2` section titles, `h3` subheadings).

## Responsive & platform

Operator may use 1280px laptop; Build collapses to palette drawer + list + inspector stack <1024px.
