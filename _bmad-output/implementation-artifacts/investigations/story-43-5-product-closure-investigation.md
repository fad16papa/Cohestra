# Investigation: Story 43.5 Responsive, accessibility, visual, and consistency closure

## Hand-off Brief

1. **What happened.** Epic 43.1–43.4 closed Settings IA, Team, Billing language, and Platform inheritance. Remaining P1/P2 residuals live on CURRENT HEAD `0a160132`: marketing cookie overlay, stale bootstrap copy, public Suspended H1 “on hold”, Axe excluding all disabled controls, one leftover `role="row"` on community leads, and marketing focus-visible gaps.
2. **Where the case stands.** Most historical 43.5 leftovers (Clients table, Calendar FAB name, dashboard safe-area padding, Platform 44px, core empty/error primitives) are already satisfied. Do not reopen them.
3. **What's needed next.** Bounded closure: D20 reserved-space cookie, truthful team copy, Suspended vs OnHold public H1, narrow Axe contrast filter, community row semantics, marketing focus-visible. Then Epic 43 cross-story close. Stop. No new epic.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | 43.5 |
| Date opened | 2026-10-08 |
| Status | Concluded |
| System | Cohestra main `0a160132` |
| Evidence sources | marketing-cookie-consent.tsx, register/page.tsx, tenant-maintenance-page.tsx, e2e Axe excludes, community-detail-page.tsx, deferred-work.md |

## Delta audit (CURRENT HEAD `0a160132`)

| ID | Issue | Class | Fix? | Owner | Evidence |
| -- | ----- | ----- | ---- | ----- | -------- |
| PX2-LIVE-001 | Cookie banner covers marketing CTA; Accept + Learn more (Learn more also accepts) | STILL MISSING | Yes | 43.5 | `marketing-cookie-consent.tsx` `role="dialog"` `fixed` overlay; only Accept / Learn more |
| D20 | Reserved-space, Accept / Reject non-essential / Preferences, no dark pattern | STILL MISSING | Yes | 43.5 | Same file; storage `"accepted"` only |
| PX2-IA-006 | Register “One workspace, one operator.” | STILL MISSING | Yes | 43.5 | `web/app/register/page.tsx`; operator manual still says one operator account |
| PX2-ENT-005 | Public Suspended H1 “is on hold” | STILL MISSING | Yes | 43.5 | `tenant-maintenance-page.tsx` eyebrow “Workspace paused”, H1 “on hold”. Platform/Billing already correct (43.3/43.4) |
| PX2-A11Y-007 | Marketing atelier buttons hover-only (no focus-visible) | PARTIALLY SATISFIED | Yes (marketing only) | 43.5 | `marketingAtelierButtonClass` has hover, no focus-visible. Cinema tabs already have rings. Public `ring-ring/50` is Epic 35 frozen — OBSOLETE for this story |
| PX2-TOUCH-001 / 43.999px | Client WhatsApp 43.999px | OBSOLETE / Classification D | No | — | Subpixel; do not weaken 44px. Platform 43.4 already 44px menu |
| Mobile tab clearance | Settings/Team covered by tab bar | ALREADY SATISFIED | No | — | `dashboard-layout.tsx` `pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]` |
| Calendar FAB name | Unlabeled chrome | ALREADY SATISFIED | No | — | `activity-calendar-popout.tsx` `aria-label="Activity calendar"` |
| Clients `role="row"` | Invalid grid parent on `/clients` | ALREADY SATISFIED | No | — | 40.3 semantic `<table>`; e2e asserts 0 `[role="row"]` on `/clients` |
| Community `role="row"` | Header div still has `role="row"` without table | STILL MISSING | Yes | 43.5 | `community-detail-page.tsx:189` |
| Client chips | Truncation / labels | ALREADY SATISFIED | No | 40.3 | Intentional scoped scroll; do not reopen |
| PX2-STATE-002 | Empty/error drift | PARTIALLY SATISFIED | No product-wide restyle | — | Core rooms use ProductEmptyState/ProductErrorState. Nested community empty is a small cell — leave. Do not maximalize |
| PX2-SYS-003 | DESIGN vs shipped gutters | PARTIALLY SATISFIED | Cookie reserved space only | 43.5 | Dashboard gutters + safe area exist. Cookie overlay is the remaining systemic cover. Studios keep specialized gutters |
| Axe disabled exclude | `.exclude("[disabled]")` removes node from ALL rules | STILL MISSING | Yes | 43.5 | 11 e2e files; deferred-work.md owner 43.5 |
| Skip `scrollIntoView` | Sticky header covering focused main | ALREADY SATISFIED / unproven | No | — | `scroll-mt-16` on main; do not globally scrollIntoView |
| Optional analytics tracker | Preferences categories | ALREADY ABSENT | Do not add | — | No gtag/plausible/posthog on marketing. Reject stores essential-only. Do not invent vendors |
| Cinema `#crm` hide | Cookie must not cover Harbourline | ALREADY SATISFIED — KEEP | Preserve | 43.5 | Hide banner on `#crm`. Do not inner-scroll marketing (Cinema uses `window.scrollY`) |
| Platform 43.4 | Tokens, skip, Archive dialog, Suspended vs OnHold | ALREADY SATISFIED | No | 43.4 | Out of scope |
| Epic 35–37 | Registration shells, composition, motion | ALREADY SATISFIED | No | — | Protected; do not restyle |

## Cookie architecture (Winston)

- Storage key `cohestra-marketing-cookie-consent` stays.
- `"accepted"` remains valid (hide banner; backward compatible).
- New `"essential"` = Reject non-essential / preferences with optional off.
- Any other stored string still hides the banner (do not re-prompt).
- Missing/empty/unreadable → show banner.
- Do not add a tracker.
- Banner is **non-modal `role="region"`**, in-flow **below the marketing header** (reserved space). Not `position:fixed` overlay. Not `role="dialog"`.
- Inner marketing scroller is **forbidden** — Cinema `use-marketing-product-cinema.ts` uses `window.scrollY` / `window.scrollTo`.
- Preferences uses existing 38.6 `Dialog`.
- ResizeObserver still publishes `--marketing-cookie-banner-height` for tests and any sibling clearance; after dismiss the variable is `0px`.

## Axe architecture (Winston)

Shared filter: run Axe with disabled controls **in** the scan. Drop **only** `color-contrast` nodes whose HTML is disabled / aria-disabled / data-disabled. Keep button-name, ARIA, structure failures on those nodes. Do not `.disableRules(["color-contrast"])`.

## Stronghold

`web/components/marketing/marketing-cookie-consent.tsx` is still a fixed `role="dialog"` with Accept + Learn more (Learn more calls `accept()`).

## Recommendation

Implement the STILL MISSING / PARTIALLY SATISFIED marketing-focus rows only. Mark ALREADY SATISFIED as evidence, not work.

## Status

Concluded — High confidence.
