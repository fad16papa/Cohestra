---
baseline_commit: b63b2900fc189ce1385f9a7f5b8a71c6307f8c06
---

# Story 1.5: Brand Design Token System

Status: done

## Story

As an operator and participant,
I want consistent brand colors and typography via CSS variables,
So that the product feels warm, trustworthy, and community-grounded in both light and dark modes.

## Acceptance Criteria

1. **AC-1.5.1 — Brand CSS variables (UX-DR1)**
   - **Given** `DESIGN.md` brand tokens
   - **When** the app loads
   - **Then** CSS variables in `:root` and `.dark` map primary, accent, warm surfaces, text, Lead Status, and WhatsApp colors
   - **And** no hard-coded hex values exist in JSX component files

## Tasks / Subtasks

- [x] **Task 1: Color tokens from DESIGN.md** (AC: 1.5.1)
  - [x] Map forest primary, accent, warm surfaces, text to `:root` / `.dark`
  - [x] Map Lead Status semantic colors (new, contacted, active, inactive)
  - [x] Map WhatsApp action color (same in both themes)

- [x] **Task 2: Tailwind theme registration** (AC: 1.5.1)
  - [x] Register custom tokens in `@theme inline` for utility classes
  - [x] Align shadcn semantic vars (`--primary`, `--background`, etc.) with brand palette

- [x] **Task 3: Typography tokens** (AC: 1.5.1)
  - [x] Load Inter for display typography
  - [x] Add `text-display`, `text-display-sm`, `text-section`, `text-public-hero` utilities

- [x] **Task 4: Verify** (AC: 1.5.1)
  - [x] No `#hex` in `.tsx` / `.jsx` files
  - [x] `npm run build` passes
  - [x] Home page uses semantic token classes + `BrandTokenPreview` swatch

## Dev Notes

- Token source: `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-06-14/DESIGN.md`
- Hex values live in `web/styles/brand-tokens.css` only — components use semantic Tailwind classes
- Theme switching (next-themes, no-flash) is Story 1.6 — `.dark` tokens are defined here for that story

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- `web/styles/brand-tokens.css` maps all DESIGN.md color tokens for light (`:root`) and dark (`.dark`)
- `@theme inline` exposes `surface-warm`, status-*, `whatsapp`, and typography utilities to Tailwind
- Inter font loaded in layout; Geist remains body default
- `BrandTokenPreview` demonstrates status + WhatsApp tokens without hex in JSX

### File List

- `web/styles/brand-tokens.css`
- `web/app/globals.css`
- `web/app/layout.tsx`
- `web/app/page.tsx`
- `web/components/brand/brand-token-preview.tsx`
- `web/README.md`

### Change Log

- 2026-06-18: Story 1.5 implemented — brand design token system from DESIGN.md
