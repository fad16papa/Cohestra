# Brainstorm — Landing pricing & visual depth

**Topic:** Pricing tier alignment audit + landing page UI uplift (3D objects, cookies)

## Ideas captured

1. **Card grid contract** — equal-height cards, pinned CTAs, reserved price/trial block height
2. **CSS 3D over WebGL** — perspective orbs + floating cookie discs; no three.js bundle cost
3. **Cookie dual meaning** — HTTP consent banner + playful atelier “event snack” motif
4. **Pricing truth table** — single source `pricing-plans.ts` ↔ `TenantPlanLimits.cs`
5. **Feature bullets** — split Basic limits into scannable lines matching compare table
6. **Ambient layers** — hero + pricing sections get stronger scene; shell gets subtle global wash
7. **Reduced motion** — inherit existing `prefers-reduced-motion` kill switch
8. **Future:** interactive 3D product stack on hero (WebGL) if metrics justify weight
9. **Future:** illustrated empty states with cookie mascot for empty CRM
10. **Anti-pattern rejected:** full-page parallax — hurts readability and LCP

## Decision

Ship CSS ambient + alignment fixes in one PR; defer WebGL.
