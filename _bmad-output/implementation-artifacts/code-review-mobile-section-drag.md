# Code Review: Mobile section reorder (PR #195)

**Reviewed:** `2707b6f` / merge `0ae5213`  
**Spec:** `_bmad-output/planning-artifacts/website-builder-responsive-2026-08-15/EXPERIENCE-section-reorder-mobile.md`  
**Date:** 2026-08-15

## Verdict

**Approve with patches recommended.** Pointer-based reorder solves the mobile gap; two medium/high reliability issues should be patched before the next release if operators report flaky drags.

## Layer summary

| Layer | Result |
|-------|--------|
| Blind Hunter | 1 high, 2 medium, 2 low |
| Edge Case Hunter | 18 paths (several overlap with Blind Hunter) |
| Acceptance Auditor | Core AC met (touch reorder + mobile fallback buttons) |

---

## Triage

### patch — Fast pointerup before document listeners attach (HIGH)

**Location:** `website-section-fields.tsx:568-645`, grip `onPointerDown`  
**Source:** blind+edge  
**Detail:** Document `pointermove`/`pointerup` listeners register in `useEffect` after `setDraggedSectionId`. A quick tap can leave `pointerDragRef=true` and `draggedSectionId` set without listeners ever firing `finishPointerDrag`. A later unrelated `pointerup` may commit an accidental reorder.  
**Fix:** Attach listeners synchronously in `onPointerDown`, or handle `onPointerUp`/`onLostPointerCapture` on the grip; use `useLayoutEffect` if keeping effect-based registration.

---

### patch — `dropTargetRef` one frame behind last `pointermove` (MEDIUM)

**Location:** `website-section-fields.tsx:564-566`, `596-609`  
**Source:** blind+edge  
**Detail:** `dropTargetRef` syncs via `useEffect` after `setDropTarget`. On `pointerup`, ref may not reflect the last move → valid drop discarded.  
**Fix:** Assign `dropTargetRef.current = resolveDropTarget(...)` synchronously inside `onPointerMove`.

---

### patch — `moveSection` uses render-closure indices (MEDIUM)

**Location:** `website-section-fields.tsx:661-672`  
**Source:** blind+edge  
**Detail:** Chevron buttons compute `currentIndex` from render-time `sections` but apply via `reorderSections(current, currentIndex, toIndex)` without re-resolving from `current`. Rapid taps can move the wrong row.  
**Fix:** Recompute sorted indices inside `onDraftChange` updater (same pattern as `finishPointerDrag`).

---

### defer — `handleDrop` HTML5 path uses stale closure indices

**Location:** `website-section-fields.tsx:675-696`  
**Source:** edge  
**Detail:** Pre-existing pattern extended; desktop HTML5 path only. Lower risk if pointer path is primary on mobile.

---

### defer — No `lostpointercapture` / `releasePointerCapture`

**Location:** grip handle  
**Source:** blind+edge  
**Detail:** Rare capture loss can leave drag UI stuck until next interaction.

---

### defer — Auto-scroll editor rail during edge drag

**Location:** pointer move in scroll container  
**Source:** edge  
**Detail:** Long section lists in mobile Edit mode may need edge auto-scroll to reach off-screen targets. P2 polish.

---

### dismiss — Security surface

**Detail:** Client-only draft reorder; no new trust boundaries.

---

## Acceptance checklist

| Criterion | Status |
|-----------|--------|
| Touch reorder via grip handle | ✅ Implemented (pointer events) |
| Mobile fallback up/down buttons | ✅ `lg:hidden` |
| Desktop mouse drag | ✅ HTML5 fallback retained |
| Keyboard arrows on grip | ✅ Unchanged |

---

## Recommended patch order

1. Synchronous listener attach / grip `onPointerUp` (HIGH)
2. Sync `dropTargetRef` in `onPointerMove` (MEDIUM)
3. Fix `moveSection` updater indices (MEDIUM)
