---
title: Form Experience System
status: draft
created: 2026-09-18
updated: 2026-09-18
extends:
  - _bmad-output/planning-artifacts/prds/prd-registration-experience-studio-2026-08-12/prd.md
  - _bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md
---

# PRD — Form Experience System (Epic 35)

## Problem

Operators can customize fields and legacy **presets** (Classic, Card, Immersive, Compact), but registration still reads as a generic form product. Modern competitors expose composable **layout**, **style**, and **flow**. Cohestra must match that polish while surfacing **Activity**, **Community**, **capacity**, and **registration state** from real domain data.

## Goals

- **FR-FES-1:** Introduce a **Form Experience** configuration (Layout, Style, Flow, Hero display) stored with activity registration theme, backward compatible with legacy `preset`.
- **FR-FES-2:** One canonical public renderer (`PublicRegistrationOpen`) composes layouts/styles/flows — no duplicate submission stacks.
- **FR-FES-3:** Initial layouts: **Modern Centered**, **Split Event**, **Event Poster**, optional **Conversational** flow (Pro).
- **FR-FES-4:** Activity-aware signals on public forms (registration count, spots remaining, closed/full/pause, community host) from existing Activity/public APIs — no parallel capacity model.
- **FR-FES-5:** Form Studio **Form / Design / Preview** preserved; Preview uses canonical renderer with draft state; no duplicate Preview banners in Design.
- **FR-FES-6:** Responsive desktop, tablet, mobile browsers; no horizontal overflow; Split collapses on mobile.
- **FR-FES-7:** Plan entitlements centralized (server + UI): Basic full quality on centered; Core+ split/poster/richer hero; Pro conversational + advanced styling. **Basic must not show tenant website URL option** (existing FR; server enforced).
- **FR-FES-8:** Accessibility: labels, keyboard, focus, errors, reduced motion, touch targets.

## Experience dimensions

| Dimension | Initial values | Notes |
|-----------|----------------|-------|
| Layout | centered, split, poster | Maps from legacy preset when unset |
| Style | modern, minimal, editorial, bold, soft | Default modern |
| Flow | single-page, sections, step-by-step, conversational | Conversational Pro-gated |
| Hero display | cover, contain, full-bleed, split, background, hidden | Valid per layout |

## Defaults (compatibility)

When `experience` is omitted: derive from legacy `preset` (classic/card/immersive/compact → centered + modern + single-page; immersive → hero full-bleed).

## Success metrics

- ↑ mobile registration completion on themed activities
- ↓ operator time to publish polished registration for new activities
- Qualitative: operators describe pages as “event-grade” not “admin form”

## Epic mapping

Epic **35** — stories 35.1–35.7 (see `epics-form-experience-system-35.md`).
