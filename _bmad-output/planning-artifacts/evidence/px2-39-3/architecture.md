# Story 39.3 entitlement / accessibility architecture

Grok-owned. Composer unused. Recorded before application-code changes.

## Authority

Authenticated `GET /api/v1/admin/shell` (`plan`, `isTenantAdmin`, `isBillingOwner`) plus existing destination APIs. UI maps those fields; it does not unlock writes and does not read public env for entitlements.

## Single resolver

`web/lib/admin-nav-entitlements.ts`

```
resolveNavEntitlement(key, { plan, isTenantAdmin, isBillingOwner, shellReady })
→ { state: pending | unlocked | locked | hidden, requiredPlan, destination }
```

| `destination` | Meaning |
| --- | --- |
| `pending` | shell not ready — no lock chrome |
| `content` | entitled editor/page |
| `upgrade` | priced UpgradePanel (admin can checkout) |
| `ask-admin` | UpgradePanel member branch — no checkout button |
| `denied` | role denial / redirect |
| `hidden` | omit from chrome |

Call sites (must not re-derive plan thresholds):

- `admin-nav-links.tsx` (expanded + compact rail + More destinations)
- `admin-nav-footer.tsx`
- `settings-workspace-nav.tsx`, `settings-left-rail.tsx`, `settings-right-rail.tsx`
- `settings-page-content.tsx` (custom-domain visibility)

Mapping (from readiness, not invented):

| Key | Hidden when | Locked when | Required plan |
| --- | --- | --- | --- |
| website | never (discoverable) | shellReady && !Core+ | Core |
| campaigns | never (discoverable) | shellReady && !Pro+ | Pro |
| analytics | never | never at nav | — (in-page advanced) |
| team | !admin (incl. pending) | admin && Basic | Core |
| billing | !admin or (paid && !billingOwner); pending → hide | never (not a paid module lock) | — |
| custom-domain | plan !== Enterprise or !admin | never | — |
| settings, relationship rooms, ai | never | never | — |

`isCoreOrAbove` / `isProPlan` from `tenant-shell-api.ts` (Enterprise counts as Pro+).

## Presentation

Locked link:

- Visible label unchanged (`Website`).
- Lock glyph (`Lock`, `aria-hidden`) + plan word (`Core` / `Pro`) on expanded/More.
- Compact (768–1023, `sr-only lg:not-sr-only` labels): glyph beside icon; `title` + `aria-label` = `{label}, locked, requires {plan} plan`.
- Not color-alone: glyph + text (or tooltip/sr-only on compact).
- Forced colors: `currentColor` + outline so the glyph survives `forced-colors: active`.

Pending: render as today’s unlocked chrome (no glyph).

Hidden: do not mount the link.

## Surfaces

| Viewport | Where locks appear |
| --- | --- |
| ≥1024 expanded rail | label + glyph + plan word; footer Team lock |
| 768–1023 compact rail | glyph on Website/Campaigns icons; footer hidden (`lg:block`) — Team lock lives in More if opened, not duplicated into the dock |
| <768 More sheet | same links as 39.2 destinations + footer Team |

Do not add locks to the five mobile tabs. Do not change 39.1/39.2 order.

## Destination pages (already exist)

- Website Basic → `UpgradePanel` Core (`isTenantAdmin` forwarded)
- Campaigns non-Pro → `UpgradePanel` Pro
- Team Basic admin → `UpgradePanel` Core; member → replace `/settings` + “admins only”
- Billing member → “admins only”; paid non-owner → owner-managed copy
- Analytics advanced Basic → in-page `UpgradePanel` Core

This story does not redesign those panels. It must not convert member Team/Billing into UpgradePanel.

## Error taxonomy (preserve)

| Failure | UI |
| --- | --- |
| 403 `plan_locked` | UpgradePanel |
| 403 Forbid / role | denied / redirect |
| 400 validation | field/page error, not lock |
| 5xx / parse failure | ProductErrorState / existing error — never a lock glyph inferred from the error |

## Out of this story

39.4 headers, 39.5 error pages, server plan math, Paddle, Form Studio gates, nav IA.
