# Brainstorm intent — Registration Design tab layout independence

**Topic:** Should "Inherit community brand" resize when layout preset changes?  
**Date:** 2026-08-15  
**Mode:** Ideate for me (cloud agent)

## Problem framing

Operators reported that selecting **Immersive Hero** makes the left brand panel grow tall alongside the live preview. That reads as if brand settings are tied to layout choice — but presets only change public-page structure (hero height, form placement), not branding semantics.

## Ideas (divergent)

### Correctness & mental model
1. **Decouple panels** — preset affects preview column only; brand card stays natural height (`items-start`).
2. **Section hierarchy** — full-width preset row, then brand + preview side-by-side (already structurally separate; fix is CSS stretch).
3. **Helper copy** — "Layout changes the public page structure only; brand inherits independently."
4. **Sticky brand panel** — on long preview scroll, keep brand controls pinned (future polish).
5. **Preset thumbnail mini-previews** — each tile shows wireframe silhouette so operators don't rely on live preview height to understand preset.

### Spacing & typography
6. Increase label-to-control gap for "Layout preset" (`space-y-4`, block label).
7. Match spacing rhythm to other activity tabs (Share kit, Form).
8. Optional subsection titles: "Page layout" vs "Brand overrides" to reinforce independence.

### Preview UX
9. Cap preview viewport height with internal scroll for immersive preset (avoid pushing admin layout).
10. Desktop preview uses max-height + overflow-y-auto so admin chrome stays stable.
11. Show preset name chip above preview ("Previewing: Immersive Hero").

### Advanced (defer)
12. Split Design tab into two accordions: Layout | Brand.
13. Inline preset comparison mode (A/B swipe).
14. Brand kit deep-link from inherit section when community has no kit.

## Converged direction (P0 for this fix)

| Priority | Decision |
|----------|----------|
| **P0** | Fix grid stretch — `lg:items-start` + `self-start` on brand card |
| **P0** | Fix "Layout preset" label spacing |
| **P1** | Preview max-height + scroll for tall presets |
| **P2** | Helper copy + preset wireframe thumbnails |

## Insight

The observed "adjusting" behavior is a **CSS grid stretch artifact**, not intentional product logic. Preset and brand are orthogonal concerns per Registration Experience Studio spec (Story 25.4).
