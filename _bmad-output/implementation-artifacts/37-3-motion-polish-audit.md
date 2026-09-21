---
status: in-progress
story_key: 37-3-motion-polish-audit
epic: 37
---

# Story 37.3: Motion polish and interaction consistency audit

Status: in-progress

## Story

As an operator using authenticated Cohestra,  
I want one coherent motion language across routes, chrome, overlays, and builders,  
so navigation feels continuous and premium without becoming slower or destroying studio drafts.

## Acceptance Criteria

See product brief ACs 1–20. Binding constraints: preserve 37.1/37.2 primitives; no new animation libraries; no new architecture unless a verified defect cannot be fixed locally.

## Verified findings (this story)

| Sev | Defect | Fix |
|-----|--------|-----|
| HIGH | Route enter 350ms exceeds context budget 180–300ms | `.animate-page-enter` → 280ms |
| HIGH | Dashboard metric tiles + client profile stack 700ms `animate-fade-in-up` on top of route enter | Remove nested cinematic enter; keep press hover |
| HIGH | `Button` / several nav+card links use `transition-all` (layout jump risk) | Press-level color/transform/opacity only, 100ms, PRM |
| MEDIUM | Overlay enter/exit same 200ms | Exit `duration-150` |
| MEDIUM | Activity tabs / dashboard switcher / mobile nav missing `motion-safe` | Align with Form Studio tabs |
| MEDIUM | Skeletons `animate-pulse` ignore reduced motion | `motion-safe:animate-pulse` |
| MEDIUM | Community pulse bar `duration-700` | `duration-300` + PRM |
| MEDIUM | Remaining operator chrome used ungated `transition-colors` (settings, filters, lists, billing, Form Design) | Map to `motion-press` / `motion-local` so PRM disables leftover hover animation |
| LOW | Accordion profile expand 300ms slightly slow for local | 200ms |
| LOW | Follow-up highlight card `duration-300` | `motion-local` 160ms |
| LOW | Dashboard `<tr>` hover used `transition-colors`; do not use `motion-press` (transform on table-row) | `motion-local` |

## Non-goals

- New primitives replacing AdminRouteTransition / BuilderSurface
- Marketing cinema unification
- Fake loading delays

## Dev Agent Record

### Agent Model Used

Grok 4.6 (primary). Composer 2.5 not used.

### File List

## Change Log

- 2026-09-21: Story opened — product-wide motion polish.
