# Epic 36: Form Studio 2.0 — Visual Form Builder

**Status:** closed (36.1–36.7 accepted + merged; post-merge CI `35525772496` SUCCESS on `8b88114`)  
**Source PRD:** `_bmad-output/planning-artifacts/prds/prd-form-studio-2-0-2026-09-20/prd.md`  
**Architecture:** `_bmad-output/planning-artifacts/architecture-form-studio-2-0-2026-09-20/ARCHITECTURE-SPINE.md`  
**UX:** `_bmad-output/planning-artifacts/ux-designs/ux-form-studio-2-0-2026-09-20/`

## User outcome

Operators visually **build** registration forms (blocks, sections, columns, content, domain context), **design** them with bounded tokens, and **preview** desktop/tablet/mobile using the canonical public renderer — without JSON editing — while Epic 35 experiences, entitlements, validation, and submission remain intact.

## Dependency

- **Epic 35:** CLOSED (foundation — do not reopen).
- **Optional carry-forward:** branch `cursor/modern-centered-visual-quality-a139` (PR #324) merges into **Story 36.5** or rebases on Epic 36 implementation branch.

## Stories

| ID | Title | Purpose |
|----|-------|---------|
| 36.1 | Composition schema foundation | `composition[]`, v1→v2 normalize, API + web parity, BC tests |
| 36.2 | Builder shell + palette + reorder | Three-pane Build UI, DnD + keyboard, fieldRef creation |
| 36.3 | Content blocks + sections | Heading, paragraph, divider; section nesting in composition |
| 36.4 | Columns + responsive composition | 2-column rows, mobile collapse, renderer integration |
| 36.5 | Design tokens + Modern/Minimal + Modern Centered | Style visibility, theme tokens, absorb visual-quality correction |
| 36.6 | Preview viewports + operator UX polish | Desktop/tablet/mobile, debounce, empty/long form states |
| 36.7 | Domain blocks + entitlements + Epic integration | Activity/domain blocks, plan gates, full regression matrix |

## Epic-level verification (before close)

Live operator path: Create/open → add blocks → reorder → section → column → design → preview (3 viewports) → save → reload → publish → public registration.

Responsive matrix on **new composition features** at 1440 / 1024 / 768 / 430 / 390 / 360.

Epic 35 shells regression: Modern Centered, Split, Poster, Conversational.

## Non-goals

- Phase 2 logic engine, Phase 3 templates library, Phase 4 AI (tracked in PRD phases)
- Reopening Epic 35
