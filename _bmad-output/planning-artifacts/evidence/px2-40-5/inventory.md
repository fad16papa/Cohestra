# Story 40.5 route and query inventory

Inventoried on baseline `479b1813` before choosing a continuity mechanism.

## Rooms

| Path | URL query today | Local-only today |
| --- | --- | --- |
| `/dashboard` | `view=overview\|graphs\|table` (omitted for overview). URL wins; `localStorage` only when `view` absent. | View preference when URL omits `view` |
| `/follow-up` | `category`, `page` | None for list identity |
| `/clients` | `search`, `leadStatus`, `nationality`, `followUpDue`, `mergeSuspect`, `createdWithinDays`, `registeredWithinDays`, `activityId`, `activityName`. Hook also parses `sortBy`, `sortDir`, `page` | List page keeps **sort and page in React state** |
| `/clients/{id}` | none | Registration selection |
| `/activities` | `status`, `search`, `category`, `community`, `sortBy`, `sortDirection` | **page** |
| `/activities/{id}` | `tab` read on load | Tab clicks do not write URL. Form Studio `build\|preview` is React state. Preview viewport is sessionStorage |
| `/analytics` | `preset`, `from`, `to`, `activityId`, `community`, `leadStatus`, `referralSource` | — |
| `/ai` | none (stub) | — |
| `/reports` | compatibility redirect → `/analytics` | — |
| `/intelligence`, `/needs-attention` | compatibility redirect → `/ai` | — |

## Identifiers

| Surface | Client id | Activity id | Registration id | Name only |
| --- | --- | --- | --- | --- |
| Follow-up list | yes (link) | no | no | `lastActivityName` |
| Clients list | yes (link) | filter only | no | `lastActivityName` |
| Profile registration history | — | **yes, unlinked** | yes | `activityName` |
| Profile timeline | — | no | optional | optional |
| Activity registrations | yes (link) | path | yes | — |

## Navigation leftovers

- Palette Navigate items already use canonical hrefs from `adminNavItems`.
- Dashboard quick action label is still **View reports** → `/analytics`.
- Onboarding “Log your first follow-up” points at `/clients?leadStatus=new`, not `/follow-up`.
- Profile “Open in Follow-up” is always `/follow-up` (Due now only).
- Dashboard Follow-up “View all” is `/follow-up` with no category.
- No `returnTo` / `from` navigation param exists (`from` on Analytics is a date).

## Motion / storage

- `adminRouteTransitionKey` strips query and hash.
- No `router.back()` in admin TSX.
- `sessionStorage` is not a return stack.
