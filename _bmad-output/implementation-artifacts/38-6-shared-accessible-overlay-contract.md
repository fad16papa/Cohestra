---
id: 38.6
key: 38-6-shared-accessible-overlay-contract
title: Shared accessible overlay contract
status: in-progress
epic: 38
created: 2026-09-30
baseline_commit: 955edce3c24697a322088605ef7bcf5e7df95872
readiness: ready
---

# Story 38.6: Shared accessible overlay contract

Status: in-progress

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

## Story

As a keyboard or screen-reader operator,
I want dialogs, sheets, alert dialogs, and the command palette to share one accessible overlay contract,
so that Esc, focus trap, restore, and reduced-motion work the same way on every authenticated overlay.

## Scope delta vs the execution prompt

Canonical backlog (`cohestra-product-experience-2-backlog.md` §38.6) and DESIGN.md **D8** are authoritative.

| Prompt assumption | Canonical contract |
| --- | --- |
| Every popover, dropdown, and nested overlay in the product | **Modals** must use `ui/dialog` \| `alert-dialog` \| `sheet`. Popovers stay non-modal (Esc/focus-restore via Base UI popover). No dropdown-menu primitive exists; do not invent one. |
| Redesign More-sheet IA | **No.** 39.2 owns tab order/IA. 38.6 only makes the existing More sheet satisfy D8 (it already uses `Sheet`). |
| Cookie banner as a blocking overlay | **43.5 / D20.** This story records the exception; do not migrate cookie placement. |
| Calendar popout / FAB | **39.2 / 43.5.** Out of scope unless it is a custom `role="dialog"` that we only inventory. |
| Form Studio listbox | **42.3.** Do not change listbox semantics. Custom field-palette `role="dialog"` is inventoried; migrate only if it is a true modal overlay using the same custom pattern (prefer `ui/dialog` if it is already a dialog). |
| Website onboarding tour | Not in 38.6 backlog. Inventory + exception if it remains a custom dialog. |

**In scope (canonical + 38.5 deferral):**

1. Harden shared primitives: local motion **160ms**, `data-slot` PRM CSS, `aria-modal`, labelled title, trap, restore, alert pointer-dismissal.
2. Migrate **command palette**, **campaign email preview**, **insert QR**.
3. Verify **More sheet**, **archive/delete/publish/messenger/send** alert-dialogs, and **standard form dialogs** already on primitives.
4. Keyboard + axe + visual evidence at 1440/1024/390/430; light/dark/forced-colors.

## Acceptance Criteria

1. Every **modal** overlay in authenticated product uses `components/ui/dialog`, `alert-dialog`, or `sheet` (D8). Custom `role="dialog"` on campaign preview, insert QR, and command palette is gone.
2. Every open modal has the correct role (`dialog` or `alertdialog`) and an accessible name (title or `aria-label`).
3. Opening moves focus to an intentional first control (dialog title/close, palette search input, sheet title/close, first field).
4. Modal focus is trapped. Background cannot receive Tab while a modal is open (`modal=true` default).
5. Escape closes only the topmost dismissible overlay. Remaining layers that stay open are intentional (nested).
6. Nested overlays unwind one layer at a time (preview vs send confirm; More vs inner dialog if both exist).
7. Closing restores focus to the invoking control when it still exists; otherwise a documented fallback (top-bar Search, More button, or `#main-content`).
8. Destructive confirmations use `alert-dialog` (`role="alertdialog"`, `disablePointerDismissal`) so outside-click cannot confirm/dismiss by accident. Esc still cancels unless a named exception is recorded.
9. Opening/closing does not duplicate overlay nodes, duplicate IDs, or leave multiple active traps after close.
10. Route change while an overlay is open does not leave body scroll lock, inert, or hidden focus. Command palette navigation closes the palette then routes.
11. More sheet works at 390×844 and 430×932; desktop dialogs at 1024×768 and 1440×900.
12. Overlay duration is **160ms local**; press remains **100ms**. No JS `prefers-reduced-motion` gate. CSS already zeros `[data-slot]` overlays.
13. Story 38.5 contract holds while overlays are closed: one `#main-content` `<main>`, one route `h1`, skip link first. While a modal is open, the a11y tree may hide background (expected); after close, skip/main/h1 return.
14. Light, dark, and forced-colors: overlay surface, border, focus ring, and close control remain perceivable. State is not color-only.
15. Touch close/primary actions on sheets meet 44px where they are icon-only chrome.
16. Named exceptions (cookie banner, calendar popout, website tour) are listed in evidence with owners **43.5 / 39.2 / later**. Code review records them.
17. Protected: Epic 35–37 (no duration token change except overlay 200→160 on slotted primitives), 38.1–38.5, no nav IA, no Settings URLs, no backend, no Form Studio listbox, no FAB name, no compose restyle, no campaign send in QA.

## Architecture (Grok-owned)

| Surface | Before | After |
| --- | --- | --- |
| `ui/dialog` | Base UI Dialog; enter `duration-200` + scale | Keep centering translate; **160ms**; Title required by callers; `initialFocus`/`finalFocus` passthrough |
| `ui/alert-dialog` | Implemented on **Dialog**, not AlertDialog — role `dialog`, outside-click dismisses | Switch to `@base-ui/react/alert-dialog` so role is `alertdialog` and pointer dismissal is disabled |
| `ui/sheet` | Base UI Dialog drawer; 200ms; close `icon-sm` | **160ms**; close control ≥44px + named “Close” |
| Command palette | Custom `role="dialog"` + backdrop button; window Esc; no trap | `Dialog` labelled “Command palette”; focus search input; Esc via primitive; keep ↑↓/Enter |
| Email preview | Custom modal, no Esc/trap | `Dialog` titled “Email preview” |
| Insert QR | Custom modal, no Esc/trap | `Dialog` titled “Insert activity QR code” |
| More sheet | Already `Sheet` | Keep; named title; restore to More button; 44px close |
| Existing `AlertDialog` usages | Wrong underlying primitive | Inherit real alert-dialog behavior with no copy rewrite |
| Cookie / calendar / tour | Custom dialogs | **Exception** per DESIGN.md §19.2 — owners 43.5 / 39.2 |

Shell exclusivity: command palette and More sheet are sibling Dialog roots. Opening one closes the other so Escape cannot dismiss two `isTopmost` stacks at once.

Background inert: while any shared modal is open, non-portal `document.body` children get the HTML `inert` attribute so Tab wraps inside the overlay island (Base UI `aria-hidden` alone left Chromium focusing `body` on sparse dialogs).

Do not add a second overlay engine. Do not JS-gate motion.

## Tasks / Subtasks

- [x] Primitive contract (AC 2–5, 8, 12, 15)
  - [x] Dialog 160ms + focus props
  - [x] AlertDialog → `@base-ui/react/alert-dialog`
  - [x] Sheet 160ms + 44px named close
- [x] Migrate command palette (AC 1, 3–7, 10)
- [x] Migrate email preview + insert QR (AC 1, 3–7)
- [x] Verify More sheet + existing alert/form dialogs (AC 8, 11, 13)
- [x] Tests + evidence (AC 9–17)
  - [x] Vitest on primitives / source contract
  - [x] Playwright `overlays-38-6.spec.ts`
  - [x] Evidence `_bmad-output/planning-artifacts/evidence/px2-38-6/`
  - [x] 38.5 landmark + 38.4 token regression
- [x] PO pre-merge MAJOR — inert ownership (track/restore/never strip foreign; subtree observer; tests)

### Review Findings

Independent `bmad-code-review` of HEAD `7bb9c80a` (Blind Hunter, Edge Case Hunter, Acceptance Auditor). No unresolved BLOCKER/MAJOR.

- [x] [Review][Defer] Owned `inert` stripped without a childList mutation is re-asserted only on the next sync [`web/lib/use-modal-inert.ts`] — deferred, observer is childList by contract
- [x] [Review][Defer] Empty-portal reclassify is async (MutationObserver microtask) [`web/lib/use-modal-inert.ts`] — deferred, inherent; product portals use `data-base-ui-portal` from the start

## Dev Notes

### Must preserve

- Command palette search, entity fetch (2+ chars), nav items, ⌘K toggle
- Campaign preview HTML rendering and QR insert API
- Compose send `AlertDialog` copy (do not restyle compose)
- Epic 37 pathname-only route enter; 38.5 skip/main/h1
- Cookie banner non-modal placement (43.5)

### Testing

- Playwright `E2E_LIVE_STACK=1` `PUBLIC_BASE_URL=http://localhost:3000` `E2E_API_BASE_URL=http://localhost:8080`
- Campaigns compose is Pro — use seeded Pro operator
- Do not send campaigns in QA
- Forced-colors via `forced-colors: active`

### Previous story intelligence (38.5)

- Skip is `sr-only` until focus; do not cover it with a cookie sheet (already out of scope)
- ThemePreferenceSync overwrites localStorage — Appearance radio for light/dark evidence
- Mobile More currently hides a11y tree of main (expected modal)
- Clients `role=row` remains 40.3 / 43.5

## Dev Agent Record

### Agent Model Used

Grok 4.6 (architecture, implementation, tests, review). Composer 2.5 not used unless a later bounded visual is declared.

### Debug Log References

Independent BMAD review of `6cc2bb76` (Blind Hunter, Edge Case Hunter, Acceptance Auditor):

- MAJOR: ⌘K stacked on page-level dialogs so Escape dismissed both — **patched** (`hasBlockingPageModal`).
- MAJOR: AC 14 dark/forced-colors screenshots missed the overlay — **patched** (clip + opacity wait + forced-colors computed styles + overlay `color-contrast` axe).
- MINOR/NIT remaining: palette restore fallback when invoker unmounts; inert released at `open=false` during 160ms exit; More `finalFocus` if viewport crosses to desktop; browser Back does not dismiss sheet. Documented, not blocking this story.

PO pre-merge (HEAD `93092c51`) MAJOR: `use-modal-inert` stripped every body child's `inert` on final close, including foreign/pre-existing attributes. **Patched** — owned-element map + original-value restore + subtree `childList` observer.

### Completion Notes List

- Shared primitives: 160ms motion, AlertDialog real primitive, sheet 44px named Close, `useModalInert` + `trapOverlayTab`.
- Migrated command palette, email preview, insert QR.
- Shell exclusivity: palette XOR More sheet.
- Live Playwright 38.6 passed; 38.5 landmarks and 38.4 tokens/a11y regression passed; `next build` passed.
- Composer 2.5 was not used.

- 2026-09-30: Implemented overlay primitives, migrations, shell exclusivity, Vitest/Playwright specs.

- `web/components/ui/dialog.tsx`
- `web/components/ui/alert-dialog.tsx`
- `web/components/ui/sheet.tsx`
- `web/components/layouts/admin-command-palette.tsx`
- `web/components/layouts/admin-shell-context.tsx`
- `web/components/layouts/admin-mobile-tab-bar.tsx`
- `web/components/layouts/admin-nav-sheet.tsx`
- `web/components/campaigns/email-preview-dialog.tsx`
- `web/components/campaigns/insert-qr-modal.tsx`
- `web/styles/brand-tokens.css`
- `web/lib/use-modal-inert.ts`
- `web/lib/use-modal-inert.test.ts`
- `web/lib/overlay-tab-trap.ts`
- `web/lib/overlay-tab-trap.test.ts`
- `web/lib/overlays-38-6.test.ts`
- `web/lib/motion-polish.test.ts`
- `web/e2e/overlays-38-6.spec.ts`
- `_bmad-output/planning-artifacts/evidence/px2-38-6/`

### Change Log

- 2026-09-30: Created Story 38.6 after 38.5 close `955edce3`. Canonical D8 + backlog migrate palette/preview/QR.
- 2026-09-30: Implemented overlay primitives, migrations, shell exclusivity, Vitest/Playwright specs.
- 2026-09-30: PO pre-merge MAJOR — inert ownership. Track utility-owned `inert` only; restore original state; never strip foreign `inert`; observe subtree child additions.
