# Epic 35: Modern Form Experience System

**Status:** in-progress  
**Source PRD:** `_bmad-output/planning-artifacts/prds/prd-form-experience-system-2026-09-18/prd.md`  
**Architecture:** `_bmad-output/planning-artifacts/architecture-form-experience-system-2026-09-18.md`  
**UX:** `_bmad-output/planning-artifacts/ux-designs/ux-form-experience-system-2026-09-18/EXPERIENCE.md`

## User outcome

Community operators create premium, Activity-aware registration experiences using composable **Layout**, **Style**, **Flow**, and **Brand** dimensions while Cohestra keeps one registration domain, one canonical renderer (`PublicRegistrationOpen`), Preview parity, responsive rendering, accessibility, and plan entitlements (including Basic tenant-website URL absence).

## Stories

| ID | Title | Purpose |
|----|-------|---------|
| 35.1 | Form Experience foundation | Config model, schema, defaults, backward compatibility |
| 35.2 | Modern Centered polish | Default experience UX + spacing/typography/footer |
| 35.3 | Split Event layout | Desktop split + mobile stack |
| 35.4 | Event Poster / RSVP | Poster header + capacity context |
| 35.5 | Conversational flow | Optional Pro flow mode |
| 35.6 | Form Studio Experience controls | Design tab IA (Experience / Brand / Controls) |
| 35.7 | Entitlements + Activity context + regression | Plan gates, domain signals, full test matrix |

## Epic-level verification debt (before epic close)

**LIVE RESPONSIVE MATRIX:** Before Epic 35 may be closed, verify **Modern Centered**, **Split Event**, **Event Poster**, and **Conversational** (if shipped) at **1440 / 1024 / 768 / 430 / 390 / 360** on live dev/UAT using repository browser/e2e infrastructure and real public/preview routes. Stories 35.2–35.4 used contract/CSS evidence where live stack was unavailable.

## Non-goals (Epic scope boundary)

- Website Builder revamp, Cinema, Epic 19 infra, Paddle changes
- Arbitrary external URL fields for tenant website (reuse canonical tenant URL)
