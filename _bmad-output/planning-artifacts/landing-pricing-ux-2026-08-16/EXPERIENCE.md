# UX — Landing pricing alignment & ambient refresh

## Foundation

- **Surface:** Marketing site (`/`, `/pricing`) — public, unauthenticated
- **UI system:** Atelier tokens (Fraunces, lagoon, gold, paper/ink)
- **Design reference:** `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/DESIGN.md`

## Pricing section — alignment audit (2026-08-16)

| Check | Status |
|-------|--------|
| Basic $0 / limits vs `TenantPlanLimits` | ✅ Aligned |
| Core $14.99/mo, $152.92/yr (14.99% off) | ✅ Aligned (list locked 2026-08-23) |
| Pro $29.99/mo, $305.93/yr (14.99% off) | ✅ Aligned (list locked 2026-08-23) |
| Compare table vs plan cards | ✅ Same source `PRICING_COMPARE_ROWS` |
| CTA vertical alignment across 4 cards | ⚠️ Fixed — grid rows + min-height price block + pinned CTA |
| Enterprise shorter feature list | ⚠️ Fixed — `1fr` feature row + min card height |
| Basic feature scannability | ⚠️ Fixed — split combined limit line |

## Component patterns

### Pricing card grid
- `grid-rows-[auto_auto_1fr_auto]` per card
- `min-h-[7.25rem]` price+trial zone (placeholder line when no trial)
- CTA in final row, `self-end`

### Ambient scene
- Global wash in `MarketingShell`
- Hero + pricing get variant-specific cookie/orb density
- Respects reduced motion (existing CSS)

### Cookie consent
- Fixed bottom-right dialog; Accept + Privacy link
- `localStorage` key `cohestra-marketing-cookie-consent`

## Do's and don'ts

- **Do** keep pricing numbers in `pricing-plans.ts` only
- **Do** test xl breakpoint (4-column) and lg (2-column)
- **Don't** block hero LCP with heavy assets — ambient is CSS-only
