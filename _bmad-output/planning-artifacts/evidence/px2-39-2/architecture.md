# Story 39.2 responsive navigation / accessibility architecture

Recorded 2026-10-02 before application-code changes. Grok-owned. Composer unused.

## Breakpoint

| Width | Chrome |
| --- | --- |
| `<768` (`md:hidden` dock) | Five-tab mobile bar + More `Sheet` |
| `≥768` (`md:flex` rail) | Unchanged 39.1 desktop IA (`w-16` 768–1023, `lg:w-60` ≥1024) |

Do not change `md` token. Playwright must assert 767 = dock, 768 = rail.

## Mobile dock

Single source: `web/lib/admin-mobile-nav.ts` (order + `isActive`). `admin-mobile-tab-bar.tsx` only renders.

| Order | Label | href / action | Selected when |
| --- | --- | --- | --- |
| 1 | Home | `/dashboard` | `pathname === "/dashboard"` only |
| 2 | Clients | `/clients` | `/clients` and descendants |
| 3 | Activities | `/activities` | existing Activities rule |
| 4 | Follow-up | `/follow-up` | `isFollowUpPath` |
| 5 | More | opens 38.6 `Sheet` | sheet open **or** Website / Analytics / AI / Campaigns / Settings (not Follow-up) |

No sixth tab. Website stays out of the dock.

## More sheet

Still `AdminNavSheet` → 38.6 `Sheet` (trap, Escape, `finalFocus` More button, inert ownership, title “Cohestra”).

Destinations (not the full desktop rail):

1. Analytics  
2. Cohestra AI  
3. Website  
4. Campaigns  
5. Footer: Settings / Team / Billing (existing role rules)

Primary-tab rooms are omitted from the sheet list so the dock stays the way home.

## Calendar FAB

Today: `fixed` above the dock (`bottom-[calc(4.75rem+…)]`). Covers list rows (PX2-LIVE-002).

39.2: hide the FAB below `md`. Keep the desktop FAB. Mount `ActivityCalendarPopout` once; More sheet exposes a Calendar control that opens it after the sheet closes. Do not rename the FAB (43.5).

## Accessibility

- Dock links: `min-h-11` (≥44px) + `aria-current="page"` when selected.
- More trigger: `min-h-11`, `aria-haspopup="dialog"`, `aria-expanded`, and `aria-current` when a More destination is current.
- Selected is color **and** the ARIA announcement — not color alone.
- Overlay contract is 38.6; do not fork a second sheet.

## Out of this story

39.3 locks, 39.4 headers, 39.5 error pages, 39.1 rail edits, public registration.
